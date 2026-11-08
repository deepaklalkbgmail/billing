import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  generateBillNumber,
  roundToRupee,
  dateRange,
} from '../utils/helpers.js';
import {
  formatReceipt,
  formatKOT,
  printToThermal,
  generateReceiptHTML,
} from '../utils/printer.js';

const router = Router();

// ==========================================
// TABLE ROUTES
// ==========================================

/**
 * GET /api/billing/tables
 * Get tables for a branch
 */
router.get('/tables', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const branchId = (req.query.branchId as string) || req.user?.branchId;

    if (!branchId) {
      res.status(400).json({
        success: false,
        error: 'branchId query parameter is required',
      });
      return;
    }

    const tables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: { number: 'asc' },
    });

    res.json({
      success: true,
      data: tables,
    });
  } catch (error: any) {
    console.error('Fetch tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
    });
  }
});

/**
 * GET /api/billing/tables/status
 * Get table status for a branch (whether it has an active bill, and bill summary)
 */
router.get('/tables/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const branchId = (req.query.branchId as string) || req.user?.branchId;

    if (!branchId) {
      res.status(400).json({
        success: false,
        error: 'branchId query parameter is required',
      });
      return;
    }

    const tables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: { number: 'asc' },
      include: {
        bills: {
          where: {
            status: { in: ['ACTIVE', 'HELD'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: { select: { id: true, fullName: true, username: true } },
            items: true,
          },
        },
      },
    });

    const statusList = tables.map((tbl) => {
      const activeBill = tbl.bills[0] || null;
      return {
        tableId: tbl.id,
        tableNumber: tbl.number,
        tableName: tbl.name,
        capacity: tbl.capacity,
        isOccupied: activeBill !== null,
        activeBill: activeBill
          ? {
              id: activeBill.id,
              billNumber: activeBill.billNumber,
              status: activeBill.status,
              orderType: activeBill.orderType,
              customerName: activeBill.customerName,
              itemCount: activeBill.items.length,
              netTotal: activeBill.netTotal,
              createdAt: activeBill.createdAt,
              cashier: activeBill.user?.fullName || activeBill.user?.username,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: statusList,
    });
  } catch (error: any) {
    console.error('Fetch table status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table statuses',
    });
  }
});

// ==========================================
// BILL ROUTES
// ==========================================

/**
 * POST /api/billing/bills
 * Create a new bill with totals, GST, discount, rounding & inventory deduction
 */
router.post('/bills', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      branchId,
      orderType = 'DINE_IN',
      tableId,
      customerName = '',
      customerPhone = '',
      customerAddress = '',
      items = [],
      gstEnabled = false,
      discountType = 'flat',
      discountValue = 0,
      parcelCharges = 0,
      notes = '',
    } = req.body;

    const targetBranchId = branchId || req.user?.branchId;
    if (!targetBranchId) {
      res.status(400).json({
        success: false,
        error: 'branchId is required',
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Bill must contain at least one item',
      });
      return;
    }

    const branch = await prisma.branch.findUnique({
      where: { id: targetBranchId },
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
      return;
    }

    const userId = req.user!.id;

    // Fetch menu item details to ensure validity and accurate rates/inventory tracking
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: {
        inventoryItem: true,
      },
    });

    const menuItemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // Generate monthly bill number: {branchCode}-{YYYYMM}-{5-digit-counter}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const billPrefix = `${branch.code}-${year}${month}-`;

    const monthlyCount = await prisma.bill.count({
      where: {
        branchId: targetBranchId,
        billNumber: { startsWith: billPrefix },
      },
    });

    let counter = monthlyCount + 1;
    let billNumber = generateBillNumber(branch.code, counter, now);

    // Ensure unique billNumber
    while (await prisma.bill.findUnique({ where: { billNumber } })) {
      counter++;
      billNumber = generateBillNumber(branch.code, counter, now);
    }

    // Calculate item totals, discounts, and GST
    let subtotal = 0;
    let totalItemDiscount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalGst = 0;

    const preparedItems: any[] = [];
    const stockDeductionPlan: Array<{
      inventoryItemId: string;
      quantity: number;
    }> = [];

    for (const item of items) {
      const dbItem = menuItemMap.get(item.menuItemId);
      if (!dbItem) {
        res.status(400).json({
          success: false,
          error: `Menu item with id ${item.menuItemId} does not exist`,
        });
        return;
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice =
        item.unitPrice !== undefined ? Math.round(Number(item.unitPrice)) : dbItem.basePrice;

      const itemRawTotal = unitPrice * qty;
      subtotal += itemRawTotal;

      // Item discount
      const itemDiscType = item.discountType || 'flat';
      let itemDiscVal = Number(item.discountValue) || 0;
      let itemDiscAmount = 0;

      if (itemDiscType === 'percent') {
        itemDiscAmount = Math.round((itemRawTotal * itemDiscVal) / 100);
      } else {
        itemDiscAmount = Math.min(itemRawTotal, Math.round(itemDiscVal));
      }

      totalItemDiscount += itemDiscAmount;
      const itemTaxable = Math.max(0, itemRawTotal - itemDiscAmount);

      // GST calculation per item if gstEnabled
      const itemGstRate = gstEnabled ? (dbItem.gstRate || 0) : 0;
      let itemGstAmount = 0;

      if (gstEnabled && itemGstRate > 0) {
        itemGstAmount = Math.round((itemTaxable * itemGstRate) / 100);
        const itemCgst = Math.floor(itemGstAmount / 2);
        const itemSgst = itemGstAmount - itemCgst;
        totalCgst += itemCgst;
        totalSgst += itemSgst;
        totalGst += itemGstAmount;
      }

      const itemFinalTotal = itemTaxable + itemGstAmount;

      preparedItems.push({
        menuItemId: dbItem.id,
        itemName: dbItem.name,
        quantity: qty,
        unitPrice: unitPrice,
        discountType: itemDiscType,
        discountValue: Math.round(itemDiscVal),
        discountAmount: itemDiscAmount,
        gstRate: itemGstRate,
        gstAmount: itemGstAmount,
        total: itemFinalTotal,
        notes: item.notes || '',
        isKotPrinted: false,
        kotNumber: 0,
      });

      // Check stock deduction
      if (dbItem.trackInventory && dbItem.inventoryItemId) {
        stockDeductionPlan.push({
          inventoryItemId: dbItem.inventoryItemId,
          quantity: qty,
        });
      }
    }

    // Bill-level discount
    const subtotalAfterItemDiscounts = subtotal - totalItemDiscount;
    let billDiscountAmount = 0;
    const bDiscountVal = Number(discountValue) || 0;

    if (discountType === 'percent') {
      billDiscountAmount = Math.round((subtotalAfterItemDiscounts * bDiscountVal) / 100);
    } else {
      billDiscountAmount = Math.min(subtotalAfterItemDiscounts, Math.round(bDiscountVal));
    }

    const calculatedParcelCharges = Math.max(0, Math.round(Number(parcelCharges) || 0));

    // Grand total before rounding
    const grandTotal =
      subtotalAfterItemDiscounts - billDiscountAmount + totalGst + calculatedParcelCharges;

    // Round netTotal to nearest ₹1 (100 paise)
    const { rounded: netTotal, roundOff } = roundToRupee(grandTotal);

    // Use a transaction for Bill creation & stock updates
    const createdBill = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          billNumber,
          branchId: targetBranchId,
          userId,
          tableId: tableId || null,
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          subtotal,
          discountType,
          discountValue: Math.round(bDiscountVal),
          discountAmount: totalItemDiscount + billDiscountAmount,
          parcelCharges: calculatedParcelCharges,
          gstEnabled: Boolean(gstEnabled),
          isGstBill: Boolean(gstEnabled && totalGst > 0),
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          totalGst,
          grandTotal,
          roundOff,
          netTotal,
          status: 'ACTIVE',
          notes: notes.trim(),
          items: {
            create: preparedItems,
          },
        },
        include: {
          items: true,
          table: true,
          branch: true,
          user: {
            select: { id: true, username: true, fullName: true },
          },
        },
      });

      // Deduct inventory items
      for (const deduction of stockDeductionPlan) {
        const invItem = await tx.inventoryItem.findUnique({
          where: { id: deduction.inventoryItemId },
        });

        if (invItem) {
          const newStock = invItem.currentStock - deduction.quantity;
          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { currentStock: newStock },
          });

          await tx.stockLog.create({
            data: {
              inventoryItemId: invItem.id,
              type: 'SALE_DEDUCT',
              quantity: -deduction.quantity,
              balanceAfter: newStock,
              reference: `Bill ${bill.billNumber}`,
            },
          });
        }
      }

      // Record Audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_BILL',
          entity: 'Bill',
          entityId: bill.id,
          details: JSON.stringify({
            billNumber: bill.billNumber,
            netTotal: bill.netTotal,
            orderType: bill.orderType,
          }),
        },
      });

      return bill;
    });

    res.status(201).json({
      success: true,
      data: createdBill,
    });
  } catch (error: any) {
    console.error('Create bill error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create bill',
    });
  }
});

/**
 * GET /api/billing/bills
 * List bills with pagination & filters
 */
router.get('/bills', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      branchId,
      status,
      orderType,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const targetBranchId = (branchId as string) || req.user?.branchId;
    if (req.user?.role !== 'SUPER_ADMIN' && !targetBranchId) {
      res.status(400).json({
        success: false,
        error: 'branchId is required',
      });
      return;
    }

    const where: any = {};

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (status) {
      where.status = String(status);
    }

    if (orderType) {
      where.orderType = String(orderType);
    }

    if (startDate || endDate) {
      const { gte, lte } = dateRange(startDate as string, endDate as string);
      where.createdAt = { gte, lte };
    }

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { billNumber: { contains: s } },
        { customerName: { contains: s } },
        { customerPhone: { contains: s } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          table: { select: { id: true, number: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: true,
          payments: true,
        },
      }),
      prisma.bill.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('List bills error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bills',
    });
  }
});

/**
 * GET /api/billing/bills/:id
 * Get single bill with all details
 */
router.get('/bills/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        branch: true,
        user: { select: { id: true, username: true, fullName: true } },
        table: true,
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, shortCode: true, isVeg: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }

    res.json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    console.error('Fetch bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bill',
    });
  }
});

/**
 * PUT /api/billing/bills/:id
 * Update bill items (add/remove/modify). Recalculate totals.
 * Only allowed for ACTIVE or HELD bills.
 */
router.put('/bills/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      items,
      discountType,
      discountValue,
      parcelCharges,
      gstEnabled,
      customerName,
      customerPhone,
      customerAddress,
      notes,
      tableId,
      orderType,
    } = req.body;

    const existingBill = await prisma.bill.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existingBill) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }

    if (!['ACTIVE', 'HELD'].includes(existingBill.status)) {
      res.status(400).json({
        success: false,
        error: `Cannot modify bill in ${existingBill.status} state`,
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Bill must contain at least one item',
      });
      return;
    }

    // Fetch new menu items
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    const menuItemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    const isGstOn = gstEnabled !== undefined ? Boolean(gstEnabled) : existingBill.gstEnabled;
    const discType = discountType !== undefined ? discountType : existingBill.discountType;
    const discVal = discountValue !== undefined ? Number(discountValue) : existingBill.discountValue;
    const pCharges =
      parcelCharges !== undefined ? Math.round(Number(parcelCharges)) : existingBill.parcelCharges;

    let subtotal = 0;
    let totalItemDiscount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalGst = 0;

    const newPreparedItems: any[] = [];

    for (const item of items) {
      const dbItem = menuItemMap.get(item.menuItemId);
      if (!dbItem) {
        res.status(400).json({
          success: false,
          error: `Menu item with id ${item.menuItemId} does not exist`,
        });
        return;
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice =
        item.unitPrice !== undefined ? Math.round(Number(item.unitPrice)) : dbItem.basePrice;

      const itemRawTotal = unitPrice * qty;
      subtotal += itemRawTotal;

      const itemDiscType = item.discountType || 'flat';
      const itemDiscVal = Number(item.discountValue) || 0;
      let itemDiscAmount = 0;

      if (itemDiscType === 'percent') {
        itemDiscAmount = Math.round((itemRawTotal * itemDiscVal) / 100);
      } else {
        itemDiscAmount = Math.min(itemRawTotal, Math.round(itemDiscVal));
      }

      totalItemDiscount += itemDiscAmount;
      const itemTaxable = Math.max(0, itemRawTotal - itemDiscAmount);

      const itemGstRate = isGstOn ? (dbItem.gstRate || 0) : 0;
      let itemGstAmount = 0;

      if (isGstOn && itemGstRate > 0) {
        itemGstAmount = Math.round((itemTaxable * itemGstRate) / 100);
        const itemCgst = Math.floor(itemGstAmount / 2);
        const itemSgst = itemGstAmount - itemCgst;
        totalCgst += itemCgst;
        totalSgst += itemSgst;
        totalGst += itemGstAmount;
      }

      newPreparedItems.push({
        billId: id,
        menuItemId: dbItem.id,
        itemName: dbItem.name,
        quantity: qty,
        unitPrice,
        discountType: itemDiscType,
        discountValue: Math.round(itemDiscVal),
        discountAmount: itemDiscAmount,
        gstRate: itemGstRate,
        gstAmount: itemGstAmount,
        total: itemTaxable + itemGstAmount,
        notes: item.notes || '',
        isKotPrinted: item.isKotPrinted || false,
        kotNumber: item.kotNumber || 0,
      });
    }

    const subtotalAfterItemDiscounts = subtotal - totalItemDiscount;
    let billDiscountAmount = 0;
    if (discType === 'percent') {
      billDiscountAmount = Math.round((subtotalAfterItemDiscounts * discVal) / 100);
    } else {
      billDiscountAmount = Math.min(subtotalAfterItemDiscounts, Math.round(discVal));
    }

    const grandTotal =
      subtotalAfterItemDiscounts - billDiscountAmount + totalGst + pCharges;
    const { rounded: netTotal, roundOff } = roundToRupee(grandTotal);

    const updatedBill = await prisma.$transaction(async (tx) => {
      // Delete old items and insert updated items
      await tx.billItem.deleteMany({ where: { billId: id } });
      await tx.billItem.createMany({ data: newPreparedItems });

      const bill = await tx.bill.update({
        where: { id },
        data: {
          subtotal,
          discountType: discType,
          discountValue: Math.round(discVal),
          discountAmount: totalItemDiscount + billDiscountAmount,
          parcelCharges: pCharges,
          gstEnabled: isGstOn,
          isGstBill: isGstOn && totalGst > 0,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          totalGst,
          grandTotal,
          roundOff,
          netTotal,
          customerName: customerName !== undefined ? customerName.trim() : undefined,
          customerPhone: customerPhone !== undefined ? customerPhone.trim() : undefined,
          customerAddress: customerAddress !== undefined ? customerAddress.trim() : undefined,
          notes: notes !== undefined ? notes.trim() : undefined,
          tableId: tableId !== undefined ? tableId : undefined,
          orderType: orderType !== undefined ? orderType : undefined,
        },
        include: {
          items: true,
          table: true,
          user: { select: { id: true, username: true, fullName: true } },
        },
      });

      // Record Audit
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'MODIFY_BILL',
          entity: 'Bill',
          entityId: id,
          details: JSON.stringify({
            billNumber: bill.billNumber,
            netTotal: bill.netTotal,
          }),
        },
      });

      return bill;
    });

    res.json({
      success: true,
      data: updatedBill,
    });
  } catch (error: any) {
    console.error('Update bill error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update bill',
    });
  }
});

/**
 * POST /api/billing/bills/:id/settle
 * Settle bill, create payments, update CashDrawerSession for cash, audit log
 */
router.post('/bills/:id/settle', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one payment method is required to settle the bill',
      });
      return;
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }

    if (bill.status === 'SETTLED') {
      res.status(400).json({
        success: false,
        error: 'Bill is already settled',
      });
      return;
    }

    if (bill.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        error: 'Cannot settle a cancelled bill',
      });
      return;
    }

    // Validate payment total
    const totalPaid = payments.reduce((sum: number, p: any) => sum + Math.round(Number(p.amount) || 0), 0);

    if (totalPaid < bill.netTotal) {
      res.status(400).json({
        success: false,
        error: `Insufficient payment: Total paid (${totalPaid}) is less than net total (${bill.netTotal})`,
      });
      return;
    }

    // Calculate total cash payments
    const cashPaid = payments
      .filter((p: any) => String(p.method).toUpperCase() === 'CASH')
      .reduce((sum: number, p: any) => sum + Math.round(Number(p.amount) || 0), 0);

    const settledBill = await prisma.$transaction(async (tx) => {
      // 1. Create Payment records
      for (const p of payments) {
        await tx.payment.create({
          data: {
            billId: id,
            method: String(p.method).toUpperCase(),
            amount: Math.round(Number(p.amount)),
            reference: p.reference ? String(p.reference).trim() : '',
          },
        });
      }

      // 2. Mark bill as settled
      const updated = await tx.bill.update({
        where: { id },
        data: {
          status: 'SETTLED',
          settledAt: new Date(),
        },
        include: {
          items: true,
          payments: true,
          table: true,
          user: { select: { id: true, username: true, fullName: true } },
        },
      });

      // 3. Update active CashDrawerSession if CASH payment
      if (cashPaid > 0) {
        const activeSession = await tx.cashDrawerSession.findFirst({
          where: {
            branchId: bill.branchId,
            status: 'OPEN',
          },
        });

        if (activeSession) {
          await tx.cashDrawerSession.update({
            where: { id: activeSession.id },
            data: {
              cashSales: { increment: cashPaid },
              expectedClosing: { increment: cashPaid },
            },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'SETTLE_BILL',
          entity: 'Bill',
          entityId: id,
          details: JSON.stringify({
            billNumber: bill.billNumber,
            totalPaid,
            payments,
          }),
        },
      });

      return updated;
    });

    res.json({
      success: true,
      data: settledBill,
    });
  } catch (error: any) {
    console.error('Settle bill error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to settle bill',
    });
  }
});

/**
 * POST /api/billing/bills/:id/hold
 * Set bill status to HELD
 */
router.post('/bills/:id/hold', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }

    if (bill.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        error: `Only ACTIVE bills can be put on hold. Current status: ${bill.status}`,
      });
      return;
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: { status: 'HELD' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'HOLD_BILL',
        entity: 'Bill',
        entityId: id,
        details: JSON.stringify({ billNumber: bill.billNumber }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Hold bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hold bill',
    });
  }
});

/**
 * POST /api/billing/bills/:id/cancel
 * Cancel bill, reverse stock deductions, log audit. Admin/Manager only.
 */
router.post(
  '/bills/:id/cancel',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason = 'Cancelled by manager' } = req.body;

      const bill = await prisma.bill.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          payments: true,
        },
      });

      if (!bill) {
        res.status(404).json({
          success: false,
          error: 'Bill not found',
        });
        return;
      }

      if (bill.status === 'CANCELLED') {
        res.status(400).json({
          success: false,
          error: 'Bill is already cancelled',
        });
        return;
      }

      const cancelledBill = await prisma.$transaction(async (tx) => {
        // Reverse inventory deductions if any
        for (const item of bill.items) {
          if (item.menuItem?.trackInventory && item.menuItem?.inventoryItemId) {
            const invItem = await tx.inventoryItem.findUnique({
              where: { id: item.menuItem.inventoryItemId },
            });

            if (invItem) {
              const restoredStock = invItem.currentStock + item.quantity;
              await tx.inventoryItem.update({
                where: { id: invItem.id },
                data: { currentStock: restoredStock },
              });

              await tx.stockLog.create({
                data: {
                  inventoryItemId: invItem.id,
                  type: 'MANUAL_ADJUST',
                  quantity: item.quantity,
                  balanceAfter: restoredStock,
                  reference: `Reversal for cancelled bill ${bill.billNumber}`,
                },
              });
            }
          }
        }

        // If it was settled and had cash, reduce cashDrawerSession
        if (bill.status === 'SETTLED') {
          const cashPayments = bill.payments
            .filter((p) => p.method === 'CASH')
            .reduce((sum, p) => sum + p.amount, 0);

          if (cashPayments > 0) {
            const activeSession = await tx.cashDrawerSession.findFirst({
              where: { branchId: bill.branchId, status: 'OPEN' },
            });
            if (activeSession) {
              await tx.cashDrawerSession.update({
                where: { id: activeSession.id },
                data: {
                  cashSales: { decrement: cashPayments },
                  expectedClosing: { decrement: cashPayments },
                },
              });
            }
          }
        }

        const updated = await tx.bill.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            notes: bill.notes ? `${bill.notes} | Cancel Reason: ${reason}` : `Cancel Reason: ${reason}`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'CANCEL_BILL',
            entity: 'Bill',
            entityId: id,
            details: JSON.stringify({
              billNumber: bill.billNumber,
              reason,
            }),
          },
        });

        return updated;
      });

      res.json({
        success: true,
        data: cancelledBill,
      });
    } catch (error: any) {
      console.error('Cancel bill error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel bill',
      });
    }
  }
);

/**
 * POST /api/billing/bills/:id/kot
 * Mark KOT as printed for specified items. Return KOT print data.
 */
router.post('/bills/:id/kot', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        table: true,
        branch: true,
        items: true,
      },
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }

    let itemsToKot = bill.items;
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      itemsToKot = bill.items.filter((i) => itemIds.includes(i.id));
    }

    if (itemsToKot.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No matching items to print KOT',
      });
      return;
    }

    // Determine next KOT sequence number
    const currentMaxKot = bill.items.reduce((max, i) => Math.max(max, i.kotNumber || 0), 0);
    const nextKotNumber = currentMaxKot + 1;

    // Update bill items with KOT status and number
    await prisma.billItem.updateMany({
      where: {
        id: { in: itemsToKot.map((i) => i.id) },
      },
      data: {
        isKotPrinted: true,
        kotNumber: nextKotNumber,
      },
    });

    // Prepare updated list
    const updatedKotItems = itemsToKot.map((i) => ({
      ...i,
      isKotPrinted: true,
      kotNumber: nextKotNumber,
    }));

    const kotData = formatKOT(bill, updatedKotItems, bill.branch);

    // Optionally attempt thermal printing if printer is configured
    if (bill.branch?.printerType && bill.branch.printerType !== 'none') {
      try {
        await printToThermal(kotData, {
          printerType: bill.branch.printerType,
          printerAddress: bill.branch.printerAddress,
          printerWidth: bill.branch.printerWidth,
        });
      } catch (printErr) {
        console.warn('Physical KOT print skipped or failed:', printErr);
      }
    }

    res.json({
      success: true,
      data: kotData,
    });
  } catch (error: any) {
    console.error('KOT error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process KOT',
    });
  }
});

/**
 * POST /api/billing/bills/:id/print
 * Return receipt data formatted for printing (ESC/POS & HTML fallback)
 */
router.post('/bills/:id/print', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        branch: true,
        table: true,
        user: { select: { fullName: true } },
        items: true,
        payments: true,
      },
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }

    const formatted = formatReceipt(bill, bill.branch, bill.items, bill.payments);
    const html = generateReceiptHTML(formatted);

    // If thermal printer configured, trigger direct print
    let thermalPrintResult: { success: boolean; message: string } | null = null;
    if (bill.branch?.printerType && bill.branch.printerType !== 'none') {
      thermalPrintResult = await printToThermal(formatted, {
        printerType: bill.branch.printerType,
        printerAddress: bill.branch.printerAddress,
        printerWidth: bill.branch.printerWidth,
      });
    }

    res.json({
      success: true,
      data: {
        receipt: formatted,
        html,
        thermalPrint: thermalPrintResult,
      },
    });
  } catch (error: any) {
    console.error('Print bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to format receipt for printing',
    });
  }
});

export default router;

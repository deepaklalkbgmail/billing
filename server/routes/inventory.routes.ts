import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { dateRange } from '../utils/helpers.js';

const router = Router();

// ==========================================
// INVENTORY ITEMS
// ==========================================

/**
 * GET /api/inventory/items
 * List inventory items. Query: branchId, search, lowStock (boolean)
 */
router.get('/items', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, search, lowStock } = req.query;

    const targetBranchId = (branchId as string) || req.user?.branchId;
    const where: any = { isActive: true };

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (search) {
      const s = String(search).trim();
      where.name = { contains: s };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // If lowStock is requested, filter where currentStock <= minStock
    let result = items;
    if (lowStock === 'true' || lowStock === true) {
      result = items.filter((item) => item.currentStock <= item.minStock);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Fetch inventory items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory items',
    });
  }
});

/**
 * POST /api/inventory/items
 * Create inventory item
 * Body: { name, unit, currentStock, minStock, costPerUnit, branchId, trackingMode }
 */
router.post(
  '/items',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        unit,
        currentStock = 0,
        minStock = 0,
        costPerUnit = 0,
        branchId,
        trackingMode = 'direct',
      } = req.body;

      const targetBranchId = branchId || req.user?.branchId;
      if (!targetBranchId) {
        res.status(400).json({
          success: false,
          error: 'branchId is required',
        });
        return;
      }

      if (!name || !unit) {
        res.status(400).json({
          success: false,
          error: 'Item name and unit are required',
        });
        return;
      }

      const item = await prisma.inventoryItem.create({
        data: {
          name: name.trim(),
          unit: unit.trim(),
          currentStock: Number(currentStock) || 0,
          minStock: Number(minStock) || 0,
          costPerUnit: Math.round(Number(costPerUnit) || 0),
          branchId: targetBranchId,
          trackingMode: trackingMode || 'direct',
          isActive: true,
        },
      });

      // If initial stock > 0, log OPENING stock
      if (item.currentStock > 0) {
        await prisma.stockLog.create({
          data: {
            inventoryItemId: item.id,
            type: 'OPENING',
            quantity: item.currentStock,
            balanceAfter: item.currentStock,
            reference: 'Initial Opening Stock',
          },
        });
      }

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      console.error('Create inventory item error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create inventory item',
      });
    }
  }
);

/**
 * PUT /api/inventory/items/:id
 * Update inventory item
 */
router.put(
  '/items/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, unit, minStock, costPerUnit, trackingMode, isActive } = req.body;

      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          unit: unit !== undefined ? unit.trim() : undefined,
          minStock: minStock !== undefined ? Number(minStock) : undefined,
          costPerUnit: costPerUnit !== undefined ? Math.round(Number(costPerUnit)) : undefined,
          trackingMode: trackingMode !== undefined ? trackingMode : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update inventory item error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update inventory item',
      });
    }
  }
);

/**
 * POST /api/inventory/items/:id/adjust
 * Manual stock adjustment (positive=add, negative=deduct)
 * Body: { quantity, type (MANUAL_ADJUST, WASTAGE, OPENING), reference }
 */
router.post(
  '/items/:id/adjust',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity, type = 'MANUAL_ADJUST', reference = '' } = req.body;

      const qtyDelta = Number(quantity);
      if (isNaN(qtyDelta) || qtyDelta === 0) {
        res.status(400).json({
          success: false,
          error: 'A non-zero numeric quantity is required for stock adjustment',
        });
        return;
      }

      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Inventory item not found',
        });
        return;
      }

      const newStock = item.currentStock + qtyDelta;

      const result = await prisma.$transaction(async (tx) => {
        const updatedItem = await tx.inventoryItem.update({
          where: { id },
          data: { currentStock: newStock },
        });

        const log = await tx.stockLog.create({
          data: {
            inventoryItemId: id,
            type: ['MANUAL_ADJUST', 'WASTAGE', 'OPENING'].includes(type)
              ? type
              : 'MANUAL_ADJUST',
            quantity: qtyDelta,
            balanceAfter: newStock,
            reference: reference || 'Manual Stock Adjustment',
          },
        });

        return { item: updatedItem, log };
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Stock adjustment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to adjust stock',
      });
    }
  }
);

/**
 * GET /api/inventory/items/:id/logs
 * Get stock movement history for an item
 */
router.get(
  '/items/:id/logs',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = '100' } = req.query;

      const logs = await prisma.stockLog.findMany({
        where: { inventoryItemId: id },
        orderBy: { createdAt: 'desc' },
        take: Math.min(200, parseInt(limit as string, 10) || 100),
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error: any) {
      console.error('Fetch stock logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stock logs',
      });
    }
  }
);

// ==========================================
// RECIPES / BOM
// ==========================================

/**
 * GET /api/inventory/recipes/:menuItemId
 * Get recipe (BOM) for a menu item with ingredients
 */
router.get(
  '/recipes/:menuItemId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { menuItemId } = req.params;

      const recipe = await prisma.recipeIngredient.findMany({
        where: { menuItemId },
        include: {
          inventoryItem: true,
          menuItem: { select: { id: true, name: true, shortCode: true } },
        },
      });

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error: any) {
      console.error('Fetch recipe error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recipe',
      });
    }
  }
);

/**
 * POST /api/inventory/recipes/:menuItemId
 * Set recipe for a menu item. Body: { ingredients: [{ inventoryItemId, quantityUsed }] }
 */
router.post(
  '/recipes/:menuItemId',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { menuItemId } = req.params;
      const { ingredients = [] } = req.body;

      if (!Array.isArray(ingredients)) {
        res.status(400).json({
          success: false,
          error: 'ingredients must be an array',
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // Delete existing recipe ingredients
        await tx.recipeIngredient.deleteMany({
          where: { menuItemId },
        });

        // Insert new recipe ingredients
        for (const ing of ingredients) {
          if (ing.inventoryItemId && Number(ing.quantityUsed) > 0) {
            await tx.recipeIngredient.create({
              data: {
                menuItemId,
                inventoryItemId: ing.inventoryItemId,
                quantityUsed: Number(ing.quantityUsed),
              },
            });
          }
        }
      });

      const updatedRecipe = await prisma.recipeIngredient.findMany({
        where: { menuItemId },
        include: { inventoryItem: true },
      });

      res.json({
        success: true,
        data: updatedRecipe,
      });
    } catch (error: any) {
      console.error('Set recipe error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update recipe',
      });
    }
  }
);

// ==========================================
// PURCHASES & SUPPLIERS
// ==========================================

/**
 * GET /api/inventory/purchases
 * List purchases. Query: branchId, supplierId, paymentStatus, startDate, endDate
 */
router.get(
  '/purchases',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId, supplierId, paymentStatus, startDate, endDate } = req.query;

      const where: any = {};
      const targetBranchId = (branchId as string) || req.user?.branchId;

      if (targetBranchId) {
        where.branchId = targetBranchId;
      }

      if (supplierId) {
        where.supplierId = String(supplierId);
      }

      if (paymentStatus) {
        where.paymentStatus = String(paymentStatus);
      }

      if (startDate || endDate) {
        const { gte, lte } = dateRange(startDate as string, endDate as string);
        where.invoiceDate = { gte, lte };
      }

      const purchases = await prisma.purchase.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        include: {
          supplier: true,
          branch: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      });

      res.json({
        success: true,
        data: purchases,
      });
    } catch (error: any) {
      console.error('Fetch purchases error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve purchases',
      });
    }
  }
);

/**
 * POST /api/inventory/purchases
 * Create purchase with items, update inventory stock & create StockLogs
 */
router.post(
  '/purchases',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        branchId,
        supplierId,
        invoiceNumber = '',
        invoiceDate,
        items = [],
        totalAmount,
        paidAmount = 0,
        paymentStatus = 'UNPAID',
        paymentMode = 'CASH',
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
          error: 'Purchase must have at least one item',
        });
        return;
      }

      let calculatedTotal = 0;
      const formattedItems = items.map((i: any) => {
        const qty = Number(i.quantity) || 0;
        const uPrice = Math.round(Number(i.unitPrice) || 0);
        const itemTotal = Math.round(qty * uPrice);
        calculatedTotal += itemTotal;
        return {
          inventoryItemId: i.inventoryItemId,
          quantity: qty,
          unitPrice: uPrice,
          total: itemTotal,
        };
      });

      const finalTotal = totalAmount !== undefined ? Math.round(Number(totalAmount)) : calculatedTotal;
      const finalPaid = Math.round(Number(paidAmount) || 0);

      let finalPaymentStatus = paymentStatus;
      if (!paymentStatus || paymentStatus === 'AUTO') {
        if (finalPaid >= finalTotal) finalPaymentStatus = 'PAID';
        else if (finalPaid > 0) finalPaymentStatus = 'PARTIAL';
        else finalPaymentStatus = 'UNPAID';
      }

      const createdPurchase = await prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
          data: {
            branchId: targetBranchId,
            supplierId: supplierId || null,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
            totalAmount: finalTotal,
            paidAmount: finalPaid,
            paymentStatus: finalPaymentStatus,
            paymentMode: paymentMode || 'CASH',
            notes: notes.trim(),
            items: {
              create: formattedItems,
            },
          },
          include: {
            items: true,
            supplier: true,
          },
        });

        // Update inventory stock for each item & create StockLog
        for (const item of formattedItems) {
          const invItem = await tx.inventoryItem.findUnique({
            where: { id: item.inventoryItemId },
          });

          if (invItem) {
            const newStock = invItem.currentStock + item.quantity;
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: {
                currentStock: newStock,
                costPerUnit: item.unitPrice,
              },
            });

            await tx.stockLog.create({
              data: {
                inventoryItemId: invItem.id,
                type: 'PURCHASE',
                quantity: item.quantity,
                balanceAfter: newStock,
                reference: invoiceNumber ? `Purchase Inv ${invoiceNumber}` : `Purchase ${purchase.id}`,
              },
            });
          }
        }

        return purchase;
      });

      res.status(201).json({
        success: true,
        data: createdPurchase,
      });
    } catch (error: any) {
      console.error('Create purchase error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create purchase',
      });
    }
  }
);

/**
 * PUT /api/inventory/purchases/:id/payment
 * Update purchase payment info
 */
router.put(
  '/purchases/:id/payment',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { paidAmount, paymentStatus, paymentMode } = req.body;

      const purchase = await prisma.purchase.findUnique({ where: { id } });
      if (!purchase) {
        res.status(404).json({
          success: false,
          error: 'Purchase not found',
        });
        return;
      }

      const newPaid = paidAmount !== undefined ? Math.round(Number(paidAmount)) : purchase.paidAmount;
      let newStatus = paymentStatus;

      if (!newStatus) {
        if (newPaid >= purchase.totalAmount) newStatus = 'PAID';
        else if (newPaid > 0) newStatus = 'PARTIAL';
        else newStatus = 'UNPAID';
      }

      const updated = await prisma.purchase.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          paymentStatus: newStatus,
          paymentMode: paymentMode !== undefined ? paymentMode : purchase.paymentMode,
        },
        include: { supplier: true, items: true },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update purchase payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update purchase payment',
      });
    }
  }
);

// ==========================================
// SUPPLIERS
// ==========================================

/**
 * GET /api/inventory/suppliers
 * List suppliers
 */
router.get('/suppliers', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchases: true } },
      },
    });

    res.json({
      success: true,
      data: suppliers,
    });
  } catch (error: any) {
    console.error('Fetch suppliers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve suppliers',
    });
  }
});

/**
 * POST /api/inventory/suppliers
 * Create supplier
 */
router.post(
  '/suppliers',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, phone = '', address = '', gstin = '' } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Supplier name is required',
        });
        return;
      }

      const supplier = await prisma.supplier.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          gstin: gstin.trim(),
          isActive: true,
        },
      });

      res.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error: any) {
      console.error('Create supplier error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create supplier',
      });
    }
  }
);

/**
 * PUT /api/inventory/suppliers/:id
 * Update supplier
 */
router.put(
  '/suppliers/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, phone, address, gstin, isActive } = req.body;

      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          phone: phone !== undefined ? phone.trim() : undefined,
          address: address !== undefined ? address.trim() : undefined,
          gstin: gstin !== undefined ? gstin.trim() : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update supplier error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier',
      });
    }
  }
);

// ==========================================
// STOCK TRANSFERS
// ==========================================

/**
 * GET /api/inventory/transfers
 * List stock transfers. Query: branchId (shows transfers from or to)
 */
router.get(
  '/transfers',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.query;
      const targetBranchId = (branchId as string) || req.user?.branchId;

      const where: any = {};
      if (targetBranchId) {
        where.OR = [{ fromBranchId: targetBranchId }, { toBranchId: targetBranchId }];
      }

      const transfers = await prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      });

      res.json({
        success: true,
        data: transfers,
      });
    } catch (error: any) {
      console.error('Fetch transfers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stock transfers',
      });
    }
  }
);

/**
 * POST /api/inventory/transfers
 * Create transfer with items. Body: { fromBranchId, toBranchId, items: [{ inventoryItemId, quantity }], notes? }
 */
router.post(
  '/transfers',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromBranchId, toBranchId, items = [], notes = '' } = req.body;

      if (!fromBranchId || !toBranchId) {
        res.status(400).json({
          success: false,
          error: 'fromBranchId and toBranchId are required',
        });
        return;
      }

      if (fromBranchId === toBranchId) {
        res.status(400).json({
          success: false,
          error: 'Source and destination branches must be different',
        });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Transfer must contain at least one item',
        });
        return;
      }

      const transfer = await prisma.stockTransfer.create({
        data: {
          fromBranchId,
          toBranchId,
          status: 'PENDING',
          notes: notes.trim(),
          items: {
            create: items.map((i: any) => ({
              inventoryItemId: i.inventoryItemId,
              quantity: Number(i.quantity) || 0,
            })),
          },
        },
        include: {
          items: true,
          fromBranch: true,
          toBranch: true,
        },
      });

      res.status(201).json({
        success: true,
        data: transfer,
      });
    } catch (error: any) {
      console.error('Create transfer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create stock transfer',
      });
    }
  }
);

/**
 * POST /api/inventory/transfers/:id/complete
 * Complete transfer. Deduct from source branch, add to destination branch, create StockLogs
 */
router.post(
  '/transfers/:id/complete',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const transfer = await prisma.stockTransfer.findUnique({
        where: { id },
        include: {
          items: {
            include: { inventoryItem: true },
          },
          fromBranch: true,
          toBranch: true,
        },
      });

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer not found',
        });
        return;
      }

      if (transfer.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          error: `Transfer is already ${transfer.status}`,
        });
        return;
      }

      const completed = await prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
          const sourceItem = item.inventoryItem;
          const transferQty = item.quantity;

          // 1. Deduct from source branch item
          const sourceNewStock = sourceItem.currentStock - transferQty;
          await tx.inventoryItem.update({
            where: { id: sourceItem.id },
            data: { currentStock: sourceNewStock },
          });

          await tx.stockLog.create({
            data: {
              inventoryItemId: sourceItem.id,
              type: 'TRANSFER_OUT',
              quantity: -transferQty,
              balanceAfter: sourceNewStock,
              reference: `Transfer to ${transfer.toBranch.name} (#${transfer.id})`,
            },
          });

          // 2. Find or create matching inventory item in target branch
          let targetItem = await tx.inventoryItem.findFirst({
            where: {
              branchId: transfer.toBranchId,
              name: sourceItem.name,
              unit: sourceItem.unit,
            },
          });

          if (!targetItem) {
            targetItem = await tx.inventoryItem.create({
              data: {
                branchId: transfer.toBranchId,
                name: sourceItem.name,
                unit: sourceItem.unit,
                currentStock: transferQty,
                minStock: sourceItem.minStock,
                costPerUnit: sourceItem.costPerUnit,
                trackingMode: sourceItem.trackingMode,
                isActive: true,
              },
            });
          } else {
            const targetNewStock = targetItem.currentStock + transferQty;
            targetItem = await tx.inventoryItem.update({
              where: { id: targetItem.id },
              data: { currentStock: targetNewStock },
            });
          }

          await tx.stockLog.create({
            data: {
              inventoryItemId: targetItem.id,
              type: 'TRANSFER_IN',
              quantity: transferQty,
              balanceAfter: targetItem.currentStock,
              reference: `Transfer from ${transfer.fromBranch.name} (#${transfer.id})`,
            },
          });
        }

        // 3. Mark transfer as completed
        return await tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
          include: {
            items: true,
            fromBranch: true,
            toBranch: true,
          },
        });
      });

      res.json({
        success: true,
        data: completed,
      });
    } catch (error: any) {
      console.error('Complete transfer error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete stock transfer',
      });
    }
  }
);

export default router;

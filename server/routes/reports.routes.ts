import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { dateRange } from '../utils/helpers.js';

const router = Router();

/**
 * GET /api/reports/daily-summary
 * Summary for branch and date: total bills, total sales, payment breakdown, top 5 items, expenses, net collection
 */
router.get(
  '/daily-summary',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId, date } = req.query;
      const targetBranchId = (branchId as string) || req.user?.branchId;

      if (!targetBranchId) {
        res.status(400).json({
          success: false,
          error: 'branchId is required',
        });
        return;
      }

      const { gte, lte } = dateRange(date as string, date as string);

      // Bills on date
      const bills = await prisma.bill.findMany({
        where: {
          branchId: targetBranchId,
          createdAt: { gte, lte },
          status: { not: 'CANCELLED' },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      const totalBills = bills.length;
      const totalSales = bills.reduce((sum, b) => sum + (b.netTotal || 0), 0);

      // Payment Breakdown
      const paymentsBreakdown: Record<string, number> = {
        CASH: 0,
        UPI: 0,
        CARD: 0,
        OTHER: 0,
      };

      for (const bill of bills) {
        for (const payment of bill.payments) {
          const method = (payment.method || 'OTHER').toUpperCase();
          if (paymentsBreakdown[method] !== undefined) {
            paymentsBreakdown[method] += payment.amount;
          } else {
            paymentsBreakdown[method] = payment.amount;
          }
        }
      }

      // Top 5 items on that date
      const itemAggMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const bill of bills) {
        for (const item of bill.items) {
          const existing = itemAggMap.get(item.itemName) || {
            name: item.itemName,
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += item.total;
          itemAggMap.set(item.itemName, existing);
        }
      }

      const top5Items = Array.from(itemAggMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Expenses on date
      const expenses = await prisma.expense.findMany({
        where: {
          branchId: targetBranchId,
          expenseDate: { gte, lte },
        },
      });

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netCollection = totalSales - totalExpenses;

      res.json({
        success: true,
        data: {
          date: (date as string) || new Date().toISOString().split('T')[0],
          branchId: targetBranchId,
          totalBills,
          totalSales,
          paymentsBreakdown,
          top5Items,
          totalExpenses,
          netCollection,
        },
      });
    } catch (error: any) {
      console.error('Daily summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate daily summary',
      });
    }
  }
);

/**
 * GET /api/reports/sales
 * Sales report with groupBy (day / week / month)
 * Returns array of { period, totalBills, totalSales, totalGst, avgBillValue }
 */
router.get('/sales', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate, groupBy = 'day' } = req.query;
    const targetBranchId = (branchId as string) || req.user?.branchId;

    const where: any = {
      status: { not: 'CANCELLED' },
    };

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (startDate || endDate) {
      const { gte, lte } = dateRange(startDate as string, endDate as string);
      where.createdAt = { gte, lte };
    }

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        netTotal: true,
        totalGst: true,
        createdAt: true,
      },
    });

    const groups = new Map<
      string,
      { period: string; totalBills: number; totalSales: number; totalGst: number }
    >();

    for (const b of bills) {
      const d = new Date(b.createdAt);
      let key = '';

      if (groupBy === 'month') {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        key = `${y}-${m}`;
      } else if (groupBy === 'week') {
        // Simple ISO week representation
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      } else {
        // default: day (YYYY-MM-DD)
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        key = `${y}-${m}-${day}`;
      }

      const existing = groups.get(key) || {
        period: key,
        totalBills: 0,
        totalSales: 0,
        totalGst: 0,
      };

      existing.totalBills += 1;
      existing.totalSales += b.netTotal;
      existing.totalGst += b.totalGst;
      groups.set(key, existing);
    }

    const results = Array.from(groups.values()).map((g) => ({
      ...g,
      avgBillValue: g.totalBills > 0 ? Math.round(g.totalSales / g.totalBills) : 0,
    }));

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Sales report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sales report',
    });
  }
});

/**
 * GET /api/reports/top-items
 * Top selling items by quantity or revenue
 * Query: branchId, startDate, endDate, limit, sortBy (quantity/revenue)
 */
router.get('/top-items', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate, limit = '10', sortBy = 'quantity' } = req.query;
    const targetBranchId = (branchId as string) || req.user?.branchId;

    const where: any = {
      status: { not: 'CANCELLED' },
    };

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (startDate || endDate) {
      const { gte, lte } = dateRange(startDate as string, endDate as string);
      where.createdAt = { gte, lte };
    }

    const bills = await prisma.bill.findMany({
      where,
      select: {
        items: {
          select: {
            menuItemId: true,
            itemName: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
      },
    });

    const itemMap = new Map<
      string,
      { menuItemId: string; name: string; quantity: number; revenue: number }
    >();

    for (const b of bills) {
      for (const item of b.items) {
        const existing = itemMap.get(item.menuItemId) || {
          menuItemId: item.menuItemId,
          name: item.itemName,
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.total;
        itemMap.set(item.menuItemId, existing);
      }
    }

    const itemsList = Array.from(itemMap.values());
    if (sortBy === 'revenue') {
      itemsList.sort((a, b) => b.revenue - a.revenue);
    } else {
      itemsList.sort((a, b) => b.quantity - a.quantity);
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const result = itemsList.slice(0, limitNum);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Top items report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top items report',
    });
  }
});

/**
 * GET /api/reports/expenses
 * Expense report grouped by category
 * Return { category, total, count }
 */
router.get('/expenses', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const targetBranchId = (branchId as string) || req.user?.branchId;

    const where: any = {};
    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (startDate || endDate) {
      const { gte, lte } = dateRange(startDate as string, endDate as string);
      where.expenseDate = { gte, lte };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
    });

    const catMap = new Map<string, { category: string; total: number; count: number }>();
    let grandTotalExpenses = 0;

    for (const exp of expenses) {
      const catName = exp.category?.name || 'Uncategorized';
      const existing = catMap.get(catName) || { category: catName, total: 0, count: 0 };
      existing.total += exp.amount;
      existing.count += 1;
      catMap.set(catName, existing);
      grandTotalExpenses += exp.amount;
    }

    res.json({
      success: true,
      data: {
        categories: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
        grandTotal: grandTotalExpenses,
        totalCount: expenses.length,
      },
    });
  } catch (error: any) {
    console.error('Expense report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate expense report',
    });
  }
});

/**
 * GET /api/reports/gst
 * GST report. Returns list of GST bills with CGST, SGST, total tax, taxable value
 */
router.get('/gst', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const targetBranchId = (branchId as string) || req.user?.branchId;

    const where: any = {
      isGstBill: true,
      status: { not: 'CANCELLED' },
    };

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (startDate || endDate) {
      const { gte, lte } = dateRange(startDate as string, endDate as string);
      where.createdAt = { gte, lte };
    }

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, gstin: true, code: true } },
      },
    });

    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalTax = 0;
    let totalNet = 0;

    const formattedBills = bills.map((b) => {
      const taxable = Math.max(0, b.subtotal - b.discountAmount);
      totalTaxableValue += taxable;
      totalCgst += b.cgstAmount;
      totalSgst += b.sgstAmount;
      totalTax += b.totalGst;
      totalNet += b.netTotal;

      return {
        id: b.id,
        billNumber: b.billNumber,
        date: b.createdAt,
        branchName: b.branch?.name,
        branchGstin: b.branch?.gstin,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        taxableValue: taxable,
        cgst: b.cgstAmount,
        sgst: b.sgstAmount,
        totalTax: b.totalGst,
        netTotal: b.netTotal,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalBills: bills.length,
          totalTaxableValue,
          totalCgst,
          totalSgst,
          totalTax,
          totalNet,
        },
        bills: formattedBills,
      },
    });
  } catch (error: any) {
    console.error('GST report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate GST report',
    });
  }
});

/**
 * GET /api/reports/profit-loss
 * Simplified P&L: Revenue - (COGS from purchases + Expenses) = Profit
 */
router.get(
  '/profit-loss',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId, startDate, endDate } = req.query;
      const targetBranchId = (branchId as string) || req.user?.branchId;

      const { gte, lte } = dateRange(startDate as string, endDate as string);

      // Revenue: Total sales from settled/non-cancelled bills
      const billWhere: any = {
        createdAt: { gte, lte },
        status: { not: 'CANCELLED' },
      };
      if (targetBranchId) billWhere.branchId = targetBranchId;

      const bills = await prisma.bill.findMany({
        where: billWhere,
        select: { netTotal: true },
      });
      const revenue = bills.reduce((sum, b) => sum + b.netTotal, 0);

      // COGS: Total purchases in period
      const purchaseWhere: any = {
        invoiceDate: { gte, lte },
      };
      if (targetBranchId) purchaseWhere.branchId = targetBranchId;

      const purchases = await prisma.purchase.findMany({
        where: purchaseWhere,
        select: { totalAmount: true },
      });
      const cogs = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

      // Operating Expenses
      const expenseWhere: any = {
        expenseDate: { gte, lte },
      };
      if (targetBranchId) expenseWhere.branchId = targetBranchId;

      const expenses = await prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true },
      });
      const operatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - operatingExpenses;
      const profitMarginPercent =
        revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0;

      res.json({
        success: true,
        data: {
          period: { startDate: gte, endDate: lte },
          revenue, // in paise
          cogs, // in paise
          operatingExpenses, // in paise
          grossProfit,
          netProfit,
          profitMarginPercent,
        },
      });
    } catch (error: any) {
      console.error('Profit and Loss report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate Profit & Loss report',
      });
    }
  }
);

/**
 * GET /api/reports/branch-comparison
 * Compare sales across all branches for a date range (SUPER_ADMIN)
 */
router.get(
  '/branch-comparison',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const { gte, lte } = dateRange(startDate as string, endDate as string);

      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });

      const comparison = await Promise.all(
        branches.map(async (branch) => {
          // Branch bills
          const bills = await prisma.bill.findMany({
            where: {
              branchId: branch.id,
              createdAt: { gte, lte },
              status: { not: 'CANCELLED' },
            },
            select: { netTotal: true },
          });

          const totalSales = bills.reduce((sum, b) => sum + b.netTotal, 0);
          const totalBills = bills.length;

          // Branch expenses
          const expenses = await prisma.expense.findMany({
            where: {
              branchId: branch.id,
              expenseDate: { gte, lte },
            },
            select: { amount: true },
          });

          const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
          const netProfit = totalSales - totalExpenses;

          return {
            branchId: branch.id,
            branchCode: branch.code,
            branchName: branch.name,
            totalSales,
            totalBills,
            totalExpenses,
            netProfit,
          };
        })
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error('Branch comparison error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate branch comparison report',
      });
    }
  }
);

export default router;

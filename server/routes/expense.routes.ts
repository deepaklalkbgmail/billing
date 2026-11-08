import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { dateRange } from '../utils/helpers.js';

const router = Router();

// ==========================================
// CASH DRAWER SESSIONS
// ==========================================

/**
 * POST /api/expenses/cash-drawer/open
 * Open a new cash drawer session for a branch.
 * Only one OPEN session per branch allowed at a time.
 */
router.post(
  '/cash-drawer/open',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId, openingBalance = 0 } = req.body;
      const targetBranchId = branchId || req.user?.branchId;

      if (!targetBranchId) {
        res.status(400).json({
          success: false,
          error: 'branchId is required',
        });
        return;
      }

      // Check if open session exists
      const existingOpen = await prisma.cashDrawerSession.findFirst({
        where: {
          branchId: targetBranchId,
          status: 'OPEN',
        },
      });

      if (existingOpen) {
        res.status(400).json({
          success: false,
          error: 'An active cash drawer session is already OPEN for this branch. Please close it first.',
          data: existingOpen,
        });
        return;
      }

      const balance = Math.round(Number(openingBalance) || 0);

      const session = await prisma.cashDrawerSession.create({
        data: {
          branchId: targetBranchId,
          userId: req.user!.id,
          openingBalance: balance,
          cashSales: 0,
          cashExpenses: 0,
          expectedClosing: balance,
          status: 'OPEN',
        },
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Open cash drawer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to open cash drawer session',
      });
    }
  }
);

/**
 * POST /api/expenses/cash-drawer/:id/close
 * Close session, calculate expectedClosing, difference, set status to CLOSED
 */
router.post(
  '/cash-drawer/:id/close',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { actualClosing, notes = '' } = req.body;

      if (actualClosing === undefined || actualClosing === null) {
        res.status(400).json({
          success: false,
          error: 'actualClosing (in paise) is required to close the session',
        });
        return;
      }

      const session = await prisma.cashDrawerSession.findUnique({ where: { id } });
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Cash drawer session not found',
        });
        return;
      }

      if (session.status === 'CLOSED') {
        res.status(400).json({
          success: false,
          error: 'Cash drawer session is already CLOSED',
        });
        return;
      }

      const actual = Math.round(Number(actualClosing));
      const expected = session.openingBalance + session.cashSales - session.cashExpenses;
      const difference = actual - expected;

      const closedSession = await prisma.cashDrawerSession.update({
        where: { id },
        data: {
          expectedClosing: expected,
          actualClosing: actual,
          difference,
          status: 'CLOSED',
          closedAt: new Date(),
          notes: notes.trim(),
        },
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      res.json({
        success: true,
        data: closedSession,
      });
    } catch (error: any) {
      console.error('Close cash drawer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close cash drawer session',
      });
    }
  }
);

/**
 * GET /api/expenses/cash-drawer/current
 * Get current open session for a branch
 */
router.get(
  '/cash-drawer/current',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.query;
      const targetBranchId = (branchId as string) || req.user?.branchId;

      if (!targetBranchId) {
        res.status(400).json({
          success: false,
          error: 'branchId is required',
        });
        return;
      }

      const session = await prisma.cashDrawerSession.findFirst({
        where: {
          branchId: targetBranchId,
          status: 'OPEN',
        },
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      res.json({
        success: true,
        data: session || null,
      });
    } catch (error: any) {
      console.error('Fetch current cash drawer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch current cash drawer session',
      });
    }
  }
);

/**
 * GET /api/expenses/cash-drawer/history
 * List past cash drawer sessions. Query: branchId, startDate, endDate
 */
router.get(
  '/cash-drawer/history',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId, startDate, endDate } = req.query;
      const targetBranchId = (branchId as string) || req.user?.branchId;

      const where: any = {};
      if (targetBranchId) {
        where.branchId = targetBranchId;
      }

      if (startDate || endDate) {
        const { gte, lte } = dateRange(startDate as string, endDate as string);
        where.openedAt = { gte, lte };
      }

      const sessions = await prisma.cashDrawerSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      console.error('Fetch cash drawer history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cash drawer history',
      });
    }
  }
);

// ==========================================
// EXPENSE CATEGORIES
// ==========================================

/**
 * GET /api/expenses/categories
 * List expense categories
 */
router.get('/categories', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Fetch expense categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve expense categories',
    });
  }
});

/**
 * POST /api/expenses/categories
 * Create expense category
 */
router.post(
  '/categories',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Category name is required',
        });
        return;
      }

      const category = await prisma.expenseCategory.upsert({
        where: { name: name.trim() },
        update: { isActive: true },
        create: { name: name.trim(), isActive: true },
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      console.error('Create expense category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create expense category',
      });
    }
  }
);

// ==========================================
// EXPENSES
// ==========================================

/**
 * GET /api/expenses
 * List expenses. Query: branchId, categoryId, startDate, endDate, paymentSource
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, categoryId, startDate, endDate, paymentSource } = req.query;
    const targetBranchId = (branchId as string) || req.user?.branchId;

    const where: any = {};

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (paymentSource) {
      where.paymentSource = String(paymentSource);
    }

    if (startDate || endDate) {
      const { gte, lte } = dateRange(startDate as string, endDate as string);
      where.expenseDate = { gte, lte };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        category: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error: any) {
    console.error('Fetch expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve expenses',
    });
  }
});

/**
 * POST /api/expenses
 * Create expense. If paymentSource is COUNTER_CASH, update active CashDrawerSession cashExpenses
 */
router.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        branchId,
        categoryId,
        description,
        amount,
        paymentSource = 'COUNTER_CASH',
        paymentMode = 'CASH',
        reference = '',
        expenseDate,
      } = req.body;

      const targetBranchId = branchId || req.user?.branchId;
      if (!targetBranchId) {
        res.status(400).json({
          success: false,
          error: 'branchId is required',
        });
        return;
      }

      if (!categoryId || !description || amount === undefined) {
        res.status(400).json({
          success: false,
          error: 'categoryId, description, and amount are required',
        });
        return;
      }

      const expenseAmount = Math.round(Number(amount));
      if (expenseAmount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Expense amount must be greater than 0',
        });
        return;
      }

      const expense = await prisma.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            branchId: targetBranchId,
            categoryId,
            description: description.trim(),
            amount: expenseAmount,
            paymentSource,
            paymentMode,
            reference: reference.trim(),
            expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          },
          include: {
            category: true,
            branch: true,
          },
        });

        // If COUNTER_CASH, update active drawer
        if (paymentSource === 'COUNTER_CASH') {
          const activeSession = await tx.cashDrawerSession.findFirst({
            where: {
              branchId: targetBranchId,
              status: 'OPEN',
            },
          });

          if (activeSession) {
            await tx.cashDrawerSession.update({
              where: { id: activeSession.id },
              data: {
                cashExpenses: { increment: expenseAmount },
                expectedClosing: { decrement: expenseAmount },
              },
            });
          }
        }

        return created;
      });

      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error: any) {
      console.error('Create expense error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create expense',
      });
    }
  }
);

/**
 * PUT /api/expenses/:id
 * Update expense details
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { categoryId, description, amount, paymentSource, paymentMode, reference, expenseDate } =
        req.body;

      const existing = await prisma.expense.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Expense not found',
        });
        return;
      }

      const updated = await prisma.expense.update({
        where: { id },
        data: {
          categoryId: categoryId !== undefined ? categoryId : undefined,
          description: description !== undefined ? description.trim() : undefined,
          amount: amount !== undefined ? Math.round(Number(amount)) : undefined,
          paymentSource: paymentSource !== undefined ? paymentSource : undefined,
          paymentMode: paymentMode !== undefined ? paymentMode : undefined,
          reference: reference !== undefined ? reference.trim() : undefined,
          expenseDate: expenseDate ? new Date(expenseDate) : undefined,
        },
        include: {
          category: true,
          branch: true,
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update expense error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update expense',
      });
    }
  }
);

/**
 * DELETE /api/expenses/:id
 * Delete expense & reverse cash drawer impact if applicable
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const expense = await prisma.expense.findUnique({ where: { id } });
      if (!expense) {
        res.status(404).json({
          success: false,
          error: 'Expense not found',
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // If COUNTER_CASH, reverse impact on active session
        if (expense.paymentSource === 'COUNTER_CASH') {
          const activeSession = await tx.cashDrawerSession.findFirst({
            where: {
              branchId: expense.branchId,
              status: 'OPEN',
            },
          });

          if (activeSession) {
            await tx.cashDrawerSession.update({
              where: { id: activeSession.id },
              data: {
                cashExpenses: { decrement: expense.amount },
                expectedClosing: { increment: expense.amount },
              },
            });
          }
        }

        await tx.expense.delete({ where: { id } });
      });

      res.json({
        success: true,
        data: {
          message: 'Expense deleted successfully',
        },
      });
    } catch (error: any) {
      console.error('Delete expense error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete expense',
      });
    }
  }
);

export default router;

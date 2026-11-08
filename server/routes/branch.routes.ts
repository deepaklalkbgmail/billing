import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/branches
 * Get all branches with basic stats (bill count, today's sales). Super Admin only.
 */
router.get(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const branches = await prisma.branch.findMany({
        orderBy: { code: 'asc' },
        include: {
          settings: true,
          _count: {
            select: {
              bills: true,
              tables: true,
              users: true,
            },
          },
        },
      });

      // Calculate today's sales and bills for each branch
      const branchesWithStats = await Promise.all(
        branches.map(async (branch) => {
          const todayBills = await prisma.bill.findMany({
            where: {
              branchId: branch.id,
              createdAt: { gte: todayStart },
              status: { not: 'CANCELLED' },
            },
            select: {
              netTotal: true,
              status: true,
            },
          });

          const todaySales = todayBills.reduce((acc, b) => acc + (b.netTotal || 0), 0);
          const todayBillCount = todayBills.length;

          return {
            ...branch,
            stats: {
              totalBills: branch._count.bills,
              totalTables: branch._count.tables,
              totalUsers: branch._count.users,
              todayBills: todayBillCount,
              todaySales, // in paise
            },
          };
        })
      );

      res.json({
        success: true,
        data: branchesWithStats,
      });
    } catch (error: any) {
      console.error('Fetch branches error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve branches',
      });
    }
  }
);

/**
 * GET /api/branches/:id
 * Get single branch by ID with all its settings.
 */
router.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Cashiers/Managers can only view their own branch, unless SUPER_ADMIN
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.branchId !== id) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this branch data',
        });
        return;
      }

      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          settings: true,
          tables: {
            where: { isActive: true },
            orderBy: { number: 'asc' },
          },
          _count: {
            select: {
              bills: true,
              tables: true,
              users: true,
            },
          },
        },
      });

      if (!branch) {
        res.status(404).json({
          success: false,
          error: 'Branch not found',
        });
        return;
      }

      res.json({
        success: true,
        data: branch,
      });
    } catch (error: any) {
      console.error('Fetch branch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve branch details',
      });
    }
  }
);

/**
 * PUT /api/branches/:id
 * Update branch details. Super Admin only.
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        name,
        address,
        phone,
        fssaiNo,
        gstin,
        receiptHeader,
        receiptFooter,
        printerType,
        printerAddress,
        printerWidth,
        gstEnabled,
        gstMode,
        isActive,
      } = req.body;

      const existingBranch = await prisma.branch.findUnique({
        where: { id },
      });

      if (!existingBranch) {
        res.status(404).json({
          success: false,
          error: 'Branch not found',
        });
        return;
      }

      const updated = await prisma.branch.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          address: address !== undefined ? address : undefined,
          phone: phone !== undefined ? phone : undefined,
          fssaiNo: fssaiNo !== undefined ? fssaiNo : undefined,
          gstin: gstin !== undefined ? gstin : undefined,
          receiptHeader: receiptHeader !== undefined ? receiptHeader : undefined,
          receiptFooter: receiptFooter !== undefined ? receiptFooter : undefined,
          printerType: printerType !== undefined ? printerType : undefined,
          printerAddress: printerAddress !== undefined ? printerAddress : undefined,
          printerWidth: printerWidth !== undefined ? Number(printerWidth) : undefined,
          gstEnabled: gstEnabled !== undefined ? Boolean(gstEnabled) : undefined,
          gstMode: gstMode !== undefined ? gstMode : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
        include: {
          settings: true,
        },
      });

      // Log audit
      if (req.user?.id) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'UPDATE_BRANCH',
            entity: 'Branch',
            entityId: id,
            details: JSON.stringify(req.body),
          },
        });
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update branch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branch',
      });
    }
  }
);

export default router;

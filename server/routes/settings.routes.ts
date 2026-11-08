import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ==========================================
// GLOBAL SETTINGS
// ==========================================

/**
 * GET /api/settings/global
 * Get all global settings
 */
router.get('/global', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const settingsList = await prisma.globalSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settingsList) {
      settingsMap[s.key] = s.value;
    }

    res.json({
      success: true,
      data: {
        list: settingsList,
        map: settingsMap,
      },
    });
  } catch (error: any) {
    console.error('Fetch global settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve global settings',
    });
  }
});

/**
 * PUT /api/settings/global
 * Update global settings. Super Admin only.
 * Body: { settings: { key: value, ... } }
 */
router.put(
  '/global',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        res.status(400).json({
          success: false,
          error: 'settings object is required',
        });
        return;
      }

      const updatedKeys: string[] = [];
      for (const [key, value] of Object.entries(settings)) {
        await prisma.globalSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
        updatedKeys.push(key);
      }

      res.json({
        success: true,
        data: {
          message: 'Global settings updated successfully',
          updatedKeys,
        },
      });
    } catch (error: any) {
      console.error('Update global settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update global settings',
      });
    }
  }
);

// ==========================================
// BRANCH SETTINGS
// ==========================================

/**
 * GET /api/settings/branch/:branchId
 * Get branch-specific settings
 */
router.get(
  '/branch/:branchId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.params;

      const settings = await prisma.branchSetting.findMany({
        where: { branchId },
        orderBy: { key: 'asc' },
      });

      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }

      res.json({
        success: true,
        data: {
          list: settings,
          map: settingsMap,
        },
      });
    } catch (error: any) {
      console.error('Fetch branch settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve branch settings',
      });
    }
  }
);

/**
 * PUT /api/settings/branch/:branchId
 * Update branch settings. Body: { settings: { key: value, ... } }
 */
router.put(
  '/branch/:branchId',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.params;
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        res.status(400).json({
          success: false,
          error: 'settings object is required',
        });
        return;
      }

      const updatedKeys: string[] = [];
      for (const [key, value] of Object.entries(settings)) {
        await prisma.branchSetting.upsert({
          where: {
            branchId_key: {
              branchId,
              key,
            },
          },
          update: { value: String(value) },
          create: {
            branchId,
            key,
            value: String(value),
          },
        });
        updatedKeys.push(key);
      }

      res.json({
        success: true,
        data: {
          message: 'Branch settings updated successfully',
          updatedKeys,
        },
      });
    } catch (error: any) {
      console.error('Update branch settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branch settings',
      });
    }
  }
);

// ==========================================
// PAYMENT MODES
// ==========================================

/**
 * GET /api/settings/payment-modes
 * List payment modes
 */
router.get('/payment-modes', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const modes = await prisma.paymentMode.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: modes,
    });
  } catch (error: any) {
    console.error('Fetch payment modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment modes',
    });
  }
});

/**
 * POST /api/settings/payment-modes
 * Create payment mode
 */
router.post(
  '/payment-modes',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, sortOrder = 0 } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Payment mode name is required',
        });
        return;
      }

      const mode = await prisma.paymentMode.create({
        data: {
          name: name.trim().toUpperCase(),
          sortOrder: Number(sortOrder) || 0,
          isActive: true,
        },
      });

      res.status(201).json({
        success: true,
        data: mode,
      });
    } catch (error: any) {
      console.error('Create payment mode error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create payment mode',
      });
    }
  }
);

/**
 * PUT /api/settings/payment-modes/:id
 * Update payment mode
 */
router.put(
  '/payment-modes/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, sortOrder, isActive } = req.body;

      const updated = await prisma.paymentMode.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim().toUpperCase() : undefined,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update payment mode error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update payment mode',
      });
    }
  }
);

// ==========================================
// USER MANAGEMENT
// ==========================================

/**
 * GET /api/settings/users
 * List all users. Super Admin only.
 */
router.get(
  '/users',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      console.error('Fetch users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
      });
    }
  }
);

/**
 * POST /api/settings/users
 * Create user. Super Admin only.
 * Body: { username, password, fullName, role, branchId? }
 */
router.post(
  '/users',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password, fullName, role, branchId } = req.body;

      if (!username || !password || !fullName || !role) {
        res.status(400).json({
          success: false,
          error: 'username, password, fullName, and role are required',
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long',
        });
        return;
      }

      const existing = await prisma.user.findUnique({
        where: { username: username.trim() },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: `Username "${username}" already exists`,
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username: username.trim(),
          passwordHash,
          fullName: fullName.trim(),
          role,
          branchId: branchId || null,
          isActive: true,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create user',
      });
    }
  }
);

/**
 * PUT /api/settings/users/:id
 * Update user details (fullName, role, branchId, isActive)
 */
router.put(
  '/users/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { fullName, role, branchId, isActive } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          fullName: fullName !== undefined ? fullName.trim() : undefined,
          role: role !== undefined ? role : undefined,
          branchId: branchId !== undefined ? branchId : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          branchId: true,
          isActive: true,
          updatedAt: true,
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }
  }
);

/**
 * POST /api/settings/users/:id/reset-password
 * Reset user password. Super Admin only.
 */
router.post(
  '/users/:id/reset-password',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: 'newPassword is required and must be at least 6 characters long',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'RESET_PASSWORD',
          entity: 'User',
          entityId: id,
          details: JSON.stringify({ resetForUserId: id }),
        },
      });

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully',
        },
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  }
);

// ==========================================
// DATABASE BACKUP & RESTORE
// ==========================================

/**
 * POST /api/settings/backup
 * Create database backup by copying SQLite .db file to backups/ folder
 */
router.post(
  '/backup',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const projectRoot = process.cwd();
      const backupsDir = path.join(projectRoot, 'backups');

      // Create backups directory if missing
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      // Determine DB file path from DATABASE_URL or default
      let dbPath = path.join(projectRoot, 'data', 'restopos.db');
      const envDbUrl = process.env.DATABASE_URL;
      if (envDbUrl && envDbUrl.startsWith('file:')) {
        const rawRelative = envDbUrl.replace('file:', '').trim();
        dbPath = path.resolve(projectRoot, rawRelative);
      }

      if (!fs.existsSync(dbPath)) {
        // Check fallback prisma/dev.db
        const altDbPath = path.join(projectRoot, 'prisma', 'dev.db');
        if (fs.existsSync(altDbPath)) {
          dbPath = altDbPath;
        } else {
          res.status(404).json({
            success: false,
            error: `Database file not found at ${dbPath}`,
          });
          return;
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `restopos_backup_${timestamp}.db`;
      const backupDestPath = path.join(backupsDir, backupFileName);

      fs.copyFileSync(dbPath, backupDestPath);
      const fileStats = fs.statSync(backupDestPath);

      res.json({
        success: true,
        data: {
          message: 'Database backup created successfully',
          filename: backupFileName,
          path: backupDestPath,
          sizeBytes: fileStats.size,
          createdAt: fileStats.mtime,
        },
      });
    } catch (error: any) {
      console.error('Backup database error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create database backup',
      });
    }
  }
);

/**
 * GET /api/settings/backups
 * List all available backup files
 */
router.get(
  '/backups',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const projectRoot = process.cwd();
      const backupsDir = path.join(projectRoot, 'backups');

      if (!fs.existsSync(backupsDir)) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      const files = fs.readdirSync(backupsDir);
      const backupList = files
        .filter((file) => file.endsWith('.db'))
        .map((file) => {
          const filePath = path.join(backupsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            sizeBytes: stats.size,
            createdAt: stats.mtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      res.json({
        success: true,
        data: backupList,
      });
    } catch (error: any) {
      console.error('List backups error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list backup files',
      });
    }
  }
);

export default router;

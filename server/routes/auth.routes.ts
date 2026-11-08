import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'restopos-local-jwt-secret-change-me';

/**
 * POST /api/auth/login
 * Validates username & password, returns JWT and user profile
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    // Token expires in 24h
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create Audit Log entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          details: JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] }),
        },
      });
    } catch (auditErr) {
      console.warn('Failed to record login audit log:', auditErr);
    }

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          branchId: user.branchId,
          branchName: user.branch ? user.branch.name : null,
          branchCode: user.branch ? user.branch.code : null,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred during login',
    });
  }
});

/**
 * GET /api/auth/me
 * Protected. Return current user profile details
 */
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            gstEnabled: true,
            gstMode: true,
            printerType: true,
            printerAddress: true,
            printerWidth: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(404).json({
        success: false,
        error: 'User not found or deactivated',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Protected. Validate old password, update with new hashed password
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Both old password and new password are required',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: 'Incorrect current password',
      });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CHANGE_PASSWORD',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ message: 'User changed their own password' }),
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
});

export default router;

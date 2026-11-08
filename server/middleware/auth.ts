import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'restopos-local-jwt-secret-change-me';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  branchId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  userId?: string;
  id?: string;
  username: string;
  role: string;
  branchId?: string | null;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.userId || decoded.id || '',
      username: decoded.username,
      role: decoded.role,
      branchId: decoded.branchId ?? null,
    };
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: requires one of the following roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.userId || decoded.id || '',
      username: decoded.username,
      role: decoded.role,
      branchId: decoded.branchId ?? null,
    };
  } catch {
    // If token is invalid in optionalAuth, leave req.user undefined and proceed
  }
  next();
};

import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ==========================================
// CATEGORY ROUTES
// ==========================================

/**
 * GET /api/menu/categories
 * List all active categories sorted by sortOrder
 */
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
    });
  }
});

/**
 * POST /api/menu/categories
 * Create a new category (SUPER_ADMIN or BRANCH_MANAGER)
 */
router.post(
  '/categories',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, sortOrder } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Category name is required',
        });
        return;
      }

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
          isActive: true,
        },
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create category',
      });
    }
  }
);

/**
 * PUT /api/menu/categories/:id
 * Update category details
 */
router.put(
  '/categories/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, sortOrder, isActive } = req.body;

      const category = await prisma.category.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update category',
      });
    }
  }
);

/**
 * DELETE /api/menu/categories/:id
 * Soft delete category (set isActive = false)
 */
router.delete(
  '/categories/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const category = await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        data: {
          message: 'Category deleted successfully',
          category,
        },
      });
    } catch (error: any) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete category',
      });
    }
  }
);

// ==========================================
// MENU ITEM ROUTES
// ==========================================

/**
 * GET /api/menu/items
 * List menu items with filters: categoryId, branchId, search, isAvailable
 */
router.get('/items', async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, branchId, search, isAvailable } = req.query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr } },
        { shortCode: { contains: searchStr } },
      ];
    }

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventoryItem: {
          select: { id: true, name: true, currentStock: true, unit: true },
        },
        branchPrices: branchId
          ? {
              where: { branchId: String(branchId) },
            }
          : false,
      },
    });

    // If branchId was provided, resolve branch-specific price and availability
    const itemsFormatted = items.map((item: any) => {
      let finalPrice = item.basePrice;
      let available = item.isAvailable;

      if (branchId && item.branchPrices && item.branchPrices.length > 0) {
        const bp = item.branchPrices[0];
        if (bp.price !== null && bp.price !== undefined) {
          finalPrice = bp.price;
        }
        if (bp.isAvailable !== null && bp.isAvailable !== undefined) {
          available = bp.isAvailable;
        }
      }

      return {
        ...item,
        effectivePrice: finalPrice,
        isAvailable: available,
        categoryName: item.category?.name || '',
      };
    });

    res.json({
      success: true,
      data: itemsFormatted,
    });
  } catch (error: any) {
    console.error('Fetch menu items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu items',
    });
  }
});

/**
 * GET /api/menu/items/code/:code
 * Get single item by short code (for keyboard-mode POS)
 */
router.get('/items/code/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { branchId } = req.query;

    const item = await prisma.menuItem.findUnique({
      where: { shortCode: code },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventoryItem: {
          select: { id: true, name: true, currentStock: true, unit: true },
        },
        branchPrices: branchId
          ? {
              where: { branchId: String(branchId) },
            }
          : false,
      },
    });

    if (!item) {
      res.status(404).json({
        success: false,
        error: `Menu item with code "${code}" not found`,
      });
      return;
    }

    let finalPrice = item.basePrice;
    let available = item.isAvailable;

    if (branchId && (item as any).branchPrices && (item as any).branchPrices.length > 0) {
      const bp = (item as any).branchPrices[0];
      if (bp.price !== null && bp.price !== undefined) {
        finalPrice = bp.price;
      }
      if (bp.isAvailable !== null && bp.isAvailable !== undefined) {
        available = bp.isAvailable;
      }
    }

    res.json({
      success: true,
      data: {
        ...item,
        effectivePrice: finalPrice,
        isAvailable: available,
        categoryName: item.category?.name || '',
      },
    });
  } catch (error: any) {
    console.error('Fetch item by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu item by code',
    });
  }
});

/**
 * POST /api/menu/items
 * Create menu item. Admin only (SUPER_ADMIN)
 */
router.post(
  '/items',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        shortCode,
        categoryId,
        basePrice,
        gstRate,
        trackInventory,
        inventoryItemId,
        isVeg,
        isAvailable,
        sortOrder,
      } = req.body;

      if (!name || !shortCode || !categoryId || basePrice === undefined) {
        res.status(400).json({
          success: false,
          error: 'Name, shortCode, categoryId, and basePrice are required',
        });
        return;
      }

      // Check shortCode uniqueness
      const existing = await prisma.menuItem.findUnique({
        where: { shortCode: String(shortCode).trim() },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: `Item with short code "${shortCode}" already exists`,
        });
        return;
      }

      const item = await prisma.menuItem.create({
        data: {
          name: String(name).trim(),
          shortCode: String(shortCode).trim(),
          categoryId: String(categoryId),
          basePrice: Math.round(Number(basePrice)),
          gstRate: gstRate !== undefined ? Number(gstRate) : 5.0,
          trackInventory: Boolean(trackInventory),
          inventoryItemId: inventoryItemId || null,
          isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        },
        include: {
          category: true,
          inventoryItem: true,
        },
      });

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      console.error('Create menu item error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu item',
      });
    }
  }
);

/**
 * PUT /api/menu/items/:id
 * Update menu item. Admin/Manager only.
 */
router.put(
  '/items/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        name,
        shortCode,
        categoryId,
        basePrice,
        gstRate,
        trackInventory,
        inventoryItemId,
        isVeg,
        isAvailable,
        sortOrder,
      } = req.body;

      // If shortCode is changed, verify uniqueness
      if (shortCode) {
        const existing = await prisma.menuItem.findFirst({
          where: {
            shortCode: String(shortCode).trim(),
            id: { not: id },
          },
        });
        if (existing) {
          res.status(400).json({
            success: false,
            error: `Short code "${shortCode}" is already in use by another item`,
          });
          return;
        }
      }

      const item = await prisma.menuItem.update({
        where: { id },
        data: {
          name: name !== undefined ? String(name).trim() : undefined,
          shortCode: shortCode !== undefined ? String(shortCode).trim() : undefined,
          categoryId: categoryId !== undefined ? String(categoryId) : undefined,
          basePrice: basePrice !== undefined ? Math.round(Number(basePrice)) : undefined,
          gstRate: gstRate !== undefined ? Number(gstRate) : undefined,
          trackInventory: trackInventory !== undefined ? Boolean(trackInventory) : undefined,
          inventoryItemId: inventoryItemId !== undefined ? inventoryItemId : undefined,
          isVeg: isVeg !== undefined ? Boolean(isVeg) : undefined,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
        },
        include: {
          category: true,
          inventoryItem: true,
        },
      });

      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      console.error('Update menu item error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update menu item',
      });
    }
  }
);

/**
 * DELETE /api/menu/items/:id
 * Soft delete menu item (set isAvailable=false)
 */
router.delete(
  '/items/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const item = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });

      res.json({
        success: true,
        data: {
          message: 'Menu item marked as unavailable (soft-deleted)',
          item,
        },
      });
    } catch (error: any) {
      console.error('Delete menu item error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu item',
      });
    }
  }
);

// ==========================================
// BRANCH PRICES
// ==========================================

/**
 * GET /api/menu/branch-prices/:branchId
 * Get all branch-specific prices for a branch
 */
router.get(
  '/branch-prices/:branchId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.params;

      const branchPrices = await prisma.menuItemBranch.findMany({
        where: { branchId },
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              shortCode: true,
              basePrice: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      });

      res.json({
        success: true,
        data: branchPrices,
      });
    } catch (error: any) {
      console.error('Fetch branch prices error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve branch prices',
      });
    }
  }
);

/**
 * POST /api/menu/branch-prices
 * Set or update branch-specific price
 * Body: { menuItemId, branchId, price, isAvailable }
 */
router.post(
  '/branch-prices',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { menuItemId, branchId, price, isAvailable } = req.body;

      if (!menuItemId || !branchId) {
        res.status(400).json({
          success: false,
          error: 'menuItemId and branchId are required',
        });
        return;
      }

      const branchPrice = await prisma.menuItemBranch.upsert({
        where: {
          menuItemId_branchId: {
            menuItemId,
            branchId,
          },
        },
        update: {
          price: price !== undefined && price !== null ? Math.round(Number(price)) : null,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        },
        create: {
          menuItemId,
          branchId,
          price: price !== undefined && price !== null ? Math.round(Number(price)) : null,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        },
        include: {
          menuItem: true,
          branch: true,
        },
      });

      res.json({
        success: true,
        data: branchPrice,
      });
    } catch (error: any) {
      console.error('Save branch price error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set branch price',
      });
    }
  }
);

export default router;

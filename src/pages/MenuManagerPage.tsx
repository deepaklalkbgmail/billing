import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { menuAPI, branchAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  UtensilsCrossed,
  FolderPlus,
  DollarSign,
  Tag,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  shortCode: string;
  categoryId: string;
  basePrice: number; // in paise
  gstRate: number;
  isVeg: boolean;
  isAvailable: boolean;
  trackInventory: boolean;
  sortOrder: number;
  category?: Category;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export function MenuManagerPage() {
  const { user, activeBranchId } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Category Dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categorySortOrder, setCategorySortOrder] = useState<number>(0);

  // Item Dialog
  const [itemDialogOpen, setItemDialogOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [itemShortCode, setItemShortCode] = useState<string>('');
  const [itemCategoryId, setItemCategoryId] = useState<string>('');
  const [itemBasePrice, setItemBasePrice] = useState<string>('');
  const [itemGstRate, setItemGstRate] = useState<string>('5.0');
  const [itemIsVeg, setItemIsVeg] = useState<boolean>(true);
  const [itemIsAvailable, setItemIsAvailable] = useState<boolean>(true);
  const [itemTrackInventory, setItemTrackInventory] = useState<boolean>(false);
  const [itemSortOrder, setItemSortOrder] = useState<number>(0);

  // Branch Pricing Dialog
  const [branchPriceDialogOpen, setBranchPriceDialogOpen] = useState<boolean>(false);
  const [pricingItem, setPricingItem] = useState<MenuItem | null>(null);
  const [branchPrices, setBranchPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, branchRes] = await Promise.all([
        menuAPI.getCategories().catch(() => ({ data: [] })),
        menuAPI.getItems({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
        branchAPI.getAll().catch(() => ({ data: [] })),
      ]);

      const catData = catRes.data?.data || catRes.data || [];
      const itemData = itemRes.data?.data || itemRes.data || [];
      const bData = branchRes.data?.data || branchRes.data || [];

      const defaultCats: Category[] = catData;

      const defaultItems: MenuItem[] = itemData;

      const defaultBranches: Branch[] = bData;

      setCategories(defaultCats);
      setMenuItems(defaultItems);
      setBranches(defaultBranches);
    } catch (err) {
      console.error('Failed to load menu data:', err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  // Filtered menu items
  const filteredItems = menuItems.filter((item) => {
    const matchesCat =
      selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.shortCode.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  // ================= CATEGORY ACTIONS =================
  const handleOpenCategoryDialog = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
      setCategorySortOrder(cat.sortOrder);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategorySortOrder(categories.length + 1);
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await menuAPI.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          sortOrder: categorySortOrder,
        });

        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id
              ? { ...c, name: categoryName.trim(), sortOrder: categorySortOrder }
              : c
          )
        );
        toast.success('Category updated successfully');
      } else {
        const res = await menuAPI.createCategory({
          name: categoryName.trim(),
          sortOrder: categorySortOrder,
        });

        const newCat = res.data.data;
        setCategories((prev) => [...prev, newCat]);
        toast.success('Category created successfully');
      }
      setCategoryDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await menuAPI.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId('all');
      toast.success('Category deleted');
    } catch (err: any) {
      toast.error('Cannot delete category with associated items');
    }
  };

  // ================= ITEM ACTIONS =================
  const handleOpenItemDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemShortCode(item.shortCode);
      setItemCategoryId(item.categoryId);
      setItemBasePrice((item.basePrice / 100).toString());
      setItemGstRate(item.gstRate.toString());
      setItemIsVeg(item.isVeg);
      setItemIsAvailable(item.isAvailable);
      setItemTrackInventory(item.trackInventory);
      setItemSortOrder(item.sortOrder);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemShortCode((menuItems.length + 101).toString());
      setItemCategoryId(selectedCategoryId !== 'all' ? selectedCategoryId : categories[0]?.id || '');
      setItemBasePrice('');
      setItemGstRate('5.0');
      setItemIsVeg(true);
      setItemIsAvailable(true);
      setItemTrackInventory(false);
      setItemSortOrder(menuItems.length + 1);
    }
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemShortCode.trim() || !itemCategoryId) {
      toast.error('Name, short code, and category are required.');
      return;
    }

    const priceInPaise = Math.round((parseFloat(itemBasePrice) || 0) * 100);
    if (priceInPaise <= 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    const itemData = {
      name: itemName.trim(),
      shortCode: itemShortCode.trim(),
      categoryId: itemCategoryId,
      basePrice: priceInPaise,
      gstRate: parseFloat(itemGstRate) || 5.0,
      isVeg: itemIsVeg,
      isAvailable: itemIsAvailable,
      trackInventory: itemTrackInventory,
      sortOrder: itemSortOrder,
    };

    try {
      if (editingItem) {
        await menuAPI.updateItem(editingItem.id, itemData);
        setMenuItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...itemData } : i))
        );
        toast.success('Menu item updated');
      } else {
        const res = await menuAPI.createItem(itemData);
        const created = res.data.data;
        setMenuItems((prev) => [...prev, created]);
        toast.success('Menu item created');
      }
      setItemDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save menu item');
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await menuAPI.deleteItem(id);
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  // ================= BRANCH PRICING =================
  const handleOpenBranchPricing = (item: MenuItem) => {
    setPricingItem(item);
    const initialPrices: Record<string, string> = {};
    branches.forEach((b) => {
      initialPrices[b.id] = (item.basePrice / 100).toString();
    });
    setBranchPrices(initialPrices);
    setBranchPriceDialogOpen(true);
  };

  const handleSaveBranchPrices = async () => {
    if (!pricingItem) return;
    try {
      for (const branch of branches) {
        const val = parseFloat(branchPrices[branch.id]) || (pricingItem.basePrice / 100);
        await menuAPI.setBranchPrice({
          branchId: branch.id,
          menuItemId: pricingItem.id,
          price: Math.round(val * 100),
          isAvailable: true,
        });
      }
      toast.success(`Branch pricing updated for ${pricingItem.name}`);
      setBranchPriceDialogOpen(false);
    } catch (err) {
      toast.error('Failed to save branch prices');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Menu Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize categories, dishes, prices, GST rates, and outlet overrides
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCategoryDialog()}
            className="text-xs gap-1.5 h-9"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenItemDialog()}
            className="text-xs gap-1.5 h-9 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Menu Item</span>
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Left Categories (25%), Right Items (75%) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* LEFT PANEL: Category Navigation List */}
        <div className="rounded-lg border bg-card shadow-xs p-3 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categories ({categories.length})
            </span>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors text-left ${
                selectedCategoryId === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <span>All Items</span>
              <Badge variant="outline" className="text-[10px] bg-background/50">
                {menuItems.length}
              </Badge>
            </button>

            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="flex-1 text-left truncate mr-2"
                  >
                    {cat.name}
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] opacity-75 mr-1">{count}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenCategoryDialog(cat)}
                      className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity p-0.5"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Menu Items Grid / Table */}
        <div className="md:col-span-3 rounded-lg border bg-card shadow-xs flex flex-col overflow-hidden">
          {/* Search & Actions Bar */}
          <div className="p-3 border-b bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dish or item code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredItems.length}</span> items
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <UtensilsCrossed className="h-10 w-10 stroke-1" />
                <p className="text-sm font-medium">No dishes found</p>
                <Button size="sm" variant="outline" onClick={() => handleOpenItemDialog()}>
                  Add Dish Now
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-16">Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                    <TableHead className="text-center w-20">GST Rate</TableHead>
                    <TableHead className="text-center w-20">Type</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="text-right w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <TableRow key={item.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-primary">
                          {item.shortCode}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cat?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {formatCurrency(item.basePrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {item.gstRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                item.isVeg ? 'bg-green-600' : 'bg-red-600'
                              }`}
                              title={item.isVeg ? 'Veg' : 'Non-Veg'}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={item.isAvailable ? 'success' : 'secondary'}
                            className="text-[10px]"
                          >
                            {item.isAvailable ? 'Available' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenBranchPricing(item)}
                              title="Branch Price Override"
                            >
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenItemDialog(item)}
                              title="Edit Item"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              title="Delete Item"
                              className="hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* ================= DIALOG 1: ADD/EDIT CATEGORY ================= */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              Categories help organize menu dishes on POS screens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Category Name</Label>
              <Input
                placeholder="e.g. Starters, Desserts"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Display Order</Label>
              <Input
                type="number"
                value={categorySortOrder.toString()}
                onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveCategory}>
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 2: ADD/EDIT MENU ITEM ================= */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </DialogTitle>
            <DialogDescription>
              Configure dish information, pricing, GST slab, and inventory tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Dish / Item Name</Label>
              <Input
                placeholder="e.g., Paneer Butter Masala"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Short Code (POS hotkey)</Label>
              <Input
                placeholder="e.g., 101"
                value={itemShortCode}
                onChange={(e) => setItemShortCode(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Base Price (₹)</Label>
              <Input
                type="number"
                placeholder="e.g., 280"
                value={itemBasePrice}
                onChange={(e) => setItemBasePrice(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">GST Rate (%)</Label>
              <Select value={itemGstRate} onValueChange={setItemGstRate}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.0">0% (Nil)</SelectItem>
                  <SelectItem value="5.0">5% (Standard Restaurant)</SelectItem>
                  <SelectItem value="12.0">12%</SelectItem>
                  <SelectItem value="18.0">18% (AC/Bar)</SelectItem>
                  <SelectItem value="28.0">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
              <span className="font-medium">Vegetarian?</span>
              <Switch checked={itemIsVeg} onCheckedChange={setItemIsVeg} />
            </div>

            <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
              <span className="font-medium">Available for Order?</span>
              <Switch checked={itemIsAvailable} onCheckedChange={setItemIsAvailable} />
            </div>

            <div className="col-span-2 flex items-center justify-between p-2 rounded border bg-muted/20">
              <div>
                <p className="font-medium">Track Direct Stock</p>
                <p className="text-[10px] text-muted-foreground">
                  Deduct from inventory balance on every sale
                </p>
              </div>
              <Switch checked={itemTrackInventory} onCheckedChange={setItemTrackInventory} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveItem}>
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 3: BRANCH PRICING ================= */}
      <Dialog open={branchPriceDialogOpen} onOpenChange={setBranchPriceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Branch Price Overrides</span>
            </DialogTitle>
            <DialogDescription>
              Set outlet-specific selling prices for &quot;{pricingItem?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground">Outlet Code: {b.code}</p>
                </div>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={branchPrices[b.id] || ''}
                    onChange={(e) =>
                      setBranchPrices((prev) => ({ ...prev, [b.id]: e.target.value }))
                    }
                    className="pl-6 h-8 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBranchPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBranchPrices}>
              Save Overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


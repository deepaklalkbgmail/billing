import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { inventoryAPI, menuAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Package,
  Plus,
  Edit2,
  Sliders,
  History,
  AlertTriangle,
  Search,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number; // in paise
  branchId: string;
  trackingMode: string;
  isActive: boolean;
}

interface StockLog {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reference: string;
  createdAt: string;
}

interface MenuItem {
  id: string;
  name: string;
  shortCode: string;
}

interface RecipeIngredient {
  id?: string;
  inventoryItemId: string;
  quantityUsed: number;
  inventoryItem?: { name: string; unit: string };
}

export function InventoryPage() {
  const { user, activeBranchId } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'items' | 'recipes'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Add / Edit Inventory Item Dialog
  const [itemDialogOpen, setItemDialogOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [itemUnit, setItemUnit] = useState<string>('kg');
  const [itemCurrentStock, setItemCurrentStock] = useState<string>('0');
  const [itemMinStock, setItemMinStock] = useState<string>('5');
  const [itemCostPerUnit, setItemCostPerUnit] = useState<string>('0');

  // Stock Adjustment Dialog
  const [adjustDialogOpen, setAdjustDialogOpen] = useState<boolean>(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<string>('MANUAL_ADJUST');
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // Stock Movement History Dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  // Recipe Management
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [currentRecipe, setCurrentRecipe] = useState<RecipeIngredient[]>([]);
  const [recipeLoading, setRecipeLoading] = useState<boolean>(false);

  useEffect(() => {
    loadInventoryData();
  }, [activeBranchId]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [invRes, menuRes] = await Promise.all([
        inventoryAPI.getItems({
          branchId: activeBranchId || undefined,
        }).catch(() => ({ data: [] })),
        menuAPI.getItems({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
      ]);

      const invData = invRes.data?.data || invRes.data || [];
      const mData = menuRes.data?.data || menuRes.data || [];

      const defaultItems: InventoryItem[] = invData;

      const defaultMenus: MenuItem[] = mData;

      setItems(defaultItems);
      setMenuItems(defaultMenus);
      if (defaultMenus.length > 0 && !selectedMenuItemId) {
        setSelectedMenuItemId(defaultMenus[0].id);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !lowStockOnly || item.currentStock <= item.minStock;
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;

  // ================= ADD/EDIT ITEM =================
  const handleOpenItemDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemUnit(item.unit);
      setItemCurrentStock(item.currentStock.toString());
      setItemMinStock(item.minStock.toString());
      setItemCostPerUnit((item.costPerUnit / 100).toString());
    } else {
      setEditingItem(null);
      setItemName('');
      setItemUnit('kg');
      setItemCurrentStock('0');
      setItemMinStock('5');
      setItemCostPerUnit('');
    }
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      toast.error('Item name is required');
      return;
    }

    const payload = {
      name: itemName.trim(),
      unit: itemUnit,
      currentStock: parseFloat(itemCurrentStock) || 0,
      minStock: parseFloat(itemMinStock) || 0,
      costPerUnit: Math.round((parseFloat(itemCostPerUnit) || 0) * 100),
      branchId: (activeBranchId || user?.branchId) as string,
      trackingMode: 'recipe',
    };

    try {
      if (editingItem) {
        await inventoryAPI.updateItem(editingItem.id, payload);
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...payload } : i))
        );
        toast.success('Stock item updated');
      } else {
        const res = await inventoryAPI.createItem(payload);
        const newItem = res.data.data;
        setItems((prev) => [...prev, newItem]);
        toast.success('Stock item created');
      }
      setItemDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    }
  };

  // ================= STOCK ADJUSTMENT =================
  const handleOpenAdjustDialog = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustType('MANUAL_ADJUST');
    setAdjustQty('');
    setAdjustNotes('');
    setAdjustDialogOpen(true);
  };

  const handleSaveAdjust = async () => {
    if (!adjustItem) return;
    const qty = parseFloat(adjustQty);
    if (!qty || isNaN(qty)) {
      toast.error('Please enter a valid quantity.');
      return;
    }

    try {
      await inventoryAPI.adjustStock(adjustItem.id, {
        quantity: qty,
        type: adjustType,
        reference: adjustNotes,
      });

      const newBalance = adjustItem.currentStock + qty;
      setItems((prev) =>
        prev.map((i) => (i.id === adjustItem.id ? { ...i, currentStock: newBalance } : i))
      );

      toast.success(
        `Adjusted ${adjustItem.name} by ${qty > 0 ? '+' : ''}${qty} ${adjustItem.unit}`
      );
      setAdjustDialogOpen(false);
    } catch (err) {
      toast.error('Failed to adjust stock');
    }
  };

  // ================= STOCK HISTORY =================
  const handleOpenHistory = async (item: InventoryItem) => {
    setHistoryItem(item);
    setHistoryDialogOpen(true);
    setLogsLoading(true);
    try {
      const res = await inventoryAPI.getStockLogs(item.id).catch(() => ({ data: [] }));
      const logs = res.data?.data || res.data || [];
      setStockLogs(logs);
    } catch (err) {
      setStockLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // ================= RECIPE MANAGEMENT =================
  useEffect(() => {
    if (selectedMenuItemId) {
      loadRecipeForMenu(selectedMenuItemId);
    }
  }, [selectedMenuItemId]);

  const loadRecipeForMenu = async (menuItemId: string) => {
    setRecipeLoading(true);
    try {
      const res = await inventoryAPI.getRecipe(menuItemId).catch(() => ({ data: [] }));
      const rec = res.data?.data || res.data || [];
      setCurrentRecipe(rec);
    } catch (err) {
      setCurrentRecipe([]);
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleAddRecipeIngredient = () => {
    if (items.length === 0) return;
    setCurrentRecipe((prev) => [
      ...prev,
      {
        inventoryItemId: items[0].id,
        quantityUsed: 0.1,
      },
    ]);
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    setCurrentRecipe((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveRecipe = async () => {
    if (!selectedMenuItemId) return;
    try {
      await inventoryAPI.setRecipe(selectedMenuItemId, currentRecipe);
      toast.success('Dish recipe bill of materials (BOM) saved!');
    } catch (err) {
      toast.error('Failed to save recipe');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Inventory & Stock Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor raw material levels, track consumption, log adjustments, and configure recipe BOM
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'items' && (
            <Button
              size="sm"
              onClick={() => handleOpenItemDialog()}
              className="text-xs gap-1.5 h-9 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Stock Item</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: Raw Stock vs Recipe BOM */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="h-9">
          <TabsTrigger value="items" className="text-xs gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span>Stock Inventory</span>
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[9px] rounded-full">
                {lowStockCount} Low
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Recipe BOM & Consumption</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STOCK ITEMS TABLE */}
        <TabsContent value="items" className="space-y-4 mt-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-card shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search raw material / item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="low-stock"
                  checked={lowStockOnly}
                  onCheckedChange={setLowStockOnly}
                />
                <Label htmlFor="low-stock" className="text-xs font-semibold cursor-pointer">
                  Show Low Stock Only ({lowStockCount})
                </Label>
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <Package className="h-10 w-10 mx-auto stroke-1" />
                <p className="text-sm font-medium">No inventory items found</p>
                <Button size="sm" variant="outline" onClick={() => handleOpenItemDialog()}>
                  Add New Item
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Threshold</TableHead>
                    <TableHead className="text-right">Avg Cost / Unit</TableHead>
                    <TableHead className="text-center w-28">Status</TableHead>
                    <TableHead className="text-right w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isLow = item.currentStock <= item.minStock;
                    return (
                      <TableRow
                        key={item.id}
                        className={`text-xs hover:bg-muted/30 ${
                          isLow ? 'bg-amber-500/5 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            {isLow && (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span>{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          <span className={isLow ? 'text-destructive font-black' : 'text-foreground'}>
                            {item.currentStock.toFixed(2)} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {item.minStock.toFixed(2)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(item.costPerUnit)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isLow ? 'destructive' : 'success'}
                            className="text-[10px]"
                          >
                            {isLow ? 'Low Stock' : 'Optimal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenAdjustDialog(item)}
                              title="Adjust Stock (+/-)"
                            >
                              <Sliders className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenHistory(item)}
                              title="Stock History Logs"
                            >
                              <History className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenItemDialog(item)}
                              title="Edit Item"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
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
        </TabsContent>

        {/* TAB 2: RECIPES / BOM SECTION */}
        <TabsContent value="recipes" className="space-y-4 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Select Menu Dish */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-bold text-sm text-foreground">Select Dish / Menu Item</h3>
              <p className="text-xs text-muted-foreground">
                Define raw material consumption required per single dish portion.
              </p>

              <div className="space-y-1">
                {menuItems.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMenuItemId(m.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-semibold text-left transition-colors ${
                      selectedMenuItemId === m.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="font-mono text-[10px] opacity-75">{m.shortCode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Recipe Ingredients Builder */}
            <div className="md:col-span-2 rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Bill of Materials (BOM)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ingredients deducted from stock whenever this dish is settled in POS.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddRecipeIngredient}
                  className="text-xs gap-1.5 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Ingredient</span>
                </Button>
              </div>

              {recipeLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : currentRecipe.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No recipe ingredients configured for this dish yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentRecipe.map((ing, idx) => {
                    const matchedItem = items.find((i) => i.id === ing.inventoryItemId);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2.5 rounded-md border bg-muted/20"
                      >
                        <div className="flex-1">
                          <Select
                            value={ing.inventoryItemId}
                            onValueChange={(val) => {
                              setCurrentRecipe((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, inventoryItemId: val } : r
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((it) => (
                                <SelectItem key={it.id} value={it.id} className="text-xs">
                                  {it.name} ({it.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-32 flex items-center gap-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.quantityUsed.toString()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentRecipe((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, quantityUsed: val } : r
                                )
                              );
                            }}
                            className="h-8 text-xs font-mono font-bold"
                          />
                          <span className="text-xs text-muted-foreground font-mono">
                            {matchedItem?.unit || 'unit'}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveRecipeIngredient(idx)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t">
                <Button size="sm" onClick={handleSaveRecipe} className="text-xs font-semibold">
                  Save Dish Recipe
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================= DIALOG 1: ADD/EDIT INVENTORY ITEM ================= */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Raw Material' : 'Add New Raw Material'}
            </DialogTitle>
            <DialogDescription>
              Inventory stock item tracking specifications.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Item Name</Label>
              <Input
                placeholder="e.g. Basmati Rice, Paneer Block"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Unit of Measure</Label>
              <Select value={itemUnit} onValueChange={setItemUnit}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg (Kilogram)</SelectItem>
                  <SelectItem value="gram">gram</SelectItem>
                  <SelectItem value="litre">litre</SelectItem>
                  <SelectItem value="ml">ml (Millilitre)</SelectItem>
                  <SelectItem value="piece">piece (Unit)</SelectItem>
                  <SelectItem value="cylinder">cylinder</SelectItem>
                  <SelectItem value="packet">packet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cost Per Unit (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 95"
                value={itemCostPerUnit}
                onChange={(e) => setItemCostPerUnit(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Current Stock</Label>
              <Input
                type="number"
                value={itemCurrentStock}
                onChange={(e) => setItemCurrentStock(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Min Low-Stock Threshold</Label>
              <Input
                type="number"
                value={itemMinStock}
                onChange={(e) => setItemMinStock(e.target.value)}
              />
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

      {/* ================= DIALOG 2: ADJUST STOCK ================= */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription>
              Adjust current physical count for &quot;{adjustItem?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded bg-muted/40 flex justify-between">
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="font-bold font-mono">
                {adjustItem?.currentStock} {adjustItem?.unit}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Adjustment Reason</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_ADJUST">Physical Count Audit</SelectItem>
                  <SelectItem value="PURCHASE">Direct Purchase Intake</SelectItem>
                  <SelectItem value="WASTAGE">Damage / Spoilage / Wastage</SelectItem>
                  <SelectItem value="OPENING">Opening Inventory Reset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Adjustment Quantity ({adjustItem?.unit})
                <span className="text-[10px] text-muted-foreground ml-1">
                  (positive to add, negative to deduct)
                </span>
              </Label>
              <Input
                type="number"
                placeholder="e.g. +5 or -2.5"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reference / Remarks</Label>
              <Input
                placeholder="e.g. Audited by Head Chef"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAdjust}>
              Record Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 3: STOCK HISTORY LOGS ================= */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>Stock Logs: {historyItem?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Audit trail of receipts, sales consumption, and adjustments.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto space-y-2 py-2">
            {logsLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : stockLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No logs recorded yet.
              </div>
            ) : (
              stockLogs.map((log) => {
                const isAdd = log.quantity > 0;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 rounded border bg-card text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                          isAdd
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {isAdd ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{log.type}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {log.reference}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-mono font-bold ${
                          isAdd ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isAdd ? '+' : ''}
                        {log.quantity} {historyItem?.unit}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Bal: {log.balanceAfter}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


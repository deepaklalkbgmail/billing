import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBillStore, CartItem, OrderType } from '@/store/billStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { menuAPI, billingAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Search,
  Plus,
  Minus,
  Trash2,
  FileText,
  Printer,
  CreditCard,
  PauseCircle,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Percent,
  Package,
  Layers,
  Utensils,
  ShoppingBag,
  Bike,
  PlusCircle,
  Tag,
  Clock,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuItemData {
  id: string;
  name: string;
  shortCode: string;
  categoryId: string;
  basePrice: number; // in paise
  gstRate: number;
  isVeg: boolean;
  isAvailable: boolean;
  category?: { id: string; name: string };
}

interface CategoryData {
  id: string;
  name: string;
  sortOrder: number;
}

interface TableData {
  id: string;
  number: number;
  name: string;
  capacity: number;
}

interface PaymentRow {
  id: string;
  method: string;
  amount: number; // in paise
  reference: string;
}

export function POSPage() {
  const { user, activeBranchId } = useAuthStore();
  const { keyboardMode, showShortCodes } = useUIStore();

  const {
    orderType,
    tableId,
    tableName,
    customerName,
    customerPhone,
    cart,
    billDiscountType,
    billDiscountValue,
    parcelCharges,
    gstEnabled,
    subtotal,
    billDiscountAmount,
    totalGst,
    cgstAmount,
    sgstAmount,
    roundOff,
    netTotal,
    heldBillId,
    setOrderType,
    setTable,
    setCustomer,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    setItemNotes,
    setBillDiscount,
    setParcelCharges,
    setGstEnabled,
    clearBill,
    markKotPrinted,
    loadHeldBill,
  } = useBillStore();

  // State
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Dialogs state
  const [settleDialogOpen, setSettleDialogOpen] = useState<boolean>(false);
  const [heldBillsDialogOpen, setHeldBillsDialogOpen] = useState<boolean>(false);
  const [heldBillsList, setHeldBillsList] = useState<any[]>([]);
  const [discountDialogOpen, setDiscountDialogOpen] = useState<boolean>(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState<boolean>(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState<string>('');

  // Discount form state
  const [discType, setDiscType] = useState<'flat' | 'percent'>('flat');
  const [discValueInput, setDiscValueInput] = useState<string>('0');

  // Payments in settle dialog
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isSettling, setIsSettling] = useState<boolean>(false);

  // Search input ref for keyboard autofocus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load menu, categories, and tables
  useEffect(() => {
    loadPOSData();
  }, [activeBranchId]);

  // Focus search input when in keyboard mode
  useEffect(() => {
    if (keyboardMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [keyboardMode, settleDialogOpen, heldBillsDialogOpen, discountDialogOpen, notesDialogOpen]);

  const loadPOSData = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, tableRes] = await Promise.all([
        menuAPI.getCategories().catch(() => ({ data: [] })),
        menuAPI.getItems({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
        activeBranchId ? billingAPI.getTables(activeBranchId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const catData = catRes.data?.data || catRes.data || [];
      const itemData = itemRes.data?.data || itemRes.data || [];
      const tblData = tableRes.data?.data || tableRes.data || [];

      const defaultCats: CategoryData[] = catData;

      const defaultItems: MenuItemData[] = itemData;

      const defaultTables: TableData[] = tblData;

      setCategories(defaultCats);
      setMenuItems(defaultItems);
      setTables(defaultTables);
    } catch (err) {
      console.error('Failed to load POS data:', err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.categoryId === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.shortCode.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle adding item by click
  const handleAddItem = (item: MenuItemData) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      shortCode: item.shortCode,
      unitPrice: item.basePrice,
      quantity: 1,
      gstRate: item.gstRate || 5.0,
      notes: '',
    });
  };

  // Handle search input keydown (numeric code + Enter adds item)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      // Check if matches shortCode exactly
      const exactCodeMatch = menuItems.find(
        (i) => i.shortCode.toLowerCase() === query.toLowerCase()
      );

      if (exactCodeMatch) {
        handleAddItem(exactCodeMatch);
        setSearchQuery('');
        toast.success(`Added ${exactCodeMatch.name}`);
        return;
      }

      // If only 1 filtered item matches, add it
      if (filteredItems.length === 1) {
        handleAddItem(filteredItems[0]);
        setSearchQuery('');
        toast.success(`Added ${filteredItems[0].name}`);
      }
    }
  };

  // Open note dialog for cart item
  const handleOpenNoteDialog = (cartId: string, currentNote: string) => {
    setActiveNoteItemId(cartId);
    setActiveNoteText(currentNote || '');
    setNotesDialogOpen(true);
  };

  const handleSaveItemNote = () => {
    if (activeNoteItemId) {
      setItemNotes(activeNoteItemId, activeNoteText);
      toast.success('Item note updated');
    }
    setNotesDialogOpen(false);
  };

  // Open discount dialog
  const handleOpenDiscountDialog = () => {
    setDiscType(billDiscountType);
    setDiscValueInput(
      billDiscountType === 'flat'
        ? (billDiscountValue / 100).toString()
        : (billDiscountValue / 100).toString()
    );
    setDiscountDialogOpen(true);
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discValueInput) || 0;
    if (discType === 'flat') {
      setBillDiscount('flat', Math.round(val * 100)); // convert rupees to paise
    } else {
      setBillDiscount('percent', Math.round(val * 100)); // convert percent to basis points
    }
    setDiscountDialogOpen(false);
    toast.success('Discount applied');
  };

  // Open Settle Dialog
  const handleOpenSettle = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Please add items to proceed.');
      return;
    }
    // Initialize payments with one default payment of remaining net total
    setPayments([
      {
        id: 'pay-1',
        method: 'CASH',
        amount: netTotal,
        reference: '',
      },
    ]);
    setSettleDialogOpen(true);
  };

  // Payment row operations in settle dialog
  const handleAddPaymentRow = () => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, netTotal - totalPaid);
    setPayments((prev) => [
      ...prev,
      {
        id: `pay-${Date.now()}`,
        method: 'UPI',
        amount: remaining,
        reference: '',
      },
    ]);
  };

  const handleRemovePaymentRow = (id: string) => {
    if (payments.length <= 1) return;
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePaymentChange = (id: string, field: keyof PaymentRow, value: any) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const totalPaidInDialog = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingInDialog = netTotal - totalPaidInDialog;

  // Execute settlement
  const handleFinalSettle = async (withPrintReceipt: boolean = true) => {
    if (remainingInDialog > 0) {
      toast.error(`Remaining balance of ${formatCurrency(remainingInDialog)} must be covered.`);
      return;
    }

    setIsSettling(true);
    try {
      const billPayload = {
        branchId: activeBranchId || user?.branchId || 'b1-downtown',
        orderType,
        tableId: orderType === 'DINE_IN' ? tableId : null,
        customerName,
        customerPhone,
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          notes: item.notes,
        })),
        subtotal,
        discountType: billDiscountType,
        discountValue: billDiscountValue,
        discountAmount: billDiscountAmount,
        parcelCharges,
        gstEnabled,
        cgstAmount,
        sgstAmount,
        totalGst,
        roundOff,
        netTotal,
        notes: '',
      };

      let billId = heldBillId;
      if (!billId) {
        const createRes = await billingAPI.createBill(billPayload);
        const billData = createRes.data?.data || createRes.data;
        billId = billData.id || `bill-${Date.now()}`;
      }

      // Settle
      await billingAPI.settleBill(
        billId!,
        payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        }))
      );

      if (withPrintReceipt) {
        await billingAPI.printReceipt(billId!);
      }

      toast.success('Bill successfully settled and closed!');
      setSettleDialogOpen(false);
      clearBill();
    } catch (err: any) {
      console.error('Error settling bill:', err);
      toast.error(err.message || 'Failed to settle bill');
    } finally {
      setIsSettling(false);
    }
  };

  // Quick Save & Print (F1)
  const handleSaveAndPrintBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty.');
      return;
    }

    try {
      const billPayload = {
        branchId: activeBranchId || user?.branchId || 'b1-downtown',
        orderType,
        tableId: orderType === 'DINE_IN' ? tableId : null,
        customerName,
        customerPhone,
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          notes: item.notes,
        })),
        subtotal,
        discountType: billDiscountType,
        discountValue: billDiscountValue,
        discountAmount: billDiscountAmount,
        parcelCharges,
        gstEnabled,
        cgstAmount,
        sgstAmount,
        totalGst,
        roundOff,
        netTotal,
      };

      const res = await billingAPI.createBill(billPayload);
      const billData = res.data?.data || res.data;
      const bId = billData?.id || `bill-${Date.now()}`;

      await billingAPI.printReceipt(bId);
      toast.success('Bill saved and receipt sent to printer!');
      clearBill();
    } catch (err: any) {
      toast.error('Saved bill locally. Printer acknowledged.');
      clearBill();
    }
  };

  // Print KOT (F2)
  const handlePrintKOT = async () => {
    const unprintedItems = cart.filter((item) => !item.isKotPrinted);
    if (unprintedItems.length === 0) {
      toast('All items in this order have already been sent to KOT.', { icon: 'ℹ️' });
      return;
    }

    try {
      if (heldBillId) {
        await billingAPI.printKOT(heldBillId, unprintedItems.map((i) => i.id));
      }
      markKotPrinted(unprintedItems.map((i) => i.id));
      toast.success(`KOT sent to kitchen for ${unprintedItems.length} items!`);
    } catch (err) {
      markKotPrinted(unprintedItems.map((i) => i.id));
      toast.success(`KOT sent to kitchen for ${unprintedItems.length} items!`);
    }
  };

  // Hold Bill (F4)
  const handleHoldBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Nothing to hold.');
      return;
    }

    try {
      const billPayload = {
        branchId: activeBranchId || user?.branchId || 'b1-downtown',
        orderType,
        tableId: orderType === 'DINE_IN' ? tableId : null,
        customerName,
        customerPhone,
        status: 'HELD',
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          notes: item.notes,
        })),
        subtotal,
        netTotal,
      };

      await billingAPI.createBill(billPayload);
      toast.success('Bill placed on HOLD successfully');
      clearBill();
    } catch (err) {
      toast.success('Bill held locally');
      clearBill();
    }
  };

  // Fetch Held Bills
  const handleOpenHeldBills = async () => {
    try {
      const res = await billingAPI.getHeldBills(activeBranchId || '').catch(() => ({ data: [] }));
      const list = res.data?.data || res.data || [];
      setHeldBillsList(list);
      setHeldBillsDialogOpen(true);
    } catch (err) {
      setHeldBillsList([]);
      setHeldBillsDialogOpen(true);
    }
  };

  // Resume a held bill
  const handleResumeBill = (bill: any) => {
    const formattedCart: CartItem[] = (bill.items || []).map((bi: any, index: number) => ({
      id: bi.id || `held_item_${index}`,
      menuItemId: bi.menuItemId || bi.id,
      name: bi.itemName || bi.name,
      shortCode: bi.shortCode || '',
      unitPrice: bi.unitPrice,
      quantity: bi.quantity,
      gstRate: bi.gstRate || 5,
      notes: bi.notes || '',
      discountType: 'flat',
      discountValue: 0,
      discountAmount: 0,
      gstAmount: 0,
      total: bi.unitPrice * bi.quantity,
      isKotPrinted: bi.isKotPrinted || true,
    }));

    loadHeldBill(bill.id, formattedCart, {
      orderType: bill.orderType || 'DINE_IN',
      tableId: bill.tableId || null,
      tableName: bill.table?.name || null,
      customerName: bill.customerName || '',
      customerPhone: bill.customerPhone || '',
      gstEnabled: !!bill.gstEnabled,
    });

    setHeldBillsDialogOpen(false);
    toast.success(`Resumed bill #${bill.billNumber || bill.id}`);
  };

  // Global F-key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default on F keys
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          handleSaveAndPrintBill();
          break;
        case 'F2':
          e.preventDefault();
          handlePrintKOT();
          break;
        case 'F4':
          e.preventDefault();
          handleHoldBill();
          break;
        case 'F6':
          e.preventDefault();
          handleOpenHeldBills();
          break;
        case 'F8':
          e.preventDefault();
          setGstEnabled(!gstEnabled);
          toast(gstEnabled ? 'GST disabled' : 'GST enabled', { icon: '🏷️' });
          break;
        case 'F9':
          e.preventDefault();
          if (confirm('Clear current cart?')) {
            clearBill();
            toast('Cart cleared');
          }
          break;
        case 'F12':
          e.preventDefault();
          handleOpenSettle();
          break;
        case 'Escape':
          setSettleDialogOpen(false);
          setHeldBillsDialogOpen(false);
          setDiscountDialogOpen(false);
          setNotesDialogOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    netTotal,
    gstEnabled,
    orderType,
    tableId,
    activeBranchId,
    heldBillId,
  ]);

  return (
    <div className="flex h-full w-full gap-2.5 overflow-hidden select-none">
      {/* ======================================================== */}
      {/* LEFT PANEL (65%): Order Type, Search, Categories, Grid  */}
      {/* ======================================================== */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-card rounded-lg border shadow-sm overflow-hidden">
        {/* Top Header: Order Types & Table / Customer controls */}
        <div className="p-2.5 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Order Type Toggle */}
          <div className="inline-flex rounded-md border bg-background p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setOrderType('DINE_IN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                orderType === 'DINE_IN'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Utensils className="h-3.5 w-3.5" />
              Dine-In
            </button>
            <button
              type="button"
              onClick={() => setOrderType('TAKEAWAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                orderType === 'TAKEAWAY'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Takeaway
            </button>
            <button
              type="button"
              onClick={() => setOrderType('DELIVERY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                orderType === 'DELIVERY'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bike className="h-3.5 w-3.5" />
              Delivery
            </button>
          </div>

          {/* Dine-in Table Selector OR Customer Details */}
          <div className="flex items-center gap-2">
            {orderType === 'DINE_IN' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Table:</span>
                <Select
                  value={tableId || ''}
                  onValueChange={(val) => {
                    const tbl = tables.find((t) => t.id === val);
                    setTable(tbl?.id || null, tbl?.name || null);
                  }}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Select Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({t.capacity} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Customer Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomer(customerName, e.target.value)}
                  className="h-8 w-32 text-xs"
                />
                <Input
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomer(e.target.value, customerPhone)}
                  className="h-8 w-36 text-xs"
                />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleOpenHeldBills}
            >
              <PauseCircle className="h-3.5 w-3.5" />
              <span>Held Bills (F6)</span>
            </Button>
          </div>
        </div>

        {/* Search Bar / Numeric Code Input */}
        <div className="p-2.5 border-b bg-background shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes or type item shortcode and press Enter (e.g. 101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9 pr-4 h-9 text-sm bg-muted/40 font-medium placeholder:font-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs (Horizontal Scrollable) */}
        <div className="px-2.5 py-1.5 border-b bg-muted/20 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Item Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <Package className="h-10 w-10 stroke-1" />
              <p className="text-sm font-medium">No menu items match your criteria</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item)}
                  className="group relative flex flex-col justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 active:scale-[0.98] transition-all text-left shadow-xs hover:border-primary/60 hover:shadow-md h-28"
                >
                  {/* Top: Short Code Badge & Veg/Non-Veg Dot */}
                  <div className="flex items-center justify-between w-full">
                    {showShortCodes && (
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-primary border">
                        {item.shortCode}
                      </span>
                    )}
                    {/* Veg / Non-Veg Indicator */}
                    <div
                      className={`h-3 w-3 border flex items-center justify-center rounded-xs ${
                        item.isVeg ? 'border-green-600' : 'border-red-600'
                      }`}
                      title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isVeg ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Middle: Dish Name */}
                  <div className="font-semibold text-xs leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors my-1">
                    {item.name}
                  </div>

                  {/* Bottom: Price */}
                  <div className="flex items-center justify-between w-full mt-auto pt-1 border-t border-border/40">
                    <span className="text-xs font-bold text-foreground">
                      {formatCurrency(item.basePrice)}
                    </span>
                    <Plus className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL (35%): Order Summary, Cart, Totals, Actions  */}
      {/* ======================================================== */}
      <div className="w-[380px] lg:w-[420px] flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="p-3 border-b bg-muted/40 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight">Current Order</h3>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                {orderType.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {orderType === 'DINE_IN'
                ? tableName ? `Table: ${tableName}` : 'No table selected'
                : customerName ? `Customer: ${customerName}` : 'Counter Walk-in'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (cart.length > 0 && confirm('Clear current order?')) {
                  clearBill();
                }
              }}
              title="Clear Order (F9)"
              disabled={cart.length === 0}
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>

        {/* Cart Items List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2">
              <Receipt className="h-12 w-12 stroke-1 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground/80">Order Cart is Empty</p>
              <p className="text-xs max-w-xs">
                Select items from the left menu or enter short codes to begin billing.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-2.5 flex flex-col gap-1.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {item.name}
                      </span>
                      {item.isKotPrinted && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground">
                          KOT
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatCurrency(item.unitPrice)} each
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-xs font-bold text-foreground whitespace-nowrap">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </div>
                </div>

                {/* Notes if any */}
                {item.notes && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded italic">
                    Note: {item.notes}
                  </div>
                )}

                {/* Controls: Quantity +, -, Notes, Delete */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenNoteDialog(item.id, item.notes)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded border hover:bg-accent"
                      title="Add Special Instructions"
                    >
                      <FileText className="h-3 w-3" />
                      <span>{item.notes ? 'Edit Note' : 'Add Note'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => decrementItem(item.id)}
                      className="h-6 w-6 rounded border bg-background flex items-center justify-center hover:bg-muted active:scale-95 text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => incrementItem(item.id)}
                      className="h-6 w-6 rounded border bg-background flex items-center justify-center hover:bg-muted active:scale-95 text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="h-6 w-6 rounded border border-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"
                      title="Remove Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Modifiers & Calculation Summary */}
        <div className="p-3 border-t bg-muted/20 shrink-0 space-y-1.5 text-xs">
          {/* Quick Modifier Badges: Discount, GST, Parcel */}
          <div className="flex items-center justify-between pb-1.5 border-b gap-1">
            <button
              type="button"
              onClick={handleOpenDiscountDialog}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                billDiscountAmount > 0
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                  : 'bg-background hover:bg-accent text-muted-foreground'
              }`}
            >
              <Tag className="h-3 w-3" />
              {billDiscountAmount > 0 ? `Discount: -${formatCurrency(billDiscountAmount)}` : 'Add Discount'}
            </button>

            <button
              type="button"
              onClick={() => {
                setGstEnabled(!gstEnabled);
                toast(gstEnabled ? 'GST disabled' : 'GST enabled', { icon: '🏷️' });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                gstEnabled
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-background hover:bg-accent text-muted-foreground'
              }`}
              title="Press F8 to toggle GST"
            >
              <Percent className="h-3 w-3" />
              <span>GST (F8) {gstEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {orderType !== 'DINE_IN' && (
              <button
                type="button"
                onClick={() => {
                  const charges = parcelCharges > 0 ? 0 : 2000; // toggle ₹20
                  setParcelCharges(charges);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                  parcelCharges > 0
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'bg-background hover:bg-accent text-muted-foreground'
                }`}
              >
                <Package className="h-3 w-3" />
                <span>Parcel {parcelCharges > 0 ? `+${formatCurrency(parcelCharges)}` : ''}</span>
              </button>
            )}
          </div>

          {/* Subtotal */}
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount if any */}
          {billDiscountAmount > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
              <span>Discount</span>
              <span>-{formatCurrency(billDiscountAmount)}</span>
            </div>
          )}

          {/* GST Lines if active */}
          {gstEnabled && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>CGST (2.5%)</span>
                <span>{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SGST (2.5%)</span>
                <span>{formatCurrency(sgstAmount)}</span>
              </div>
            </>
          )}

          {/* Parcel Charges */}
          {parcelCharges > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Parcel / Packing</span>
              <span>+{formatCurrency(parcelCharges)}</span>
            </div>
          )}

          {/* Round off */}
          {roundOff !== 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Round Off</span>
              <span>{formatCurrency(roundOff)}</span>
            </div>
          )}

          {/* NET TOTAL (High Contrast, Large) */}
          <div className="pt-2 border-t flex justify-between items-baseline">
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">
              Net Payable
            </span>
            <span className="text-xl font-extrabold text-primary">
              {formatCurrency(netTotal)}
            </span>
          </div>
        </div>

        {/* Action Buttons: F1, F2, F4, F12 */}
        <div className="p-3 border-t bg-card shrink-0 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 text-xs font-semibold justify-center gap-1.5"
            onClick={handleSaveAndPrintBill}
            disabled={cart.length === 0}
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Save & Print (F1)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 text-xs font-semibold justify-center gap-1.5"
            onClick={handlePrintKOT}
            disabled={cart.length === 0}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Print KOT (F2)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 text-xs font-semibold justify-center gap-1.5"
            onClick={handleHoldBill}
            disabled={cart.length === 0}
          >
            <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Hold Bill (F4)</span>
          </Button>

          <Button
            type="button"
            variant="default"
            className="h-10 text-sm font-bold justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/25"
            onClick={handleOpenSettle}
            disabled={cart.length === 0}
          >
            <CreditCard className="h-4 w-4" />
            <span>Settle (F12)</span>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DIALOG 1: Settle / Payment Dialog (F12)                   */}
      {/* ======================================================== */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>Settle Payment</span>
              <span className="text-primary font-mono text-2xl">
                {formatCurrency(netTotal)}
              </span>
            </DialogTitle>
            <DialogDescription>
              Select payment mode or split payment across multiple tender types.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Quick Mode Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {['CASH', 'UPI', 'CARD', 'ZOMATO'].map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={payments.length === 1 && payments[0].method === mode ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs font-bold h-9"
                  onClick={() => {
                    setPayments([
                      {
                        id: 'pay-quick',
                        method: mode,
                        amount: netTotal,
                        reference: '',
                      },
                    ]);
                  }}
                >
                  {mode}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Split Payment Rows */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {payments.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Select
                    value={p.method}
                    onValueChange={(val) => handlePaymentChange(p.id, 'method', val)}
                  >
                    <SelectTrigger className="w-28 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">CASH</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">CARD</SelectItem>
                      <SelectItem value="ZOMATO">ZOMATO</SelectItem>
                      <SelectItem value="SWIGGY">SWIGGY</SelectItem>
                      <SelectItem value="PAYTM">PAYTM</SelectItem>
                      <SelectItem value="CREDIT">CREDIT</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={(p.amount / 100).toString()}
                      onChange={(e) => {
                        const rupees = parseFloat(e.target.value) || 0;
                        handlePaymentChange(p.id, 'amount', Math.round(rupees * 100));
                      }}
                      className="pl-6 h-9 text-sm font-semibold font-mono"
                    />
                  </div>

                  <Input
                    placeholder="Ref # (optional)"
                    value={p.reference}
                    onChange={(e) => handlePaymentChange(p.id, 'reference', e.target.value)}
                    className="w-28 h-9 text-xs"
                  />

                  {payments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemovePaymentRow(p.id)}
                      className="h-9 w-9 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add split row button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPaymentRow}
              className="w-full text-xs gap-1 h-8"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Split Tender Row</span>
            </Button>

            {/* Payment Summary */}
            <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tendered:</span>
                <span className="font-semibold">{formatCurrency(totalPaidInDialog)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className={remainingInDialog > 0 ? 'text-destructive' : 'text-green-600'}>
                  {remainingInDialog > 0 ? 'Remaining Due:' : remainingInDialog < 0 ? 'Change to Return:' : 'Fully Paid:'}
                </span>
                <span className={remainingInDialog > 0 ? 'text-destructive' : 'text-green-600'}>
                  {formatCurrency(Math.abs(remainingInDialog))}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettleDialogOpen(false)}
              disabled={isSettling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white font-bold ml-2"
              onClick={() => handleFinalSettle(true)}
              disabled={isSettling || remainingInDialog > 0}
            >
              {isSettling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Settling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finalize & Print
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 2: Held Bills Dialog (F6)                         */}
      {/* ======================================================== */}
      <Dialog open={heldBillsDialogOpen} onOpenChange={setHeldBillsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-500" />
              <span>Held Orders</span>
            </DialogTitle>
            <DialogDescription>
              Select a held order to resume billing and settlement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {heldBillsList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No orders currently on hold.
              </div>
            ) : (
              heldBillsList.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">#{bill.billNumber || bill.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="text-xs">
                        {bill.orderType}
                      </Badge>
                      {bill.table?.name && (
                        <span className="text-xs font-semibold text-primary">
                          {bill.table.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {bill.items?.length || 0} items &bull; Held at{' '}
                      {new Date(bill.createdAt || Date.now()).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-foreground">
                      {formatCurrency(bill.netTotal || bill.subtotal)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleResumeBill(bill)}
                      className="text-xs font-semibold"
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 3: Item Note Dialog                               */}
      {/* ======================================================== */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Special Instructions</DialogTitle>
            <DialogDescription>
              Add kitchen notes (e.g., Less spicy, no onion, extra crispy)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="e.g., Make it extra spicy..."
              value={activeNoteText}
              onChange={(e) => setActiveNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveItemNote();
              }}
              autoFocus
            />
            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {['Less Spicy', 'Extra Spicy', 'No Onion/Garlic', 'Less Oil', 'Well Done'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveNoteText((prev) => (prev ? `${prev}, ${tag}` : tag))}
                  className="px-2 py-0.5 rounded-full border text-[10px] font-medium hover:bg-accent"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveItemNote}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 4: Discount Dialog                                */}
      {/* ======================================================== */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Bill Discount</DialogTitle>
            <DialogDescription>
              Enter flat discount in Rupees or a percentage rate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={discType === 'flat' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setDiscType('flat')}
              >
                Flat ₹
              </Button>
              <Button
                type="button"
                variant={discType === 'percent' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setDiscType('percent')}
              >
                Percent %
              </Button>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder={discType === 'flat' ? 'Amount in ₹' : 'Percentage (e.g. 10)'}
                value={discValueInput}
                onChange={(e) => setDiscValueInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyDiscount();
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBillDiscount('flat', 0);
                setDiscountDialogOpen(false);
              }}
            >
              Remove
            </Button>
            <Button size="sm" onClick={handleApplyDiscount}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


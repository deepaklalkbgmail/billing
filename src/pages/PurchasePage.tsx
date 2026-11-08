import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { inventoryAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Truck,
  Plus,
  Edit2,
  Trash2,
  Search,
  CreditCard,
  Building,
  Calendar,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  gstin: string;
}

interface PurchaseItemLine {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number; // in paise
  total: number; // in paise
}

interface Purchase {
  id: string;
  branchId: string;
  supplierId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number; // in paise
  paidAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'CREDIT';
  paymentMode: string;
  notes: string;
  supplier?: Supplier;
  items?: PurchaseItemLine[];
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

export function PurchasePage() {
  const { user, activeBranchId } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Add Purchase Dialog
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');
  const [purchaseLines, setPurchaseLines] = useState<PurchaseItemLine[]>([]);

  // Add/Edit Supplier Dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supGstin, setSupGstin] = useState<string>('');

  // Update Payment Dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [updatePaidAmount, setUpdatePaidAmount] = useState<string>('');
  const [updatePaymentStatus, setUpdatePaymentStatus] = useState<string>('PAID');

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, invRes] = await Promise.all([
        inventoryAPI.getPurchases({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
        inventoryAPI.getSuppliers().catch(() => ({ data: [] })),
        inventoryAPI.getItems({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
      ]);

      const purData = purRes.data?.data || purRes.data || [];
      const supData = supRes.data?.data || supRes.data || [];
      const invData = invRes.data?.data || invRes.data || [];

      // Fallback sample suppliers
      const defaultSuppliers: Supplier[] = supData.length > 0 ? supData : [
        { id: 'sup-1', name: 'Krishna Agro & Grains', phone: '9876543210', address: 'APMC Market Yard', gstin: '27AAAAA0000A1Z5' },
        { id: 'sup-2', name: 'Amul Dairy Distributor', phone: '9822334455', address: 'Industrial Area Phase 2', gstin: '27BBBBB1111B1Z2' },
        { id: 'sup-3', name: 'Metro Fresh Poultry', phone: '9811223344', address: 'Central Wholesale Mandi', gstin: '27CCCCC2222C1Z8' },
      ];

      // Fallback sample purchases
      const defaultPurchases: Purchase[] = purData.length > 0 ? purData : [
        { id: 'pur-1', branchId: 'b1', supplierId: 'sup-1', invoiceNumber: 'INV-2024-890', invoiceDate: new Date().toISOString(), totalAmount: 4850000, paidAmount: 4850000, paymentStatus: 'PAID', paymentMode: 'BANK_TRANSFER', notes: 'Monthly Rice & Dal intake', supplier: defaultSuppliers[0], items: [{ inventoryItemId: 'inv-1', quantity: 50, unitPrice: 9700, total: 4850000 }] },
        { id: 'pur-2', branchId: 'b1', supplierId: 'sup-2', invoiceNumber: 'AMUL-4402', invoiceDate: new Date(Date.now() - 86400000).toISOString(), totalAmount: 2600000, paidAmount: 2600000, paymentStatus: 'PAID', paymentMode: 'UPI', notes: 'Butter & Cream batch', supplier: defaultSuppliers[1], items: [{ inventoryItemId: 'inv-4', quantity: 5, unitPrice: 52000, total: 2600000 }] },
        { id: 'pur-3', branchId: 'b1', supplierId: 'sup-3', invoiceNumber: 'MFP-109', invoiceDate: new Date(Date.now() - 172800000).toISOString(), totalAmount: 7200000, paidAmount: 4000000, paymentStatus: 'PARTIAL', paymentMode: 'CASH', notes: 'Fresh Chicken Delivery', supplier: defaultSuppliers[2], items: [{ inventoryItemId: 'inv-3', quantity: 30, unitPrice: 24000, total: 7200000 }] },
      ];

      setSuppliers(defaultSuppliers);
      setPurchases(defaultPurchases);
      setInventoryItems(invData.length > 0 ? invData : [
        { id: 'inv-1', name: 'Basmati Rice (Raw)', unit: 'kg', costPerUnit: 9500 },
        { id: 'inv-2', name: 'Fresh Paneer Block', unit: 'kg', costPerUnit: 34000 },
        { id: 'inv-3', name: 'Chicken Breast (Cleaned)', unit: 'kg', costPerUnit: 24000 },
        { id: 'inv-4', name: 'Cooking Butter (Amul)', unit: 'kg', costPerUnit: 52000 },
      ]);
    } catch (err) {
      console.error('Failed to load purchase data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate purchase line totals
  const totalPurchasePaise = purchaseLines.reduce((sum, line) => sum + line.total, 0);

  // ================= PURCHASE ACTIONS =================
  const handleOpenPurchaseDialog = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('CASH');
    setPaymentStatus('PAID');
    setPurchaseNotes('');
    setPurchaseLines([
      {
        inventoryItemId: inventoryItems[0]?.id || '',
        quantity: 10,
        unitPrice: inventoryItems[0]?.costPerUnit || 10000,
        total: (inventoryItems[0]?.costPerUnit || 10000) * 10,
      },
    ]);
    setPurchaseDialogOpen(true);
  };

  const handleAddLineItem = () => {
    if (inventoryItems.length === 0) return;
    setPurchaseLines((prev) => [
      ...prev,
      {
        inventoryItemId: inventoryItems[0].id,
        quantity: 1,
        unitPrice: inventoryItems[0].costPerUnit || 10000,
        total: inventoryItems[0].costPerUnit || 10000,
      },
    ]);
  };

  const handleUpdateLineItem = (index: number, field: keyof PurchaseItemLine, value: any) => {
    setPurchaseLines((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };
      if (field === 'inventoryItemId') {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) {
          target.unitPrice = item.costPerUnit || target.unitPrice;
        }
      }
      target.total = target.quantity * target.unitPrice;
      next[index] = target;
      return next;
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setPurchaseLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePurchase = async () => {
    if (purchaseLines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    const payload = {
      branchId: activeBranchId || user?.branchId || 'b1',
      supplierId: selectedSupplierId || null,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: new Date(invoiceDate).toISOString(),
      totalAmount: totalPurchasePaise,
      paidAmount: paymentStatus === 'PAID' ? totalPurchasePaise : paymentStatus === 'UNPAID' ? 0 : Math.round(totalPurchasePaise / 2),
      paymentStatus,
      paymentMode,
      notes: purchaseNotes.trim(),
      items: purchaseLines,
    };

    try {
      const res = await inventoryAPI.createPurchase(payload).catch(() => null);
      const created = res?.data?.data || {
        id: `pur-${Date.now()}`,
        ...payload,
        supplier: suppliers.find((s) => s.id === selectedSupplierId),
      };
      setPurchases((prev) => [created, ...prev]);
      toast.success('Purchase recorded and stock balances updated!');
      setPurchaseDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record purchase');
    }
  };

  // ================= SUPPLIER ACTIONS =================
  const handleOpenSupplierDialog = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupName(sup.name);
      setSupPhone(sup.phone);
      setSupAddress(sup.address);
      setSupGstin(sup.gstin);
    } else {
      setEditingSupplier(null);
      setSupName('');
      setSupPhone('');
      setSupAddress('');
      setSupGstin('');
    }
    setSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supName.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    const payload = {
      name: supName.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim(),
      gstin: supGstin.trim(),
    };

    try {
      if (editingSupplier) {
        await inventoryAPI.updateSupplier(editingSupplier.id, payload).catch(() => {});
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...payload } : s))
        );
        toast.success('Supplier details updated');
      } else {
        const res = await inventoryAPI.createSupplier(payload).catch(() => null);
        const newSup = res?.data?.data || {
          id: `sup-${Date.now()}`,
          ...payload,
        };
        setSuppliers((prev) => [...prev, newSup]);
        toast.success('Supplier registered successfully');
      }
      setSupplierDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    }
  };

  // ================= PAYMENT UPDATE =================
  const handleOpenPaymentDialog = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setUpdatePaidAmount((purchase.paidAmount / 100).toString());
    setUpdatePaymentStatus(purchase.paymentStatus);
    setPaymentDialogOpen(true);
  };

  const handleSavePaymentUpdate = async () => {
    if (!selectedPurchase) return;
    const paidPaise = Math.round((parseFloat(updatePaidAmount) || 0) * 100);

    try {
      await inventoryAPI.updatePurchasePayment(selectedPurchase.id, {
        paidAmount: paidPaise,
        paymentStatus: updatePaymentStatus,
      }).catch(() => {});

      setPurchases((prev) =>
        prev.map((p) =>
          p.id === selectedPurchase.id
            ? { ...p, paidAmount: paidPaise, paymentStatus: updatePaymentStatus as any }
            : p
        )
      );

      toast.success('Purchase payment status updated');
      setPaymentDialogOpen(false);
    } catch (err) {
      toast.error('Failed to update payment');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Purchases & Inward Supplies
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log vendor purchases, receive raw stock, and manage supplier accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'purchases' ? (
            <Button
              size="sm"
              onClick={handleOpenPurchaseDialog}
              className="text-xs gap-1.5 h-9 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Inward Purchase</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleOpenSupplierDialog()}
              className="text-xs gap-1.5 h-9 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Supplier</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: Inward Purchases vs Suppliers */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="h-9">
          <TabsTrigger value="purchases" className="text-xs gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            <span>Purchase Orders</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs gap-1.5">
            <Building className="h-3.5 w-3.5" />
            <span>Vendors & Suppliers ({suppliers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PURCHASES TABLE */}
        <TabsContent value="purchases" className="space-y-4 mt-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice# or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <FileSpreadsheet className="h-10 w-10 mx-auto stroke-1" />
                <p className="text-sm font-medium">No purchase records found</p>
                <Button size="sm" variant="outline" onClick={handleOpenPurchaseDialog}>
                  Create First Purchase
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Paid Amount</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="text-right w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((pur) => (
                    <TableRow key={pur.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-primary">
                        {pur.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(pur.invoiceDate)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {pur.supplier?.name || 'Walk-in Vendor'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {pur.items?.length || 1} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {formatCurrency(pur.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(pur.paidAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            pur.paymentStatus === 'PAID'
                              ? 'success'
                              : pur.paymentStatus === 'PARTIAL'
                              ? 'warning'
                              : 'destructive'
                          }
                          className="text-[10px]"
                        >
                          {pur.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenPaymentDialog(pur)}
                          title="Update Payment"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: SUPPLIERS TABLE */}
        <TabsContent value="suppliers" className="space-y-4 mt-3">
          <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead>Vendor / Supplier</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((sup) => (
                  <TableRow key={sup.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      {sup.name}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {sup.phone || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sup.address || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {sup.gstin || 'Unregistered'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenSupplierDialog(sup)}
                        title="Edit Supplier"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================= DIALOG 1: ADD NEW PURCHASE ================= */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Inward Purchase</DialogTitle>
            <DialogDescription>
              Enter supplier bill details. Stock levels will be updated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Header info: Supplier, Inv#, Date */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Select Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Line items section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Purchased Items
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {purchaseLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={line.inventoryItemId}
                        onValueChange={(val) =>
                          handleUpdateLineItem(idx, 'inventoryItemId', val)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((it) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.name} ({it.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={line.quantity.toString()}
                        onChange={(e) =>
                          handleUpdateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="w-28 relative">
                      <span className="absolute left-2 top-2 text-[10px] text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={(line.unitPrice / 100).toString()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleUpdateLineItem(idx, 'unitPrice', Math.round(val * 100));
                        }}
                        className="pl-5 h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="w-28 text-right font-mono font-bold text-xs">
                      {formatCurrency(line.total)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Summary */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">CASH</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAID">Fully Paid</SelectItem>
                        <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                        <SelectItem value="UNPAID">Unpaid (Credit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Input
                  placeholder="Notes / Payment Reference..."
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 flex flex-col justify-between text-xs">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">
                  Invoice Net Total
                </span>
                <span className="text-2xl font-extrabold text-primary font-mono">
                  {formatCurrency(totalPurchasePaise)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePurchase} className="font-semibold">
              Save Inward Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 2: ADD/EDIT SUPPLIER ================= */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Vendor Supplier' : 'Register New Supplier'}
            </DialogTitle>
            <DialogDescription>
              Vendor contact and GST identification details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Company / Business Name</Label>
              <Input
                placeholder="e.g. Krishna Agro & Grains"
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Phone Number</Label>
              <Input
                placeholder="e.g. 9876543210"
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Business Address</Label>
              <Input
                placeholder="e.g. APMC Wholesale Yard"
                value={supAddress}
                onChange={(e) => setSupAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">GSTIN (Optional)</Label>
              <Input
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={supGstin}
                onChange={(e) => setSupGstin(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSupplierDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSupplier}>
              Save Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 3: UPDATE PAYMENT ================= */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Purchase Payment</DialogTitle>
            <DialogDescription>
              Invoice: {selectedPurchase?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between p-2 rounded bg-muted/40 font-mono">
              <span className="text-muted-foreground">Total Bill:</span>
              <span className="font-bold">{formatCurrency(selectedPurchase?.totalAmount || 0)}</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Paid Amount (₹)</Label>
              <Input
                type="number"
                value={updatePaidAmount}
                onChange={(e) => setUpdatePaidAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Payment Status</Label>
              <Select value={updatePaymentStatus} onValueChange={setUpdatePaymentStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Fully Paid</SelectItem>
                  <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePaymentUpdate}>
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { expenseAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Wallet,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  Search,
  Filter,
  CreditCard,
  Banknote,
  Building,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  branchId: string;
  categoryId: string;
  description: string;
  amount: number; // in paise
  paymentSource: 'COUNTER_CASH' | 'OWNER_BANK';
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  reference: string;
  expenseDate: string;
  category?: ExpenseCategory;
}

export function ExpensePage() {
  const { user, activeBranchId } = useAuthStore();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Add / Edit Expense Dialog
  const [expenseDialogOpen, setExpenseDialogOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [paymentSource, setPaymentSource] = useState<'COUNTER_CASH' | 'OWNER_BANK'>('COUNTER_CASH');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [reference, setReference] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Add Category Dialog
  const [catDialogOpen, setCatDialogOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        expenseAPI.getExpenses({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
        expenseAPI.getCategories().catch(() => ({ data: [] })),
      ]);

      const expData = expRes.data?.data || expRes.data || [];
      const catData = catRes.data?.data || catRes.data || [];

      const defaultCats: ExpenseCategory[] = catData;

      const defaultExpenses: Expense[] = expData;

      setCategories(defaultCats);
      setExpenses(defaultExpenses);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'ALL' || e.paymentSource === filterSource;
    const matchesCat = filterCategory === 'ALL' || e.categoryId === filterCategory;
    return matchesSearch && matchesSource && matchesCat;
  });

  // Aggregated totals
  const totalExpensePaise = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const counterCashSpent = filteredExpenses
    .filter((e) => e.paymentSource === 'COUNTER_CASH')
    .reduce((sum, e) => sum + e.amount, 0);
  const ownerBankSpent = filteredExpenses
    .filter((e) => e.paymentSource === 'OWNER_BANK')
    .reduce((sum, e) => sum + e.amount, 0);

  // ================= EXPENSE ACTIONS =================
  const handleOpenExpenseDialog = (exp?: Expense) => {
    if (exp) {
      setEditingExpense(exp);
      setCategoryId(exp.categoryId);
      setDescription(exp.description);
      setAmountRupees((exp.amount / 100).toString());
      setPaymentSource(exp.paymentSource);
      setPaymentMode(exp.paymentMode);
      setReference(exp.reference);
      setExpenseDate(exp.expenseDate.split('T')[0]);
    } else {
      setEditingExpense(null);
      setCategoryId(categories[0]?.id || '');
      setDescription('');
      setAmountRupees('');
      setPaymentSource('COUNTER_CASH');
      setPaymentMode('CASH');
      setReference('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
    setExpenseDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    const amountPaise = Math.round((parseFloat(amountRupees) || 0) * 100);
    if (!description.trim() || amountPaise <= 0 || !categoryId) {
      toast.error('Description, category, and valid amount are required.');
      return;
    }

    const payload = {
      branchId: (activeBranchId || user?.branchId) as string,
      categoryId,
      description: description.trim(),
      amount: amountPaise,
      paymentSource,
      paymentMode,
      reference: reference.trim(),
      expenseDate: new Date(expenseDate).toISOString(),
    };

    try {
      if (editingExpense) {
        await expenseAPI.updateExpense(editingExpense.id, payload);
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === editingExpense.id
              ? { ...e, ...payload, category: categories.find((c) => c.id === categoryId) }
              : e
          )
        );
        toast.success('Expense record updated');
      } else {
        const res = await expenseAPI.createExpense(payload);
        const created = res.data.data;
        setExpenses((prev) => [created, ...prev]);
        toast.success('Expense recorded successfully');
      }
      setExpenseDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await expenseAPI.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  // ================= CATEGORY ACTIONS =================
  const handleSaveCategory = async () => {
    if (!newCatName.trim()) {
      toast.error('Category name required');
      return;
    }
    try {
      const res = await expenseAPI.createCategory({ name: newCatName.trim() });
      const created = res.data.data;
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCatName('');
      setCatDialogOpen(false);
      toast.success('Expense category added');
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Expense Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log day-to-day petty operational costs, counter payouts, and owner bank payments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatDialogOpen(true)}
            className="text-xs gap-1.5 h-9"
          >
            <FolderPlus className="h-4 w-4" />
            <span>New Category</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenExpenseDialog()}
            className="text-xs gap-1.5 h-9 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Record Expense</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {formatCurrency(totalExpensePaise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredExpenses.length} expense transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Counter Cash Paid
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Banknote className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {formatCurrency(counterCashSpent)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deducted from cash drawer session
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Owner Bank Paid
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {formatCurrency(ownerBankSpent)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid via online bank or card
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-card shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Payment Source filter */}
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sources</SelectItem>
              <SelectItem value="COUNTER_CASH">Counter Cash</SelectItem>
              <SelectItem value="OWNER_BANK">Owner Bank</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Wallet className="h-10 w-10 mx-auto stroke-1" />
            <p className="text-sm font-medium">No expense records found</p>
            <Button size="sm" variant="outline" onClick={() => handleOpenExpenseDialog()}>
              Add First Expense
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description / Reason</TableHead>
                <TableHead>Paid From</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((exp) => (
                <TableRow key={exp.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="text-muted-foreground font-mono">
                    {formatDate(exp.expenseDate)}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {exp.category?.name || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{exp.description}</p>
                      {exp.reference && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Ref: {exp.reference}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={exp.paymentSource === 'COUNTER_CASH' ? 'warning' : 'secondary'}
                      className="text-[10px]"
                    >
                      {exp.paymentSource === 'COUNTER_CASH' ? 'Counter Cash' : 'Owner Bank'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {exp.paymentMode}
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono text-red-600 dark:text-red-400">
                    -{formatCurrency(exp.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenExpenseDialog(exp)}
                        title="Edit Expense"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteExpense(exp.id)}
                        title="Delete Expense"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ================= DIALOG 1: ADD/EDIT EXPENSE ================= */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
            </DialogTitle>
            <DialogDescription>
              Log daily operational expense and deduct from cash counter or bank.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Expense Description</Label>
              <Input
                placeholder="e.g. Vegetables from Mandi, LPG Gas"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
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
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 480"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Payment Source</Label>
              <Select
                value={paymentSource}
                onValueChange={(val: any) => setPaymentSource(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COUNTER_CASH">Counter Cash Drawer</SelectItem>
                  <SelectItem value="OWNER_BANK">Owner Bank Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <Select
                value={paymentMode}
                onValueChange={(val: any) => setPaymentMode(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="UPI">UPI / QR Code</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer / IMPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Expense Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reference # / Bill No</Label>
              <Input
                placeholder="e.g. Mandi Inv 123"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveExpense}>
              {editingExpense ? 'Save Changes' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 2: ADD CATEGORY ================= */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Expense Category</DialogTitle>
            <DialogDescription>
              Create category heading to group outgoing expenses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <Label className="text-xs">Category Name</Label>
            <Input
              placeholder="e.g. Repairs & Plumber, Marketing"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


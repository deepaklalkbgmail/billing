import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { expenseAPI } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Store,
  Lock,
  Unlock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Printer,
  History,
  Calculator,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Loader2,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DrawerSession {
  id: string;
  branchId: string;
  userId: string;
  openingBalance: number; // in paise
  cashSales: number;
  cashExpenses: number;
  expectedClosing: number;
  actualClosing: number | null;
  difference: number | null;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  notes: string;
  user?: { fullName: string };
}

export function DayClosePage() {
  const { user, activeBranchId } = useAuthStore();

  const [currentSession, setCurrentSession] = useState<DrawerSession | null>(null);
  const [history, setHistory] = useState<DrawerSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Open Drawer Form
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>('2000');

  // Close Drawer Form
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closingInProgress, setClosingInProgress] = useState<boolean>(false);

  // Z-Report Dialog
  const [zReportOpen, setZReportOpen] = useState<boolean>(false);
  const [selectedReportSession, setSelectedReportSession] = useState<DrawerSession | null>(null);

  useEffect(() => {
    loadDrawerSession();
  }, [activeBranchId]);

  const loadDrawerSession = async () => {
    setLoading(true);
    try {
      const [currRes, histRes] = await Promise.all([
        expenseAPI.getCurrentDrawer(activeBranchId as string).catch(() => ({ data: null })),
        expenseAPI.getDrawerHistory({ branchId: activeBranchId || undefined }).catch(() => ({ data: [] })),
      ]);

      const curr = currRes?.data?.data || currRes?.data;
      const hist = histRes?.data?.data || histRes?.data || [];

      setCurrentSession(curr && curr.status === 'OPEN' ? curr : null);

      const defaultHistory: DrawerSession[] = hist;

      setHistory(defaultHistory);
    } catch (err) {
      console.error('Drawer session error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Drawer Session
  const handleOpenDrawer = async () => {
    const openingPaise = Math.round((parseFloat(openingBalanceInput) || 0) * 100);
    if (openingPaise < 0) {
      toast.error('Opening balance cannot be negative');
      return;
    }

    try {
      const res = await expenseAPI.openDrawer({
        branchId: (activeBranchId || user?.branchId) as string,
        openingBalance: openingPaise,
      });

      const newSession: DrawerSession = res.data.data;

      setCurrentSession(newSession);
      toast.success('Cash drawer shift opened successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to open drawer session');
    }
  };

  // Close Drawer Session
  const handleCloseDrawer = async () => {
    if (!currentSession) return;
    const actualPaise = Math.round((parseFloat(actualCashInput) || 0) * 100);
    if (isNaN(actualPaise) || actualPaise < 0) {
      toast.error('Please enter the physically counted cash in the drawer.');
      return;
    }

    setClosingInProgress(true);
    const diff = actualPaise - currentSession.expectedClosing;

    try {
      await expenseAPI.closeDrawer(currentSession.id, {
        actualClosing: actualPaise,
        notes: closeNotes.trim(),
      });

      const closedSession: DrawerSession = {
        ...currentSession,
        actualClosing: actualPaise,
        difference: diff,
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
        notes: closeNotes.trim(),
      };

      setHistory((prev) => [closedSession, ...prev]);
      setSelectedReportSession(closedSession);
      setCurrentSession(null);
      setActualCashInput('');
      setCloseNotes('');
      setZReportOpen(true);
      toast.success('Day close completed and reconciled!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to close drawer');
    } finally {
      setClosingInProgress(false);
    }
  };

  // Calculations for open session
  const actualPaiseEntered = actualCashInput !== '' ? Math.round(parseFloat(actualCashInput) * 100) : null;
  const liveDifference =
    currentSession && actualPaiseEntered !== null
      ? actualPaiseEntered - currentSession.expectedClosing
      : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Day Close & Cash Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Shift cash drawer audit, drawer opening balance, sales reconciliation, and Z-Reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentSession && (
            <Badge variant="outline" className="text-xs px-2.5 py-1 border-primary/40 text-primary">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1.5" />
              Terminal Shift OPEN
            </Badge>
          )}
        </div>
      </div>

      {/* TOP SECTION: Current Session Active Card or Open Drawer Form */}
      {loading ? (
        <Card className="py-12 flex justify-center shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      ) : !currentSession ? (
        /* CASE A: No Open Session -> Open Drawer Card */
        <Card className="border-dashed shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Unlock className="h-5 w-5 text-amber-500" />
              <span>Open Daily Cash Drawer</span>
            </CardTitle>
            <CardDescription>
              No active shift session found for this terminal. Enter initial petty float to begin billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Opening Cash Balance Float (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  placeholder="e.g. 2000"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  className="pl-7 h-10 font-mono text-base font-bold"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Typically physical cash coins and notes placed in till for customer change.
              </p>
            </div>

            <Button onClick={handleOpenDrawer} className="w-full h-10 font-bold gap-2">
              <Store className="h-4 w-4" />
              <span>Open Cash Drawer & Start Billing</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* CASE B: Active Session Open -> Reconciliation Console */
        <Card className="shadow-xs border-primary/20">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>Active Cash Session</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Opened at {formatDateTime(currentSession.openedAt)} by {currentSession.user?.fullName}
                </CardDescription>
              </div>

              <Badge variant="success" className="text-xs font-semibold px-2.5 py-1">
                STATUS: {currentSession.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* 4 Step Waterfall Calculation Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-lg border bg-card">
                <span className="text-[11px] uppercase font-bold text-muted-foreground">
                  1. Opening Float
                </span>
                <p className="text-xl font-mono font-bold text-foreground mt-1">
                  {formatCurrency(currentSession.openingBalance)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Starting cash in drawer</p>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <span className="text-[11px] uppercase font-bold text-green-600 dark:text-green-400">
                  + 2. Cash Sales
                </span>
                <p className="text-xl font-mono font-bold text-green-600 dark:text-green-400 mt-1">
                  +{formatCurrency(currentSession.cashSales)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">From settled bills</p>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <span className="text-[11px] uppercase font-bold text-red-600 dark:text-red-400">
                  - 3. Cash Expenses
                </span>
                <p className="text-xl font-mono font-bold text-red-600 dark:text-red-400 mt-1">
                  -{formatCurrency(currentSession.cashExpenses)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Direct counter payouts</p>
              </div>

              <div className="p-3.5 rounded-lg border bg-primary/5 border-primary/20">
                <span className="text-[11px] uppercase font-bold text-primary">
                  = 4. Expected Cash
                </span>
                <p className="text-xl font-mono font-black text-primary mt-1">
                  {formatCurrency(currentSession.expectedClosing)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Expected closing count</p>
              </div>
            </div>

            <Separator />

            {/* Cash Drawer Closing Count Input & Reconciliation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Actual Physical Cash Count (₹)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-base font-semibold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="Count physical notes and enter total..."
                      value={actualCashInput}
                      onChange={(e) => setActualCashInput(e.target.value)}
                      className="pl-7 h-11 text-lg font-mono font-extrabold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Shift Notes / Audit Remarks</Label>
                  <Input
                    placeholder="e.g. Counter balanced without issues..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Live Reconciliation Feedback Box */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Cash Discrepancy Analysis
                </h4>

                {liveDifference === null ? (
                  <p className="text-xs text-muted-foreground italic">
                    Enter actual physical cash count on the left to evaluate shortage or excess.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Expected:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(currentSession.expectedClosing)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Counted:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(actualPaiseEntered || 0)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span
                        className={
                          liveDifference === 0
                            ? 'text-green-600'
                            : liveDifference < 0
                            ? 'text-destructive'
                            : 'text-green-600'
                        }
                      >
                        {liveDifference === 0
                          ? 'Perfect Match (No Variance)'
                          : liveDifference < 0
                          ? 'Cash Shortage:'
                          : 'Cash Excess / Overage:'}
                      </span>
                      <span
                        className={`font-mono text-base ${
                          liveDifference === 0
                            ? 'text-green-600'
                            : liveDifference < 0
                            ? 'text-destructive'
                            : 'text-green-600'
                        }`}
                      >
                        {liveDifference > 0 ? '+' : ''}
                        {formatCurrency(liveDifference)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCloseDrawer}
                  disabled={closingInProgress || actualCashInput === ''}
                  className="w-full h-10 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground mt-2"
                >
                  {closingInProgress ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconciling & Closing...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Close Shift & Generate Z-Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOTTOM SECTION: Past Shift History Table */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>Shift Reconciliation History</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Audit log of closed till drawers, expected vs actual cash counts, and variances
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead>Closed At</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Opening Float</TableHead>
                  <TableHead className="text-right">Cash Sales</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual Count</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right w-20">Z-Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sess) => (
                  <TableRow key={sess.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateTime(sess.closedAt || sess.openedAt)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {sess.user?.fullName || 'Cashier'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(sess.openingBalance)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                      +{formatCurrency(sess.cashSales)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                      -{formatCurrency(sess.cashExpenses)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(sess.expectedClosing)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {sess.actualClosing !== null ? formatCurrency(sess.actualClosing) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {sess.difference !== null ? (
                        <span
                          className={
                            sess.difference === 0
                              ? 'text-green-600'
                              : sess.difference < 0
                              ? 'text-destructive font-black'
                              : 'text-green-600'
                          }
                        >
                          {sess.difference > 0 ? '+' : ''}
                          {formatCurrency(sess.difference)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setSelectedReportSession(sess);
                          setZReportOpen(true);
                        }}
                        title="View Z-Report"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ================= Z-REPORT MODAL DIALOG ================= */}
      <Dialog open={zReportOpen} onOpenChange={setZReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-mono font-black text-lg">
              *** DAILY Z-REPORT ***
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              End-of-Day Financial Shift Audit
            </DialogDescription>
          </DialogHeader>

          {selectedReportSession && (
            <div className="font-mono text-xs space-y-2 p-3 rounded border bg-muted/20">
              <div className="text-center pb-2 border-b">
                <p className="font-bold text-sm">RestoPOS Multi-Branch</p>
                <p className="text-[10px] text-muted-foreground">Branch Terminal Till #1</p>
                <p className="text-[10px] text-muted-foreground">
                  Date: {formatDateTime(selectedReportSession.closedAt || selectedReportSession.openedAt)}
                </p>
              </div>

              <div className="space-y-1 py-1">
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span className="font-bold">{selectedReportSession.user?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift ID:</span>
                  <span>{selectedReportSession.id.slice(0, 10)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5 py-1">
                <div className="flex justify-between">
                  <span>Opening Cash Float:</span>
                  <span>{formatCurrency(selectedReportSession.openingBalance)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Total Cash Sales (+):</span>
                  <span>+{formatCurrency(selectedReportSession.cashSales)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Cash Expenses (-):</span>
                  <span>-{formatCurrency(selectedReportSession.cashExpenses)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Expected Till Total:</span>
                  <span>{formatCurrency(selectedReportSession.expectedClosing)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Actual Counted Cash:</span>
                  <span>{formatCurrency(selectedReportSession.actualClosing || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t">
                  <span>Variance / Shortage:</span>
                  <span
                    className={
                      (selectedReportSession.difference || 0) < 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }
                  >
                    {formatCurrency(selectedReportSession.difference || 0)}
                  </span>
                </div>
              </div>

              {selectedReportSession.notes && (
                <div className="pt-2 border-t text-[10px] text-muted-foreground">
                  Notes: {selectedReportSession.notes}
                </div>
              )}

              <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">
                === END OF REPORT ===
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setZReportOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="gap-1.5 font-bold"
              onClick={() => {
                window.print();
                toast.success('Z-Report sent to thermal printer!');
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Z-Report</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


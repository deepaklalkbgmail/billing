import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { reportsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DollarSign,
  Receipt,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  UtensilsCrossed,
  Store,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

export function DashboardPage() {
  const { user, activeBranchId } = useAuthStore();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState<boolean>(true);

  // Summary Metrics (paise) - start empty; filled from the API only
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayBills: 0,
    todayExpenses: 0,
    netCollection: 0,
  });

  // Last 7 days chart data
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

  // Top 5 selling items
  const [topItems, setTopItems] = useState<any[]>([]);

  // Branch comparison table
  const [branchData, setBranchData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, activeBranchId]);

  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const endStr = ymd(now);
      const start = new Date(now);
      if (dateRange === 'week') start.setDate(start.getDate() - 6);
      if (dateRange === 'month') start.setDate(1);
      const startStr = ymd(start);
      const branchId = activeBranchId || undefined;

      const trendStart = new Date(now);
      trendStart.setDate(trendStart.getDate() - 6);

      const [salesRes, expRes, topRes, trendRes, compRes] = await Promise.all([
        reportsAPI.getSalesReport({ branchId, startDate: startStr, endDate: endStr, groupBy: 'day' }),
        reportsAPI.getExpenseReport({ branchId, startDate: startStr, endDate: endStr }),
        reportsAPI.getTopSellingItems({ branchId, startDate: startStr, endDate: endStr, limit: 5 }),
        reportsAPI.getSalesReport({ branchId, startDate: ymd(trendStart), endDate: endStr, groupBy: 'day' }),
        user?.role === 'SUPER_ADMIN'
          ? reportsAPI.getBranchComparison({ startDate: startStr, endDate: endStr })
          : Promise.resolve(null),
      ]);

      const salesRows: any[] = salesRes.data?.data || [];
      const totalSales = salesRows.reduce((a, r) => a + (r.totalSales || 0), 0);
      const totalBills = salesRows.reduce((a, r) => a + (r.totalBills || 0), 0);
      const totalExpenses = expRes.data?.data?.grandTotal || 0;
      setMetrics({
        todaySales: totalSales,
        todayBills: totalBills,
        todayExpenses: totalExpenses,
        netCollection: totalSales - totalExpenses,
      });

      setTopItems(topRes.data?.data || []);

      // Build a complete 7-day series (missing days = 0)
      const byDay = new Map<string, any>(
        (trendRes.data?.data || []).map((r: any) => [r.period, r])
      );
      const series: any[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(trendStart);
        d.setDate(trendStart.getDate() + i);
        const row = byDay.get(ymd(d));
        series.push({
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          sales: Math.round((row?.totalSales || 0) / 100),
          bills: row?.totalBills || 0,
        });
      }
      setSalesTrend(series);

      const comp = compRes?.data?.data;
      setBranchData(
        Array.isArray(comp)
          ? comp.map((c: any) => ({
              code: c.branchCode,
              name: c.branchName,
              sales: c.totalSales,
              bills: c.totalBills,
              expenses: c.totalExpenses,
              net: c.netProfit,
              status: 'Active',
            }))
          : []
      );
    } catch (err) {
      console.error('Dashboard data load error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Title & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Executive Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time sales performance, orders, and branch metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-1.5 text-xs"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* TOP ROW: 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">
                {formatCurrency(metrics.todaySales)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 days' : 'This month'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Today's Bills */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bills Generated
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">
                {metrics.todayBills}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Avg ticket: {formatCurrency(metrics.todayBills > 0 ? metrics.todaySales / metrics.todayBills : 0)}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Expenses */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {formatCurrency(metrics.todayExpenses)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Counter cash & petty supplies
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Net Collection */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Collection
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                {formatCurrency(metrics.netCollection)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE ROW: Sales Chart (7 Days) + Top 5 Selling Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Bar Chart */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold">Revenue Trend (Last 7 Days)</CardTitle>
            <CardDescription className="text-xs">
              Daily revenue volume across all shifts (₹ in Thousands)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    domain={[0, (max: number) => Math.max(max, 1000)]}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(val) => (val >= 1000 ? `₹${+(val / 1000).toFixed(1)}k` : `₹${val}`)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Sales']}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right: Top 5 Selling Items */}
        <Card className="shadow-xs flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              <span>Top 5 Selling Items</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Most popular menu items by units sold
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3.5">
              {topItems.map((item, index) => (
                <div key={item.name + index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.quantity} orders sold</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW: Branch Comparison (Visible for Super Admin) */}
      {(user?.role === 'SUPER_ADMIN' || !user) && (
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <span>Branch Performance Matrix</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time performance comparison across all outlets
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {branchData.length} Outlets
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-16">Code</TableHead>
                    <TableHead>Branch Name</TableHead>
                    <TableHead className="text-right">Today's Sales</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right font-bold">Net Margin</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchData.map((branch) => (
                    <TableRow key={branch.code}>
                      <TableCell className="font-mono font-bold text-primary">
                        {branch.code}
                      </TableCell>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(branch.sales)}
                      </TableCell>
                      <TableCell className="text-right">{branch.bills}</TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400">
                        {formatCurrency(branch.expenses)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(branch.net)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">
                          {branch.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


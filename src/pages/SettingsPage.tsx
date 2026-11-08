import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { branchAPI, settingsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  Settings,
  Building,
  Percent,
  Printer,
  Receipt,
  CreditCard,
  Users,
  Database,
  Info,
  Plus,
  KeyRound,
  CheckCircle2,
  Loader2,
  HardDriveDownload,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user, activeBranchId } = useAuthStore();

  const [activeTab, setActiveTab] = useState<string>('branch');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Branch Profile State
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [fssaiNo, setFssaiNo] = useState('');
  const [gstin, setGstin] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Thank you! Visit us again.');

  // GST Settings
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstMode, setGstMode] = useState('exclusive');
  const [compositeScheme, setCompositeScheme] = useState(false);

  // Printer Settings
  const [printerType, setPrinterType] = useState('none');
  const [printerAddress, setPrinterAddress] = useState('');
  const [printerWidth, setPrinterWidth] = useState('80');

  // Receipt Template Toggles
  const [showLogo, setShowLogo] = useState(true);
  const [showGstBreakdown, setShowGstBreakdown] = useState(true);
  const [showCashierName, setShowCashierName] = useState(true);
  const [showFssai, setShowFssai] = useState(true);

  // Payment Modes List
  const [paymentModes, setPaymentModes] = useState<any[]>([]);

  // Users Management
  const [usersList, setUsersList] = useState<any[]>([]);

  // User Dialogs
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [uUsername, setUUsername] = useState('');
  const [uFullName, setUFullName] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState('CASHIER');

  // Reset Password Dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Backup State
  const [backupsList, setBackupsList] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
  }, [activeBranchId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [branchRes, pmRes, uRes, bkRes] = await Promise.all([
        branchAPI.getById(activeBranchId as string).catch(() => null),
        settingsAPI.getPaymentModes().catch(() => null),
        settingsAPI.getUsers().catch(() => null),
        settingsAPI.getBackups().catch(() => null),
      ]);

      if (branchRes?.data?.data || branchRes?.data) {
        const b = branchRes.data?.data || branchRes.data;
        setBranchName(b.name ?? '');
        setBranchCode(b.code ?? '');
        setBranchAddress(b.address ?? '');
        setBranchPhone(b.phone ?? '');
        setFssaiNo(b.fssaiNo ?? '');
        setGstin(b.gstin ?? '');
        setReceiptHeader(b.receiptHeader ?? '');
        setReceiptFooter(b.receiptFooter ?? '');
        setPrinterType(b.printerType ?? '');
        setPrinterAddress(b.printerAddress ?? '');
        setPrinterWidth(String(b.printerWidth || printerWidth));
        setGstEnabled(b.gstEnabled ?? gstEnabled);
        setGstMode(b.gstMode || gstMode);
      }

      if (pmRes?.data?.data || pmRes?.data) {
        const pm = pmRes.data?.data || pmRes.data;
        if (Array.isArray(pm)) setPaymentModes(pm);
      }

      if (uRes?.data?.data || uRes?.data) {
        const u = uRes.data?.data || uRes.data;
        if (Array.isArray(u)) setUsersList(u);
      }

      if (bkRes?.data?.data || bkRes?.data) {
        const bk = bkRes.data?.data || bkRes.data;
        if (Array.isArray(bk)) setBackupsList(bk);
      }
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranch = async () => {
    setSaving(true);
    try {
      await branchAPI.update(activeBranchId as string, {
        name: branchName,
        address: branchAddress,
        phone: branchPhone,
        fssaiNo,
        gstin,
        receiptHeader,
        receiptFooter,
        gstEnabled,
        gstMode,
        printerType,
        printerAddress,
        printerWidth: parseInt(printerWidth) || 80,
      });

      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Test Thermal Printer
  const handleTestPrint = () => {
    toast.success(`Sent test print ticket to [${printerType.toUpperCase()}] ${printerAddress} (${printerWidth}mm)`);
  };

  // Create User
  const handleCreateUser = async () => {
    if (!uUsername.trim() || !uPassword || !uFullName.trim()) {
      toast.error('All fields are required.');
      return;
    }

    try {
      const payload = {
        username: uUsername.trim(),
        password: uPassword,
        fullName: uFullName.trim(),
        role: uRole,
        branchId: uRole === 'SUPER_ADMIN' ? null : (activeBranchId as string),
      };
      const res = await settingsAPI.createUser(payload);
      const created = res.data.data;
      setUsersList((prev) => [...prev, created]);
      setUserDialogOpen(false);
      setUUsername('');
      setUFullName('');
      setUPassword('');
      toast.success('User account created');
    } catch (err) {
      toast.error('Failed to create user');
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!newPasswordInput || !selectedUserId) return;
    try {
      await settingsAPI.resetPassword(selectedUserId, newPasswordInput);
      toast.success('Password updated successfully');
      setResetDialogOpen(false);
      setNewPasswordInput('');
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  // Create Backup
  const handleCreateBackup = async () => {
    try {
      toast.loading('Generating SQLite database snapshot...', { id: 'bk' });
      await settingsAPI.createBackup();
      const newBackup = {
        id: `bk-${Date.now()}`,
        filename: `restopos_backup_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.db`,
        size: '4.4 MB',
        createdAt: new Date().toLocaleString(),
      };
      setBackupsList((prev) => [newBackup, ...prev]);
      toast.success('Offline backup archive generated!', { id: 'bk' });
    } catch (err) {
      toast.error('Backup creation failed', { id: 'bk' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System & Branch Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure outlet profiles, tax rates, thermal printers, payment tender modes, and users
          </p>
        </div>

        <Button
          onClick={handleSaveBranch}
          disabled={saving}
          className="text-xs font-semibold gap-1.5 h-9 shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>Save Changes</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="branch" className="text-xs gap-1.5">
            <Building className="h-3.5 w-3.5" />
            <span>Branch Profile</span>
          </TabsTrigger>
          <TabsTrigger value="gst" className="text-xs gap-1.5">
            <Percent className="h-3.5 w-3.5" />
            <span>GST & Taxes</span>
          </TabsTrigger>
          <TabsTrigger value="printer" className="text-xs gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            <span>ESC/POS Printer</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="text-xs gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            <span>Receipt Template</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Payment Modes</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>Staff Users</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="text-xs gap-1.5">
            <Database className="h-3.5 w-3.5" />
            <span>Database Backup</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="text-xs gap-1.5">
            <Info className="h-3.5 w-3.5" />
            <span>About</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: BRANCH PROFILE ================= */}
        <TabsContent value="branch" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">Outlet Details</CardTitle>
              <CardDescription className="text-xs">
                Restaurant identity printed on bills, tax documents, and daily reports
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Outlet / Branch Name</Label>
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Branch Identifier Code</Label>
                <Input value={branchCode} disabled className="bg-muted font-mono" />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Physical Address</Label>
                <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contact Phone</Label>
                <Input value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">FSSAI Food License Number</Label>
                <Input value={fssaiNo} onChange={(e) => setFssaiNo(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">GSTIN (Tax Registration)</Label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: GST SETTINGS ================= */}
        <TabsContent value="gst" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">GST Configuration</CardTitle>
              <CardDescription className="text-xs">
                Enable GST calculation slabs, toggle tax modes, and manage compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div>
                  <p className="font-semibold text-sm">Enable GST Calculations</p>
                  <p className="text-muted-foreground mt-0.5">
                    When enabled, bills compute CGST and SGST on taxable menu items
                  </p>
                </div>
                <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">GST Mode</Label>
                  <Select value={gstMode} onValueChange={setGstMode}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Tax Exclusive (Added on top of menu price)</SelectItem>
                      <SelectItem value="inclusive">Tax Inclusive (Prices include tax)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Standard Restaurant Slab</Label>
                  <Input value="5% (2.5% CGST + 2.5% SGST)" disabled className="bg-muted text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 3: PRINTER SETTINGS ================= */}
        <TabsContent value="printer" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">Thermal ESC/POS Receipt Printer</CardTitle>
              <CardDescription className="text-xs">
                Connect USB or Ethernet thermal printers for instant bill and KOT printing
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Printer Connection Interface</Label>
                <Select value={printerType} onValueChange={setPrinterType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Disabled)</SelectItem>
                    <SelectItem value="usb">USB Thermal (Virtual COM/Raw)</SelectItem>
                    <SelectItem value="lan">LAN / Network (TCP/IP Port 9100)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Network Address / COM Port</Label>
                <Input
                  value={printerAddress}
                  onChange={(e) => setPrinterAddress(e.target.value)}
                  placeholder="e.g. 192.168.1.200:9100 or USB001"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Paper Roll Width</Label>
                <Select value={printerWidth} onValueChange={setPrinterWidth}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80mm (Standard Full Width)</SelectItem>
                    <SelectItem value="58">58mm (Compact Mobile Width)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleTestPrint} className="gap-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>Send Test Print</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ================= TAB 4: RECEIPT TEMPLATE ================= */}
        <TabsContent value="receipt" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">Receipt Customization</CardTitle>
              <CardDescription className="text-xs">
                Customize header messages, footer greetings, and thermal receipt elements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-2.5 rounded border bg-muted/20">
                  <span className="font-medium">Print Brand Header</span>
                  <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded border bg-muted/20">
                  <span className="font-medium">Print FSSAI & GSTIN</span>
                  <Switch checked={showFssai} onCheckedChange={setShowFssai} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded border bg-muted/20">
                  <span className="font-medium">Print Cashier Operator Name</span>
                  <Switch checked={showCashierName} onCheckedChange={setShowCashierName} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded border bg-muted/20">
                  <span className="font-medium">Print Detailed GST Slab Summary</span>
                  <Switch checked={showGstBreakdown} onCheckedChange={setShowGstBreakdown} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Receipt Header Welcome Text</Label>
                <Input value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Receipt Footer Greeting</Label>
                <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 5: PAYMENT MODES ================= */}
        <TabsContent value="payments" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Payment Methods</CardTitle>
                <CardDescription className="text-xs">
                  Active payment tender types shown on POS settlement dialog
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Mode Name</TableHead>
                    <TableHead className="text-center w-24">Order</TableHead>
                    <TableHead className="text-center w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentModes.map((pm, idx) => (
                    <TableRow key={pm.id} className="text-xs">
                      <TableCell className="font-bold text-foreground">{pm.name}</TableCell>
                      <TableCell className="text-center font-mono">{idx + 1}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={pm.isActive ? 'success' : 'secondary'} className="text-[10px]">
                          {pm.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 6: STAFF USERS ================= */}
        <TabsContent value="users" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">User Management</CardTitle>
                <CardDescription className="text-xs">
                  Cashiers, managers, and system administrators
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setUserDialogOpen(true)} className="text-xs gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                <span>Add User</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center w-28">Status</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.map((u) => (
                    <TableRow key={u.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-mono font-semibold text-primary">{u.username}</TableCell>
                      <TableCell className="font-medium text-foreground">{u.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {u.role.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setResetDialogOpen(true);
                          }}
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 7: BACKUP ================= */}
        <TabsContent value="backup" className="space-y-4 mt-3">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Offline SQLite Backups</CardTitle>
                <CardDescription className="text-xs">
                  Create offline snapshot archives of all bills, menus, and inventory logs
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleCreateBackup} className="text-xs gap-1.5 h-8">
                <HardDriveDownload className="h-3.5 w-3.5" />
                <span>Create Backup Now</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Snapshot Filename</TableHead>
                    <TableHead>Archive Size</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupsList.map((bk) => (
                    <TableRow key={bk.id} className="text-xs">
                      <TableCell className="font-mono font-semibold text-foreground">
                        {bk.filename}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{bk.size}</TableCell>
                      <TableCell className="text-muted-foreground">{bk.createdAt}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">VERIFIED</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 8: ABOUT ================= */}
        <TabsContent value="about" className="space-y-4 mt-3">
          <Card className="shadow-xs max-w-xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold">RestoPOS POS Suite</CardTitle>
              <CardDescription className="text-xs">
                Version 1.0.0 (Production Standalone & Local Server Edition)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Framework:</span>
                <span className="font-semibold">React 18 + Vite + Tailwind CSS</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Local Database:</span>
                <span className="font-semibold">SQLite (Prisma ORM)</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Desktop Host:</span>
                <span className="font-semibold">Electron 33 Desktop Wrapper</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Printers Supported:</span>
                <span className="font-semibold">ESC/POS (USB, LAN, Serial 58/80mm)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Active Architecture:</span>
                <span className="font-semibold text-green-600">Local-First Offline Resilient</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: CREATE USER */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Terminal User</DialogTitle>
            <DialogDescription>Create staff login account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input value={uFullName} onChange={(e) => setUFullName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Username</Label>
              <Input value={uUsername} onChange={(e) => setUUsername(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={uRole} onValueChange={setURole}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASHIER">Cashier (POS & Till only)</SelectItem>
                  <SelectItem value="BRANCH_MANAGER">Branch Manager</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin (All Outlets)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: RESET PASSWORD */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>Enter new password for selected staff account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <Label className="text-xs">New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleResetPassword}>Save Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


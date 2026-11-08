import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3456';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('restopos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('restopos_token');
      localStorage.removeItem('restopos_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

// ==================== BRANCHES ====================
export const branchAPI = {
  getAll: () => api.get('/branches'),
  getById: (id: string) => api.get(`/branches/${id}`),
  update: (id: string, data: any) => api.put(`/branches/${id}`, data),
};

// ==================== MENU ====================
export const menuAPI = {
  getCategories: () => api.get('/menu/categories'),
  createCategory: (data: any) => api.post('/menu/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),

  getItems: (params?: { categoryId?: string; branchId?: string; search?: string }) =>
    api.get('/menu/items', { params }),
  getItemByCode: (code: string) => api.get(`/menu/items/code/${code}`),
  createItem: (data: any) => api.post('/menu/items', data),
  updateItem: (id: string, data: any) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`),

  getBranchPrices: (branchId: string) => api.get(`/menu/branch-prices/${branchId}`),
  setBranchPrice: (data: any) => api.post('/menu/branch-prices', data),
};

// ==================== BILLING ====================
export const billingAPI = {
  createBill: (data: any) => api.post('/billing/bills', data),
  getBills: (params?: {
    branchId?: string;
    status?: string;
    orderType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/billing/bills', { params }),
  getBillById: (id: string) => api.get(`/billing/bills/${id}`),
  updateBill: (id: string, data: any) => api.put(`/billing/bills/${id}`, data),
  settleBill: (id: string, payments: any[]) =>
    api.post(`/billing/bills/${id}/settle`, { payments }),
  holdBill: (id: string) => api.post(`/billing/bills/${id}/hold`),
  cancelBill: (id: string, reason: string) =>
    api.post(`/billing/bills/${id}/cancel`, { reason }),
  getHeldBills: (branchId: string) =>
    api.get('/billing/bills', { params: { branchId, status: 'HELD' } }),
  printKOT: (billId: string, itemIds: string[]) =>
    api.post(`/billing/bills/${billId}/kot`, { itemIds }),
  printReceipt: (billId: string) =>
    api.post(`/billing/bills/${billId}/print`),

  // Tables
  getTables: (branchId: string) => api.get(`/billing/tables`, { params: { branchId } }),
  getTableStatus: (branchId: string) => api.get(`/billing/tables/status`, { params: { branchId } }),
};

// ==================== INVENTORY ====================
export const inventoryAPI = {
  getItems: (params?: { branchId?: string; search?: string; lowStock?: boolean }) =>
    api.get('/inventory/items', { params }),
  createItem: (data: any) => api.post('/inventory/items', data),
  updateItem: (id: string, data: any) => api.put(`/inventory/items/${id}`, data),
  adjustStock: (id: string, data: { quantity: number; type: string; reference?: string }) =>
    api.post(`/inventory/items/${id}/adjust`, data),
  getStockLogs: (itemId: string) => api.get(`/inventory/items/${itemId}/logs`),

  // Recipes
  getRecipe: (menuItemId: string) => api.get(`/inventory/recipes/${menuItemId}`),
  setRecipe: (menuItemId: string, ingredients: any[]) =>
    api.post(`/inventory/recipes/${menuItemId}`, { ingredients }),

  // Purchases
  getPurchases: (params?: { branchId?: string; supplierId?: string }) =>
    api.get('/inventory/purchases', { params }),
  createPurchase: (data: any) => api.post('/inventory/purchases', data),
  updatePurchasePayment: (id: string, data: any) =>
    api.put(`/inventory/purchases/${id}/payment`, data),

  // Suppliers
  getSuppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (data: any) => api.post('/inventory/suppliers', data),
  updateSupplier: (id: string, data: any) => api.put(`/inventory/suppliers/${id}`, data),

  // Stock Transfers
  getTransfers: (params?: { branchId?: string }) =>
    api.get('/inventory/transfers', { params }),
  createTransfer: (data: any) => api.post('/inventory/transfers', data),
  completeTransfer: (id: string) => api.post(`/inventory/transfers/${id}/complete`),
};

// ==================== EXPENSES ====================
export const expenseAPI = {
  getCategories: () => api.get('/expenses/categories'),
  createCategory: (data: any) => api.post('/expenses/categories', data),

  getExpenses: (params?: {
    branchId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/expenses', { params }),
  createExpense: (data: any) => api.post('/expenses', data),
  updateExpense: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),

  // Cash Drawer
  openDrawer: (data: { branchId: string; openingBalance: number }) =>
    api.post('/expenses/cash-drawer/open', data),
  closeDrawer: (id: string, data: { actualClosing: number; notes?: string }) =>
    api.post(`/expenses/cash-drawer/${id}/close`, data),
  getCurrentDrawer: (branchId: string) =>
    api.get(`/expenses/cash-drawer/current`, { params: { branchId } }),
  getDrawerHistory: (params?: { branchId?: string; startDate?: string; endDate?: string }) =>
    api.get('/expenses/cash-drawer/history', { params }),
};

// ==================== REPORTS ====================
export const reportsAPI = {
  getDailySummary: (branchId: string, date?: string) =>
    api.get('/reports/daily-summary', { params: { branchId, date } }),
  getSalesReport: (params: {
    branchId?: string;
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }) => api.get('/reports/sales', { params }),
  getTopSellingItems: (params: {
    branchId?: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }) => api.get('/reports/top-items', { params }),
  getExpenseReport: (params: {
    branchId?: string;
    startDate: string;
    endDate: string;
  }) => api.get('/reports/expenses', { params }),
  getGstReport: (params: {
    branchId?: string;
    startDate: string;
    endDate: string;
  }) => api.get('/reports/gst', { params }),
  getProfitLoss: (params: {
    branchId?: string;
    startDate: string;
    endDate: string;
  }) => api.get('/reports/profit-loss', { params }),
  getBranchComparison: (params: {
    startDate: string;
    endDate: string;
  }) => api.get('/reports/branch-comparison', { params }),
  exportToExcel: (reportType: string, params: any) =>
    api.get(`/reports/export/${reportType}`, { params, responseType: 'blob' }),
};

// ==================== SETTINGS ====================
export const settingsAPI = {
  getGlobal: () => api.get('/settings/global'),
  updateGlobal: (settings: Record<string, string>) =>
    api.put('/settings/global', { settings }),
  getBranch: (branchId: string) => api.get(`/settings/branch/${branchId}`),
  updateBranch: (branchId: string, settings: Record<string, string>) =>
    api.put(`/settings/branch/${branchId}`, { settings }),
  getPaymentModes: () => api.get('/settings/payment-modes'),
  updatePaymentMode: (id: string, data: any) => api.put(`/settings/payment-modes/${id}`, data),
  createPaymentMode: (data: any) => api.post('/settings/payment-modes', data),

  // Users
  getUsers: () => api.get('/settings/users'),
  createUser: (data: any) => api.post('/settings/users', data),
  updateUser: (id: string, data: any) => api.put(`/settings/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/settings/users/${id}/reset-password`, { newPassword }),

  // Backup
  createBackup: () => api.post('/settings/backup'),
  getBackups: () => api.get('/settings/backups'),
};

export default api;


import { create } from 'zustand';

export interface CartItem {
  id: string;            // temporary cart ID
  menuItemId: string;
  name: string;
  shortCode: string;
  unitPrice: number;     // in paise
  quantity: number;
  gstRate: number;
  notes: string;
  discountType: 'flat' | 'percent';
  discountValue: number; // paise or basis points
  discountAmount: number;
  gstAmount: number;
  total: number;
  isKotPrinted: boolean;
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

interface BillState {
  // Current bill being built
  orderType: OrderType;
  tableId: string | null;
  tableName: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  cart: CartItem[];

  // Bill-level modifiers
  billDiscountType: 'flat' | 'percent';
  billDiscountValue: number;
  parcelCharges: number;
  gstEnabled: boolean;
  notes: string;

  // Computed totals (recalculated on every cart change)
  subtotal: number;
  billDiscountAmount: number;
  totalGst: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  roundOff: number;
  netTotal: number;

  // Held bill ID (if resuming)
  heldBillId: string | null;

  // Actions
  setOrderType: (type: OrderType) => void;
  setTable: (tableId: string | null, tableName: string | null) => void;
  setCustomer: (name: string, phone: string, address?: string) => void;
  addItem: (item: Omit<CartItem, 'id' | 'discountType' | 'discountValue' | 'discountAmount' | 'gstAmount' | 'total' | 'isKotPrinted'>) => void;
  updateItemQuantity: (cartId: string, quantity: number) => void;
  incrementItem: (cartId: string) => void;
  decrementItem: (cartId: string) => void;
  removeItem: (cartId: string) => void;
  setItemNotes: (cartId: string, notes: string) => void;
  setItemDiscount: (cartId: string, type: 'flat' | 'percent', value: number) => void;
  setBillDiscount: (type: 'flat' | 'percent', value: number) => void;
  setParcelCharges: (charges: number) => void;
  setGstEnabled: (enabled: boolean) => void;
  setNotes: (notes: string) => void;
  markKotPrinted: (cartIds: string[]) => void;
  loadHeldBill: (billId: string, items: CartItem[], meta: Partial<BillState>) => void;
  clearBill: () => void;
  recalculate: () => void;
}

let cartIdCounter = 0;
const generateCartId = () => `cart_${++cartIdCounter}_${Date.now()}`;

function calculateItemTotal(item: CartItem, gstEnabled: boolean): CartItem {
  const lineTotal = item.unitPrice * item.quantity;
  let discountAmount = 0;

  if (item.discountType === 'flat') {
    discountAmount = item.discountValue;
  } else {
    discountAmount = Math.round((lineTotal * item.discountValue) / 10000); // basis points
  }

  const afterDiscount = lineTotal - discountAmount;
  let gstAmount = 0;

  if (gstEnabled && item.gstRate > 0) {
    gstAmount = Math.round((afterDiscount * item.gstRate) / 100);
  }

  return {
    ...item,
    discountAmount,
    gstAmount,
    total: afterDiscount + gstAmount,
  };
}

function recalculateTotals(state: BillState): Partial<BillState> {
  const cart = state.cart.map((item) => calculateItemTotal(item, state.gstEnabled));

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  let billDiscountAmount = 0;
  if (state.billDiscountType === 'flat') {
    billDiscountAmount = state.billDiscountValue;
  } else {
    billDiscountAmount = Math.round((subtotal * state.billDiscountValue) / 10000);
  }

  const afterBillDiscount = subtotal - billDiscountAmount;
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxableAmount = afterBillDiscount - itemDiscounts;

  let totalGst = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;

  if (state.gstEnabled) {
    // Calculate weighted GST
    totalGst = cart.reduce((sum, item) => sum + item.gstAmount, 0);
    cgstAmount = Math.round(totalGst / 2);
    sgstAmount = totalGst - cgstAmount;
  }

  const grandTotal = taxableAmount + totalGst + state.parcelCharges;
  const roundOff = Math.round(grandTotal / 100) * 100 - grandTotal; // round to nearest rupee
  const netTotal = grandTotal + roundOff;

  return {
    cart,
    subtotal,
    billDiscountAmount,
    totalGst,
    cgstAmount,
    sgstAmount,
    grandTotal,
    roundOff,
    netTotal,
  };
}

export const useBillStore = create<BillState>((set, get) => ({
  orderType: 'DINE_IN',
  tableId: null,
  tableName: null,
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  cart: [],
  billDiscountType: 'flat',
  billDiscountValue: 0,
  parcelCharges: 0,
  gstEnabled: false,
  notes: '',
  subtotal: 0,
  billDiscountAmount: 0,
  totalGst: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  grandTotal: 0,
  roundOff: 0,
  netTotal: 0,
  heldBillId: null,

  setOrderType: (type) => set({ orderType: type }),

  setTable: (tableId, tableName) => set({ tableId, tableName }),

  setCustomer: (name, phone, address = '') =>
    set({ customerName: name, customerPhone: phone, customerAddress: address }),

  addItem: (item) => {
    const state = get();
    // Check if same item already in cart (merge quantities)
    const existingIndex = state.cart.findIndex(
      (ci) => ci.menuItemId === item.menuItemId && ci.notes === item.notes
    );

    let newCart: CartItem[];
    if (existingIndex >= 0) {
      newCart = [...state.cart];
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        quantity: newCart[existingIndex].quantity + item.quantity,
      };
    } else {
      const cartItem: CartItem = {
        ...item,
        id: generateCartId(),
        discountType: 'flat',
        discountValue: 0,
        discountAmount: 0,
        gstAmount: 0,
        total: item.unitPrice * item.quantity,
        isKotPrinted: false,
      };
      newCart = [...state.cart, cartItem];
    }

    set({ cart: newCart });
    set((s) => recalculateTotals(s) as any);
  },

  updateItemQuantity: (cartId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartId);
      return;
    }
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === cartId ? { ...item, quantity } : item
      ),
    }));
    set((s) => recalculateTotals(s) as any);
  },

  incrementItem: (cartId) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === cartId ? { ...item, quantity: item.quantity + 1 } : item
      ),
    }));
    set((s) => recalculateTotals(s) as any);
  },

  decrementItem: (cartId) => {
    const state = get();
    const item = state.cart.find((i) => i.id === cartId);
    if (item && item.quantity <= 1) {
      get().removeItem(cartId);
    } else {
      set((state) => ({
        cart: state.cart.map((item) =>
          item.id === cartId ? { ...item, quantity: item.quantity - 1 } : item
        ),
      }));
      set((s) => recalculateTotals(s) as any);
    }
  },

  removeItem: (cartId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== cartId),
    }));
    set((s) => recalculateTotals(s) as any);
  },

  setItemNotes: (cartId, notes) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === cartId ? { ...item, notes } : item
      ),
    }));
  },

  setItemDiscount: (cartId, type, value) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === cartId
          ? { ...item, discountType: type, discountValue: value }
          : item
      ),
    }));
    set((s) => recalculateTotals(s) as any);
  },

  setBillDiscount: (type, value) => {
    set({ billDiscountType: type, billDiscountValue: value });
    set((s) => recalculateTotals(s) as any);
  },

  setParcelCharges: (charges) => {
    set({ parcelCharges: charges });
    set((s) => recalculateTotals(s) as any);
  },

  setGstEnabled: (enabled) => {
    set({ gstEnabled: enabled });
    set((s) => recalculateTotals(s) as any);
  },

  setNotes: (notes) => set({ notes }),

  markKotPrinted: (cartIds) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        cartIds.includes(item.id) ? { ...item, isKotPrinted: true } : item
      ),
    }));
  },

  loadHeldBill: (billId, items, meta) => {
    set({
      heldBillId: billId,
      cart: items,
      ...meta,
    });
    set((s) => recalculateTotals(s) as any);
  },

  clearBill: () => {
    set({
      orderType: 'DINE_IN',
      tableId: null,
      tableName: null,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      cart: [],
      billDiscountType: 'flat',
      billDiscountValue: 0,
      parcelCharges: 0,
      notes: '',
      subtotal: 0,
      billDiscountAmount: 0,
      totalGst: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      grandTotal: 0,
      roundOff: 0,
      netTotal: 0,
      heldBillId: null,
    });
  },

  recalculate: () => {
    set((s) => recalculateTotals(s) as any);
  },
}));


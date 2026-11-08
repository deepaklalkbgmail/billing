/**
 * Helper utility functions for RestoPOS backend
 */

export function generateBillNumber(
  branchCode: string,
  counter: number,
  date: Date = new Date()
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const countPadded = String(counter).padStart(5, '0');
  return `${branchCode}-${year}${month}-${countPadded}`;
}

export function paise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function rupees(paiseVal: number): number {
  return Number((paiseVal / 100).toFixed(2));
}

export interface GSTCalculationResult {
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

export function calculateGST(
  amount: number,
  rate: number,
  mode: 'exclusive' | 'inclusive' = 'exclusive'
): GSTCalculationResult {
  if (rate <= 0 || amount <= 0) {
    return {
      taxableAmount: amount,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      totalAmount: amount,
    };
  }

  if (mode === 'inclusive') {
    // amount is inclusive of GST: taxable = amount / (1 + rate / 100)
    const taxableAmount = Math.round((amount * 100) / (100 + rate));
    const gstAmount = amount - taxableAmount;
    const cgstAmount = Math.floor(gstAmount / 2);
    const sgstAmount = gstAmount - cgstAmount;
    return {
      taxableAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      totalAmount: amount,
    };
  } else {
    // amount is exclusive of GST
    const taxableAmount = amount;
    const gstAmount = Math.round((amount * rate) / 100);
    const cgstAmount = Math.floor(gstAmount / 2);
    const sgstAmount = gstAmount - cgstAmount;
    return {
      taxableAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      totalAmount: amount + gstAmount,
    };
  }
}

export function roundToRupee(paiseVal: number): { rounded: number; roundOff: number } {
  const rounded = Math.round(paiseVal / 100) * 100;
  const roundOff = rounded - paiseVal;
  return { rounded, roundOff };
}

export function dateRange(
  startDate?: string | Date,
  endDate?: string | Date
): { gte: Date; lte: Date } {
  let gte: Date;
  let lte: Date;

  if (startDate) {
    gte = new Date(startDate);
    gte.setHours(0, 0, 0, 0);
  } else {
    gte = new Date();
    gte.setHours(0, 0, 0, 0);
  }

  if (endDate) {
    lte = new Date(endDate);
    lte.setHours(23, 59, 59, 999);
  } else if (startDate) {
    lte = new Date(startDate);
    lte.setHours(23, 59, 59, 999);
  } else {
    lte = new Date();
    lte.setHours(23, 59, 59, 999);
  }

  return { gte, lte };
}

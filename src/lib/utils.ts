import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats an integer amount in paise to Indian Rupee format, e.g. 123456 -> "₹1,234.56"
 */
export function formatCurrency(paise: number): string {
  const rupees = (paise || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Formats a Date or date string to "DD/MM/YYYY"
 */
export function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Formats a Date or date string to "DD/MM/YYYY HH:mm"
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm");
}

/**
 * Generates a formatted bill number like "B1-2024-00001"
 */
export function generateBillNumber(branchCode: string, counter: number): string {
  const year = new Date().getFullYear();
  const paddedCounter = String(counter).padStart(5, "0");
  return `${branchCode.toUpperCase()}-${year}-${paddedCounter}`;
}

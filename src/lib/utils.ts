import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundToNearest250(amount: number) {
  return Math.round(amount / 250) * 250;
}

export function formatCurrency(amount: number) {
  // Always round to nearest 250 for Iraqi Dinar as per user request
  const rounded = roundToNearest250(amount);
  return new Intl.NumberFormat("en-IQ", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(rounded).replace("IQD", "د.ع");
}

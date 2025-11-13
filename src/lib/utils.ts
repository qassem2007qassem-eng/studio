import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow as formatDistanceToNowFns, format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatDistanceToNow(date: Date | string | number): string {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "تاريخ غير صالح";
    }
    return formatDistanceToNowFns(dateObj, { addSuffix: true, locale: ar });
  } catch (error) {
    return "تاريخ غير صالح";
  }
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow as formatDistanceToNowFns, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Timestamp } from "firebase/firestore";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const safeToDate = (timestamp: string | Timestamp | Date | undefined | null): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    // Attempt to parse string dates, including ISO strings
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            // Handle Firestore-like object structure if it's not a Timestamp instance
            if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
                 return new Date((timestamp as any).seconds * 1000);
            }
            return null; // Invalid date string
        }
        return date;
    } catch (e) {
        return null; // Error during date parsing
    }
};


export function formatDistanceToNow(date: Date | string | number | Timestamp): string {
  try {
    const dateObj = safeToDate(date);
     if (!dateObj) {
      return "تاريخ غير صالح";
    }
    return formatDistanceToNowFns(dateObj, { addSuffix: true, locale: ar });
  } catch (error) {
    return "تاريخ غير صالح";
  }
}

/**
 * Converts a File object to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 data URL.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

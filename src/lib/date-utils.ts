// src/lib/date-utils.ts (เวอร์ชันที่ควรจะเป็น)
import {
    parseISO as dateFnsParseISO, // Not directly used if parseDateString is robust
    isValid as dateFnsIsValid,
    format as dateFnsFormat,
    addDays as dateFnsAddDays,
    differenceInDays as dateFnsDifferenceInDays,
} from 'date-fns';

export function parseDateString(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    // Your robust parsing logic for YYYY-MM-DD or DD/MM/YYYY
    // Example simplified:
    const d = dateFnsParseISO(dateString); // parseISO handles YYYY-MM-DD
    if (dateFnsIsValid(d)) return d;

    if (dateString.includes('/')) { // Attempt DD/MM/YYYY
        const [day, month, year] = dateString.split('/').map(Number);
        if (year && month && day) {
            const parsed = new Date(Date.UTC(year, month - 1, day));
            if (dateFnsIsValid(parsed)) return parsed;
        }
    }
    console.warn(`Invalid date string for parsing: ${dateString}`);
    return null;
}

export function formatDateToDDMMYYYY(date: Date | string | null | undefined): string {
    const d = typeof date === 'string' ? parseDateString(date) : date;
    if (!d || !dateFnsIsValid(d)) return '-';
    return dateFnsFormat(d, 'dd/MM/yyyy');
}

export function addDays(date: Date, days: number): Date {
    if (!dateFnsIsValid(date)) throw new Error("Invalid date provided to addDays");
    return dateFnsAddDays(date, days);
}

export function differenceInDays(dateLeft: Date, dateRight: Date): number {
    if (!dateFnsIsValid(dateLeft) || !dateFnsIsValid(dateRight)) {
        // Handle invalid dates appropriately, perhaps return null or throw error
        // console.error("Invalid date(s) provided to differenceInDays");
        return NaN; // Or handle error
    }
    return dateFnsDifferenceInDays(dateLeft, dateRight);
}

export function getTodayUTCMidnight(): Date {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

// Optional: export isValid if needed directly
export function isValidDate(date: Date): boolean {
    return dateFnsIsValid(date);
}

export const format = dateFnsFormat;
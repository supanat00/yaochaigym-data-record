"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getGoogleSheet, SheetRowData } from "@/lib/google-sheets.utils"; // Assuming SheetRowData is exported
import { UnifiedCustomer, CourseType } from "@/types/customer";
import { CustomerActionResponse, CustomerFetchResponse } from "@/types/base";
import {
    addDays as dateFnsAddDays,
    isValid as dateFnsIsValid,
    parseISO as dateFnsParseISO,
    format as dateFnsFormat,
    differenceInDays as dateFnsDifferenceInDays
} from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { getTodayUTCMidnight } from '@/lib/date-utils';
import { CompensationMode } from '@/components/customer/customer-management-tabs';

// ========================================================================
// Schemas Validation
// ========================================================================

const commonCustomerSchemaBase = {
    FullName: z.string().trim().min(1, { message: "กรุณากรอกชื่อลูกค้า" }),
    Phone: z.string().trim().optional().refine(val => !val || /^[0-9]{9,10}$/.test(val), { message: "เบอร์โทรศัพท์ไม่ถูกต้อง (9-10 หลัก)" }),
    StartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "รูปแบบวันที่เริ่มไม่ถูกต้อง (YYYY-MM-DD)" }),
};

const monthlySpecificSchema = z.object({
    CourseType: z.literal('รายเดือน'),
    DurationOrPackage: z.string().min(1, { message: "กรุณาเลือกระยะเวลาคอร์ส" }),
    RemainingSessions: z.null().optional().default(null),
    BonusSessions: z.null().optional().default(null),
});

const sessionSpecificSchema = z.object({
    CourseType: z.literal('รายครั้ง'),
    DurationOrPackage: z.string().min(1, { message: "กรุณาเลือกแพ็กเกจ" }),
    RemainingSessions: z.coerce.number().int().min(0).optional().nullable().default(null),
    BonusSessions: z.coerce.number().int().min(0).optional().default(0),
});

const AddCustomerSchema = z.discriminatedUnion("CourseType", [
    z.object({ ...commonCustomerSchemaBase, ...monthlySpecificSchema.shape }),
    z.object({ ...commonCustomerSchemaBase, ...sessionSpecificSchema.shape })
]);

const UpdateCustomerSchema = z.object({
    CustomerID: z.string().min(1, { message: "ต้องมี CustomerID" }),
    FullName: z.string().trim().min(1, { message: "ชื่อต้องไม่ว่าง" }),
    Phone: z.string().trim().optional().refine(val => !val || /^[0-9]{9,10}$/.test(val), { message: "เบอร์โทรศัพท์ไม่ถูกต้อง" }),
    StartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "รูปแบบวันที่เริ่มไม่ถูกต้อง" }),
    CourseType: z.enum(['รายเดือน', 'รายครั้ง'], { required_error: "ต้องระบุประเภทคอร์ส" }),
    DurationOrPackage: z.string().min(1, { message: "ต้องระบุระยะเวลา/แพ็กเกจ" }),
    TotalCompensationDays: z.coerce.number().int().min(0).optional().default(0),
    ManualEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "รูปแบบวันที่ไม่ถูกต้อง" }).optional().or(z.literal('')),
    RemainingSessions: z.coerce.number().int().min(0).optional().nullable(),
    BonusSessions: z.coerce.number().int().min(0).optional().default(0),
});

const DeleteCustomerSchema = z.object({
    CustomerID: z.string().min(1, { message: "ต้องมี CustomerID" }),
});

const MarkUsageSchema = z.object({
    CustomerID: z.string().min(1, { message: "ต้องมี CustomerID" }),
});

const CompensationActionSchema = z.object({
    daysToAdd: z.coerce.number().int().min(1, "จำนวนวันต้องอย่างน้อย 1 วัน").max(14, "จำนวนวันต้องไม่เกิน 14 วัน"),
    mode: z.enum(['all-monthly', 'selected-customers'])
        .nullable().optional()
        .transform(val => val || 'all-monthly') // Default if null/undefined
        .refine((val): val is Extract<CompensationMode, 'all-monthly' | 'selected-customers'> =>
            val === 'all-monthly' || val === 'selected-customers', { message: "Mode ไม่ถูกต้อง" }),
    targetCustomerIds: z.string().nullable().optional()
        .transform((val, ctx) => {
            if (val === null || typeof val === 'undefined' || val.trim() === '') return [] as string[];
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string' || typeof id === 'number')) {
                    return parsed.map(id => String(id).trim()).filter(id => id !== '') as string[];
                }
                // Removed throw new Error here, ctx.addIssue is enough
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "IDs ลูกค้าที่เลือก (targetCustomerIds) ต้องเป็น JSON array ของ string/number" });
                return z.NEVER;
            } catch { // Changed error to _ since we're not using it
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "IDs ลูกค้าที่เลือก (targetCustomerIds) ไม่ใช่ JSON ที่ถูกต้อง" });
                return z.NEVER;
            }
        }).default(""), // Default for the transformed value (string[])
});

// ========================================================================
// Helper Functions
// ========================================================================
const calculateOriginalEndDate = (startDateStr: string, durationOrPackage: string, courseType: CourseType | string): Date | null => {
    const startDate = dateFnsParseISO(startDateStr);
    if (!dateFnsIsValid(startDate)) return null;
    let calculatedEndDate: Date | null = null;
    if (courseType === 'รายเดือน') {
        const match = durationOrPackage.match(/(\d+)\s*เดือน/);
        if (match?.[1]) calculatedEndDate = dateFnsAddDays(startDate, (parseInt(match[1], 10) * 30) - 1);
    } else if (courseType === 'รายครั้ง') {
        const monthMatch = durationOrPackage.match(/\/ (\d+)\s*เดือน/);
        if (monthMatch?.[1]) calculatedEndDate = dateFnsAddDays(startDate, (parseInt(monthMatch[1], 10) * 30) - 1);
    }
    return (calculatedEndDate && dateFnsIsValid(calculatedEndDate)) ? calculatedEndDate : null;
};

const calculateInitialSessions = (packageString: string): number => {
    const match = packageString.match(/^(\d+)\s*ครั้ง/);
    return match?.[1] ? parseInt(match[1], 10) : 0;
};

// ========================================================================
// Server Actions
// ========================================================================

export async function getCustomers(): Promise<CustomerFetchResponse<UnifiedCustomer>> {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const WORKSHEET_TITLE = "Customers";
    if (!SHEET_ID) return { success: false, message: "Sheet ID not configured." };
    try {
        const sheet = await getGoogleSheet(SHEET_ID, WORKSHEET_TITLE, true);
        const rows = await sheet.getRows<SheetRowData>(); // Use SheetRowData
        const customers: UnifiedCustomer[] = rows
            .filter(row => {
                const fullName = row.get('FullName');
                const customerID = row.get('CustomerID');
                return typeof fullName === 'string' && fullName.trim() !== '' && (typeof customerID === 'string' || typeof customerID === 'number') && String(customerID).trim() !== '';
            })
            .map((row): UnifiedCustomer => {
                const customerID = String(row.get('CustomerID') || '').trim();
                const checkInHistoryString = String(row.get('CheckInHistory') || '[]');
                let checkInHistory: string[] = [];
                try {
                    const parsedHistory = JSON.parse(checkInHistoryString);
                    if (Array.isArray(parsedHistory) && parsedHistory.every(item => typeof item === 'string')) {
                        checkInHistory = parsedHistory;
                    }
                } catch { }

                return {
                    rowNumber: typeof row.rowNumber === 'number' ? row.rowNumber : -1, // Ensure rowNumber is number
                    CustomerID: customerID,
                    FullName: String(row.get('FullName') || ''),
                    Phone: String(row.get('Phone') || '') || undefined,
                    CourseType: String(row.get('CourseType') || '') as CourseType | string,
                    StartDate: String(row.get('StartDate') || ''),
                    DurationOrPackage: String(row.get('DurationOrPackage') || ''),
                    OriginalEndDate: String(row.get('OriginalEndDate') || ''),
                    ManualEndDate: String(row.get('ManualEndDate') || '') || undefined,
                    TotalCompensationDays: parseInt(String(row.get('TotalCompensationDays') || '0'), 10) || 0,
                    RemainingSessions: String(row.get('CourseType') || '') === 'รายครั้ง' ? (parseInt(String(row.get('RemainingSessions') || '0'), 10) || 0) : null,
                    BonusSessions: String(row.get('CourseType') || '') === 'รายครั้ง' ? (parseInt(String(row.get('BonusSessions') || '0'), 10) || 0) : null,
                    CheckInHistory: checkInHistory,
                };
            });
        return { success: true, data: customers };
    } catch (error: unknown) { return { success: false, message: `Error fetching customers: ${error instanceof Error ? error.message : 'Unknown'}` }; }
}

export async function addCustomer(prevState: CustomerActionResponse, formData: FormData): Promise<CustomerActionResponse> {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = AddCustomerSchema.safeParse(rawData);
    if (!validatedFields.success) return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: validatedFields.error.flatten().fieldErrors };

    const customerData = validatedFields.data;
    const originalEndDate = calculateOriginalEndDate(customerData.StartDate, customerData.DurationOrPackage, customerData.CourseType);
    if (!originalEndDate) return { success: false, message: "ไม่สามารถคำนวณวันหมดอายุเริ่มต้นได้" };

    const customerId = uuidv4();
    const dataToAdd: SheetRowData = {
        CustomerID: customerId,
        FullName: customerData.FullName,
        Phone: customerData.Phone || '',
        CourseType: customerData.CourseType,
        StartDate: customerData.StartDate,
        DurationOrPackage: customerData.DurationOrPackage,
        OriginalEndDate: dateFnsFormat(originalEndDate, 'yyyy-MM-dd'),
        ManualEndDate: dateFnsFormat(originalEndDate, 'yyyy-MM-dd'),
        TotalCompensationDays: 0,
        RemainingSessions: customerData.CourseType === 'รายครั้ง' ? (customerData.RemainingSessions ?? calculateInitialSessions(customerData.DurationOrPackage)) : null,
        BonusSessions: customerData.CourseType === 'รายครั้ง' ? (customerData.BonusSessions ?? 0) : null,
        CheckInHistory: '[]',
    };

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const WORKSHEET_TITLE = "Customers";
    if (!SHEET_ID) return { success: false, message: "Sheet ID not configured." };
    try {
        const sheet = await getGoogleSheet(SHEET_ID, WORKSHEET_TITLE, false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await sheet.addRow(dataToAdd as any);
        revalidatePath('/');
        return { success: true, message: `เพิ่มลูกค้า "${customerData.FullName}" (ID: ${customerId}) สำเร็จ` };
    } catch (error: unknown) { return { success: false, message: `Error adding customer: ${error instanceof Error ? error.message : 'Unknown'}` }; }
}

export async function updateCustomer(prevState: CustomerActionResponse, formData: FormData): Promise<CustomerActionResponse> {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = UpdateCustomerSchema.safeParse(rawData);
    if (!validatedFields.success) {
        return { success: false, message: "ข้อมูลที่แก้ไขไม่ถูกต้อง", errors: validatedFields.error.flatten().fieldErrors };
    }
    const { CustomerID, CourseType, StartDate, DurationOrPackage, ManualEndDate, TotalCompensationDays, RemainingSessions, BonusSessions, FullName, Phone } = validatedFields.data;
    const newOriginalEndDate = calculateOriginalEndDate(StartDate, DurationOrPackage, CourseType);
    if (!newOriginalEndDate) return { success: false, message: "ไม่สามารถคำนวณวันหมดอายุเริ่มต้นได้" };

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const WORKSHEET_TITLE = "Customers";
    if (!SHEET_ID) return { success: false, message: "Sheet ID not configured." };
    try {
        const sheet = await getGoogleSheet(SHEET_ID, WORKSHEET_TITLE, false);
        const rows = await sheet.getRows<SheetRowData>();
        const rowToUpdate = rows.find(r => String(r.get('CustomerID') || '').trim() === String(CustomerID).trim());
        if (!rowToUpdate) return { success: false, message: `ไม่พบลูกค้า ID: ${CustomerID}` };

        const oldStartDate = String(rowToUpdate.get('StartDate') || '');
        const isRenewal = oldStartDate !== StartDate;

        rowToUpdate.set('FullName', FullName);
        rowToUpdate.set('Phone', Phone || '');
        rowToUpdate.set('StartDate', StartDate);
        rowToUpdate.set('CourseType', CourseType);
        rowToUpdate.set('DurationOrPackage', DurationOrPackage);
        rowToUpdate.set('OriginalEndDate', dateFnsFormat(newOriginalEndDate, 'yyyy-MM-dd'));
        rowToUpdate.set('ManualEndDate', ManualEndDate || '');
        rowToUpdate.set('TotalCompensationDays', (TotalCompensationDays ?? 0).toString());
        if (CourseType === 'รายครั้ง') {
            rowToUpdate.set('RemainingSessions', (RemainingSessions ?? calculateInitialSessions(DurationOrPackage)).toString());
            rowToUpdate.set('BonusSessions', (BonusSessions ?? 0).toString());
            if (isRenewal) rowToUpdate.set('CheckInHistory', '[]');
        } else {
            rowToUpdate.set('RemainingSessions', '');
            rowToUpdate.set('BonusSessions', '');
            if (isRenewal) rowToUpdate.set('CheckInHistory', '[]');
        }
        await rowToUpdate.save({ raw: true });
        revalidatePath('/');
        return { success: true, message: `อัปเดตข้อมูล "${FullName}" เรียบร้อยแล้ว` };
    } catch (error: unknown) { return { success: false, message: `Error updating customer: ${error instanceof Error ? error.message : 'Unknown'}` }; }
}

export async function deleteCustomer(prevState: CustomerActionResponse, formData: FormData): Promise<CustomerActionResponse> {
    const validatedFields = DeleteCustomerSchema.safeParse({ CustomerID: formData.get('CustomerID') });
    if (!validatedFields.success) return { success: false, message: "ข้อมูลไม่ถูกต้อง (CustomerID)", errors: validatedFields.error.flatten().fieldErrors };
    const { CustomerID } = validatedFields.data;
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const WORKSHEET_TITLE = "Customers";
    if (!SHEET_ID) return { success: false, message: "Sheet ID not configured." };
    try {
        const sheet = await getGoogleSheet(SHEET_ID, WORKSHEET_TITLE, false);
        const rows = await sheet.getRows<SheetRowData>();
        const rowToDelete = rows.find(r => String(r.get('CustomerID') || '').trim() === String(CustomerID).trim());
        if (!rowToDelete) return { success: false, message: `ไม่พบลูกค้า ID: ${CustomerID}` };
        const name = String(rowToDelete.get('FullName') || '') || `ลูกค้า ID ${CustomerID}`;
        await rowToDelete.delete();
        revalidatePath('/');
        return { success: true, message: `ลบข้อมูล "${name}" เรียบร้อยแล้ว` };
    } catch (error: unknown) { return { success: false, message: `Error deleting customer: ${error instanceof Error ? error.message : 'Unknown'}` }; }
}

export async function markSessionUsage(prevState: CustomerActionResponse, formData: FormData): Promise<CustomerActionResponse> {
    const validatedFields = MarkUsageSchema.safeParse({ CustomerID: formData.get('CustomerID') });
    if (!validatedFields.success) return { success: false, message: "ข้อมูลไม่ถูกต้อง (CustomerID)", errors: validatedFields.error.flatten().fieldErrors };
    const { CustomerID } = validatedFields.data;
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const WORKSHEET_TITLE = "Customers";
    if (!SHEET_ID) return { success: false, message: "Sheet ID not configured." };
    try {
        const sheet = await getGoogleSheet(SHEET_ID, WORKSHEET_TITLE, false);
        const rows = await sheet.getRows<SheetRowData>();
        const rowToUpdate = rows.find(r => String(r.get('CustomerID') || '').trim() === String(CustomerID).trim());
        if (!rowToUpdate) return { success: false, message: `ไม่พบลูกค้า ID: ${CustomerID}` };
        const customerName = String(rowToUpdate.get('FullName') || '') || `ลูกค้า ID ${CustomerID}`;
        if (String(rowToUpdate.get('CourseType') || '') !== 'รายครั้ง') return { success: false, message: `"${customerName}" ไม่ใช่ลูกค้ารายครั้ง` };

        const remainingSessions = parseInt(String(rowToUpdate.get('RemainingSessions') || '0'), 10); // Changed to const
        if (isNaN(remainingSessions) || remainingSessions <= 0) return { success: false, message: `"${customerName}" ไม่มีจำนวนครั้งเหลือแล้ว` };

        const newRemaining = remainingSessions - 1;
        rowToUpdate.set('RemainingSessions', newRemaining.toString());

        const currentCheckInHistoryString = String(rowToUpdate.get('CheckInHistory') || '[]');
        let currentCheckInHistory: string[] = [];
        try {
            const parsed = JSON.parse(currentCheckInHistoryString);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                currentCheckInHistory = parsed;
            }
        } catch { /* Start with empty if parsing fails */ }
        currentCheckInHistory.push(dateFnsFormat(new Date(), 'yyyy-MM-dd'));
        rowToUpdate.set('CheckInHistory', JSON.stringify(currentCheckInHistory));

        await rowToUpdate.save({ raw: true });
        revalidatePath('/');
        return { success: true, message: `เช็คอิน ${customerName} สำเร็จ (เหลือ ${newRemaining} ครั้ง)` };
    } catch (error: unknown) { return { success: false, message: `Error marking usage: ${error instanceof Error ? error.message : 'Unknown'}` }; }
}

export async function addCompensationToCustomers(prevState: CustomerActionResponse, formData: FormData): Promise<CustomerActionResponse> {
    const rawData = {
        daysToAdd: formData.get('daysToAdd'),
        mode: formData.get('mode') as CompensationMode | undefined,
        targetCustomerIds: formData.get('targetCustomerIds'),
    };
    const validatedFields = CompensationActionSchema.safeParse(rawData);
    if (!validatedFields.success) {
        return { success: false, message: "ข้อมูลไม่ถูกต้อง: " + (validatedFields.error.flatten().fieldErrors.daysToAdd?.[0] || "ตรวจสอบข้อมูล"), errors: validatedFields.error.flatten().fieldErrors };
    }
    const { daysToAdd, mode, targetCustomerIds } = validatedFields.data;

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const WORKSHEET_TITLE = "Customers";
    if (!SHEET_ID) return { success: false, message: "Sheet ID not configured." };
    try {
        const sheet = await getGoogleSheet(SHEET_ID, WORKSHEET_TITLE, false);
        const rows = await sheet.getRows<SheetRowData>();
        let updatedCount = 0;
        const today = getTodayUTCMidnight();

        const updatePromises = rows.map(async (row) => {
            const customerSheetId = String(row.get('CustomerID') || '').trim();
            const fullName = String(row.get('FullName') || '').trim();
            if (!customerSheetId || !fullName) return;

            // const courseTypeFromSheet = String(row.get('CourseType') || ''); // Not used if 'all-monthly' means all eligible

            if (mode === 'selected-customers') {
                if (!targetCustomerIds || targetCustomerIds.length === 0 || !targetCustomerIds.includes(customerSheetId)) {
                    return;
                }
            } else if (mode === 'all-monthly') {
                // If 'all-monthly' from dropdown should strictly mean only 'รายเดือน' type customers:
                // if (courseTypeFromSheet !== 'รายเดือน') {
                //     return; // Skip non-monthly customers
                // }
                // Current behavior (no courseType filter here) means it applies to all eligible customers regardless of type.
            }

            const originalEndDateStr = String(row.get('OriginalEndDate') || '').trim();
            let eligibilityEndDate: Date | null = null;
            if (originalEndDateStr) eligibilityEndDate = dateFnsParseISO(originalEndDateStr);
            if (!eligibilityEndDate || !dateFnsIsValid(eligibilityEndDate) || dateFnsDifferenceInDays(eligibilityEndDate, today) < 0) {
                return;
            }

            const manualEndDateStr = String(row.get('ManualEndDate') || '').trim();
            let baseDateForCompensation: Date | null = null;
            if (manualEndDateStr) {
                const parsedMED = dateFnsParseISO(manualEndDateStr);
                if (dateFnsIsValid(parsedMED)) baseDateForCompensation = parsedMED;
            }
            if (!baseDateForCompensation) baseDateForCompensation = eligibilityEndDate;

            if (baseDateForCompensation) {
                const newManualEndDate = dateFnsAddDays(baseDateForCompensation, daysToAdd);
                row.set('ManualEndDate', dateFnsFormat(newManualEndDate, 'yyyy-MM-dd'));
                await row.save({ raw: true });
                updatedCount++;
            }
        });
        await Promise.all(updatePromises);
        if (updatedCount > 0) {
            revalidatePath('/');
            return { success: true, message: `เพิ่มวันชดเชย ${daysToAdd} วัน ให้ลูกค้า ${updatedCount} คนสำเร็จ.` };
        } else {
            return { success: true, message: mode === 'selected-customers' && targetCustomerIds.length > 0 ? "ลูกค้าที่เลือกอาจไม่เข้าเกณฑ์" : "ไม่พบลูกค้าที่เข้าเกณฑ์" };
        }
    } catch (error: unknown) { return { success: false, message: `Error adding compensation: ${error instanceof Error ? error.message : 'Unknown'}` }; }
}
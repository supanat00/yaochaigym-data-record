// src/types/customer.ts
import { CustomerActionResponse as BaseActionResponse, CustomerFetchResponse as BaseFetchResponse } from './base';

// Type สำหรับ CourseType
export type CourseType = 'รายเดือน' | 'รายครั้ง';

// --- Type สำหรับข้อมูลดิบที่เก็บใน Sheet (รวม) ---
export interface UnifiedCustomer {
    rowNumber: number;
    CustomerID: string;
    FullName: string;
    Phone?: string;
    CourseType: CourseType | string; // "รายเดือน", "รายครั้ง"
    CheckInHistory?: string[];
    StartDate: string;      // YYYY-MM-DD
    DurationOrPackage: string; // รายเดือน : ["1 เดือน", "3 เดือน", "6 เดือน", "12 เดือน"] หรือ รายครั้ง : "10 ครั้ง / 2 เดือน", "20 ครั้ง / 4 เดือน", "30 ครั้ง / 6 เดือน"
    OriginalEndDate: string;  // YYYY-MM-DD
    ManualEndDate?: string | null; // YYYY-MM-DD
    TotalCompensationDays: number; // Default 0
    RemainingSessions?: number | null; // สำหรับรายครั้ง
    BonusSessions?: number | null;   // สำหรับรายครั้ง
}

// --- Type สำหรับข้อมูลที่จะแสดงผลใน UI (รวม Fields ที่คำนวณ) ---
export interface UnifiedCustomerDisplay extends UnifiedCustomer {
    // --- Fields ที่คำนวณ ---
    FinalEndDate: string;             // dd/MM/yyyy หรือ '-'
    FinalEndDateDate?: Date | null;
    RemainingDaysDisplay: string | number; // 'หมดอายุ', 'หมดวันนี้', หรือ number (สำหรับรายเดือน)
    RemainingSessionsDisplay: string | number; // จำนวนครั้งรวม หรือ '-' (สำหรับรายครั้ง)
    Status: 'ใช้งาน' | 'ใกล้หมดอายุ' | 'หมดอายุ (วัน)' | 'หมดอายุ (ครั้ง)' | 'ใกล้หมด (ครั้ง)' | '-'; // สถานะรวม
    StatusColorClass: string; // Tailwind class สำหรับสีสถานะ/วันที่เหลือ/ครั้งเหลือ

    // --- Fields สำหรับ Logic / Sort ---
    RemainingDaysRaw?: number | null;      // วันที่เหลือจริงๆ
    TotalRemainingSessions?: number | null; // ครั้งที่เหลือ + โบนัส

    // --- Fields แสดงผลเพิ่มเติม ---
    FormattedStartDate: string;
    FormattedOriginalEndDate: string;

    FormattedCheckInHistory?: { date: string; display: string }[]; // e.g., { date: "2024-05-10", display: "10 May 2024" }
}

// --- Type Response (ใช้จาก base.ts) ---
export type UnifiedCustomerActionResponse = BaseActionResponse;
export type UnifiedCustomerFetchResponse = BaseFetchResponse<UnifiedCustomer>;
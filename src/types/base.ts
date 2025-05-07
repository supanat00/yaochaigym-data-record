// src/types/base.ts

// ข้อมูลพื้นฐานที่อ่านจาก Sheet หรือตอนสร้าง
export interface BaseCustomer {
    rowNumber: number;       // หมายเลขแถวจาก library (ยังคงมีประโยชน์สำหรับการ debug หรืออ้างอิงดิบ)
    CustomerID: string;      // <<<< เพิ่ม CustomerID ที่คุณสร้างเอง (ควรเป็น string หรือ number ที่ไม่ซ้ำกัน)
    FullName: string;
    Nickname?: string;
    Phone?: string;
    StartDate: string;     // เก็บเป็น string YYYY-MM-DD
}

// Type สำหรับ Response ของ Action (ใช้กับ Add/Update/Delete ได้)
export type CustomerActionResponse = {
    success: boolean;
    message?: string | null;
    errors?: Record<string, string[] | undefined>;
};

// Type สำหรับ Response การ Fetch ข้อมูล (มี data array)
export type CustomerFetchResponse<T> = {
    success: boolean;
    message?: string | null;
    data?: T[];
    error?: string;
};
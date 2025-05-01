// src/app/actions/auth.actions.ts
"use server";

import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import bcrypt from 'bcrypt';
// **เพิ่ม import getAppSession ถ้ายังไม่มี**
import { getAppSession } from '@/lib/session'; // ตรวจสอบ Path!

export type LoginResponse = {
    success: boolean;
    message?: string | null;
    user?: {
        userId: string;
        fullName?: string;
        username?: string; // เพิ่ม username กลับไปด้วย
    };
    errors?: Record<string, string[] | undefined>;
};

export async function userLogin(prevState: LoginResponse, formData: FormData): Promise<LoginResponse> {

    const usernameInput = formData.get('username');
    const passwordInput = formData.get('password');

    if (typeof usernameInput !== 'string' || usernameInput.trim() === '' ||
        typeof passwordInput !== 'string' || passwordInput === '') {
        console.log("Login failed: Missing username or password input.");
        return { success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน" };
    }

    // *** ใช้ .trim() เพื่อตัดช่องว่างหน้า/หลัง ***
    const username = usernameInput.trim();
    console.log(`Login attempt for user (trimmed): '${username}'`); // Log username ที่ตัดช่องว่างแล้ว

    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_SHEET_USERS_WORKSHEET_TITLE = "auth"; // ชื่อ Worksheet
    // *** ตรวจสอบชื่อ Header ให้ตรงกับใน Sheet "auth" ***
    const USERNAME_COLUMN_HEADER = process.env.GOOGLE_SHEET_USERNAME_HEADER || 'User';
    const PASSWORD_HASH_COLUMN_HEADER = process.env.GOOGLE_SHEET_PASSWORD_HASH_HEADER || 'Password';
    const FULLNAME_COLUMN_HEADER = process.env.GOOGLE_SHEET_FULLNAME_HEADER || 'FullName';
    const STATUS_COLUMN_HEADER = process.env.GOOGLE_SHEET_STATUS_HEADER || 'Status';

    console.log(`Using Headers - User: "${USERNAME_COLUMN_HEADER}", PassHash: "${PASSWORD_HASH_COLUMN_HEADER}"`); // Log ชื่อ Header ที่ใช้

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
        console.error("CRITICAL: Missing Google credentials or Sheet ID env vars.");
        return { success: false, message: "Server configuration error." };
    }

    try {
        const serviceAccountAuth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        console.log(`Spreadsheet loaded: "${doc.title}"`);

        const sheet = doc.sheetsByTitle[GOOGLE_SHEET_USERS_WORKSHEET_TITLE];
        if (!sheet) {
            console.error(`Worksheet "${GOOGLE_SHEET_USERS_WORKSHEET_TITLE}" not found.`);
            console.log('Available sheets:', Object.keys(doc.sheetsByTitle));
            return { success: false, message: `Server error: Worksheet '${GOOGLE_SHEET_USERS_WORKSHEET_TITLE}' not found.` };
        }
        console.log(`Accessing worksheet: "${sheet.title}"`);

        try {
            const rows = await sheet.getRows();
            console.log(`Loaded ${rows.length} rows.`);

            let foundUserRow: GoogleSpreadsheetRow<Record<string, unknown>> | null = null;
            console.log(`Searching for user: '${username}' (case-insensitive)`);
            for (const row of rows) {
                const sheetUsernameObject = row.get(USERNAME_COLUMN_HEADER); // ค่าที่ได้อาจไม่ใช่ string เสมอไป
                // *** เพิ่มการตรวจสอบ Type และ .trim() ค่าจาก Sheet ***
                const sheetUsername = typeof sheetUsernameObject === 'string' ? sheetUsernameObject.trim() : null;

                // Log ค่าที่อ่านได้จาก Sheet (เฉพาะครั้งแรกๆ หรือถ้าไม่เจอ)
                // if (!foundUserRow) { // Log เฉพาะตอนยังไม่เจอ
                // console.log(`Checking row ${row.rowNumber}: Header "${USERNAME_COLUMN_HEADER}" value: '${sheetUsername}' (Type: ${typeof sheetUsernameObject})`);
                // }

                if (sheetUsername && sheetUsername.toLowerCase() === username.toLowerCase()) {
                    foundUserRow = row;
                    console.log(`User found in row ${row.rowNumber}: '${sheetUsername}'`);
                    break;
                }
            }

            if (!foundUserRow) {
                console.log(`Login failed: User '${username}' not found in sheet.`);
                return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
            }

            // --- ตรวจสอบ Password ---
            const storedPasswordHash = foundUserRow.get(PASSWORD_HASH_COLUMN_HEADER);
            // *** Log ค่า Hash ที่อ่านได้จาก Sheet (สำคัญมากสำหรับ Debug) ***
            console.log(`Password hash found for user: ${storedPasswordHash ? 'Exists' : 'MISSING!'} (Type: ${typeof storedPasswordHash})`);
            // console.log(`Stored Hash Value: ${storedPasswordHash}`); // Uncomment เพื่อดูค่า Hash จริง (ระวังเรื่องความปลอดภัย)


            if (!storedPasswordHash || typeof storedPasswordHash !== 'string') {
                console.error(`Security Error: Password hash missing or invalid format for user '${username}'. Check header "${PASSWORD_HASH_COLUMN_HEADER}".`);
                return { success: false, message: "เกิดข้อผิดพลาดในการยืนยันตัวตน (P1)" };
            }
            // ตรวจสอบเบื้องต้นว่าหน้าตาเหมือน Hash ไหม (ขึ้นต้นด้วย $2a$, $2b$, etc.)
            if (!storedPasswordHash.startsWith('$2')) {
                console.warn(`Warning: Stored value for user '${username}' in "${PASSWORD_HASH_COLUMN_HEADER}" doesn't look like a bcrypt hash.`);
            }


            console.log(`Comparing input password with stored hash for user '${username}'...`);
            let isPasswordValid = false;
            try {
                // *** ตรวจสอบให้แน่ใจว่า passwordInput ไม่ใช่ null/undefined ***
                if (passwordInput) {
                    isPasswordValid = await bcrypt.compare(passwordInput, storedPasswordHash);
                }
            } catch (bcryptError) {
                console.error(`Bcrypt comparison error for user '${username}':`, bcryptError);
                return { success: false, message: "เกิดข้อผิดพลาดในการยืนยันตัวตน (P2)" };
            }

            console.log(`Password comparison result: ${isPasswordValid}`); // *** Log ผลการเปรียบเทียบ ***

            if (!isPasswordValid) {
                console.log(`Login failed: Invalid password for user '${username}'.`);
                return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
            }

            // (Optional) ตรวจสอบสถานะ
            const userStatus = foundUserRow.get(STATUS_COLUMN_HEADER);
            if (userStatus && userStatus !== 'Active') { // เพิ่ม check ว่ามี status ไหม
                console.log(`Login failed: User '${username}' is inactive (Status: ${userStatus})`);
                return { success: false, message: "บัญชีของคุณยังไม่เปิดใช้งาน" };
            }

            // --- Login สำเร็จ! ---
            console.log(`Login successful for user: ${username}`);
            const userData = {
                userId: foundUserRow.get(USERNAME_COLUMN_HEADER) as string,
                fullName: (foundUserRow.get(FULLNAME_COLUMN_HEADER) as string) || '',
                username: username
            };

            // สร้าง Session
            try {
                const session = await getAppSession(); // ใช้ getAppSession ที่ import ไว้
                session.userId = userData.userId;
                session.username = userData.username;
                session.fullName = userData.fullName;
                await session.save();
                console.log('User session saved successfully.');

                return { success: true, message: "เข้าสู่ระบบสำเร็จ", user: userData };

            } catch (sessionError) {
                console.error(`Failed to save session for user '${username}':`, sessionError);
                return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกสถานะการเข้าสู่ระบบ' };
            }

        } catch (readError) {
            console.error(`Error reading rows from worksheet "${sheet.title}":`, readError);
            return { success: false, message: "เกิดข้อผิดพลาดในการอ่านข้อมูลผู้ใช้" };
        }

    } catch (error: unknown) { // ใช้ unknown
        console.error("Critical Error during Google Sheet connection/authentication:", error);

        let errorMessage = 'ไม่ทราบสาเหตุ';
        let statusCode: number | undefined = undefined;

        if (error instanceof Error) {
            errorMessage = error.message;
            // ตรวจสอบว่า error เป็น object และมี property 'response' หรือไม่
            if (typeof error === 'object' && error !== null && 'response' in error && error.response) {
                const response = error.response; // <--- ไม่ต้องใช้ as any แล้ว

                // ตรวจสอบว่า response เป็น object และมี property 'status' หรือไม่
                if (typeof response === 'object' && response !== null && 'status' in response) {
                    // ตรวจสอบ Type ของ status ก่อน Cast
                    if (typeof response.status === 'number') {
                        statusCode = response.status;
                    } else {
                        console.warn("Error response status is not a number:", response.status);
                    }
                }
            }
        } else {
            // ... (จัดการกรณี error ไม่ใช่ Error instance) ...
            console.error("Caught error is not an Error instance:", error);
            try {
                errorMessage = JSON.stringify(error);
            } catch {
                errorMessage = 'Unknown error format';
            }
        }

        // --- ใช้ statusCode และ errorMessage ที่ตรวจสอบแล้ว ---
        if (statusCode === 403) {
            console.error(">>> PERMISSION DENIED (403): Check Service Account sharing and API enablement. <<<");
            return { success: false, message: "การเข้าถึงข้อมูลถูกปฏิเสธ (403)." };
        } // ... other error checks ...
        else {
            return { success: false, message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${errorMessage}` };
        }
    }
}
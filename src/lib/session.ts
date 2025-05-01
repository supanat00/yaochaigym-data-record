// src/lib/session.ts
import { getIronSession, IronSession } from 'iron-session'; // เอา IronSessionData ออก
import { cookies } from 'next/headers';
// import { NextApiRequest, NextApiResponse } from 'next'; // ถ้าใช้ Pages API

// 1. กำหนด Type ข้อมูลของคุณเอง
//    ไม่ต้อง extends IronSessionData โดยตรง
export interface SessionData {
    userId?: string;
    username?: string;
    fullName?: string;
    // field อื่นๆ
}

// 2. Configuration (เหมือนเดิม)
const sessionOptions = {
    password: process.env.SESSION_PASSWORD as string,
    cookieName: 'yaochaigym-app-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: undefined,
    },
};

// 3. ฟังก์ชัน Utility (ใช้ IronSession<SessionData>)
export async function getAppSession(): Promise<IronSession<SessionData>> { // ระบุ Type ที่นี่
    // ... (โค้ดตรวจสอบ password เหมือนเดิม) ...
    if (!sessionOptions.password || sessionOptions.password.length < 32) {
        // ... (handle error/warning) ...
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SESSION_PASSWORD configuration error.');
        } else {
            console.warn('Using insecure default session password for development.');
            sessionOptions.password = 'default-insecure-dev-password-change-me-now-32-chars';
        }
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions); // ระบุ Type ที่นี่
    return session;
}

/*
// (Optional) Pages API version
export async function getPagesApiSession(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<IronSession<SessionData>> { // ระบุ Type ที่นี่
    // ... (โค้ดตรวจสอบ password เหมือนเดิม) ...
    const session = await getIronSession<SessionData>(req, res, sessionOptions); // ระบุ Type ที่นี่
    return session;
}
*/
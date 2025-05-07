// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/session'; // ตรวจสอบ Path ให้ถูกต้อง!

// --- Session Configuration (ต้องเหมือนกับใน lib/session.ts) ---
const sessionOptions = {
    // **สำคัญมาก:** ตรวจสอบว่าค่านี้ถูกตั้งใน .env.local และยาวพอ (32+ chars)
    password: process.env.SESSION_PASSWORD as string,
    // **สำคัญมาก:** ต้องตรงกับค่าใน src/lib/session.ts
    cookieName: 'yaochaigym-app-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production', // ใช้ HTTPS ใน Production
        httpOnly: true, // ป้องกันการเข้าถึงจาก Client-side JS
        sameSite: 'lax', // ป้องกัน CSRF เบื้องต้น
        maxAge: undefined, // Session cookie (หมดอายุเมื่อปิด Browser) หรือกำหนดเวลา (เป็นวินาที)
    },
};

// --- รายชื่อ Path ที่ *ไม่ต้อง* Login ก็เข้าได้ ---
// **สำคัญ:** ตรวจสอบรายการนี้ให้ดี Path ที่ต้องการป้องกันต้องไม่อยู่ในนี้
const PUBLIC_PATHS = [
    '/login',           // หน้า Login (เผื่อมี Path แยก แต่ในกรณีนี้ซ้ำกับ '/')
    // '/register',     // ตัวอย่าง: หน้าสมัครสมาชิก (ถ้ามี)
    // '/about',        // ตัวอย่าง: หน้าเกี่ยวกับเรา
    // '/api/public-data' // ตัวอย่าง: API ที่ไม่ต้อง Login
];

// --- Path ที่เป็นหน้า Login หลัก ---
// User ที่ยังไม่ Login จะถูกส่งมาที่นี่
const LOGIN_PATH = '/login';

// --- Path เริ่มต้นหลังจาก Login สำเร็จ ---
// User ที่ Login แล้ว จะถูกส่งไปที่นี่ถ้าพยายามเข้าหน้า Login อีกครั้ง
const HOME_PATH = '/';

// --- Middleware Function ---
export async function middleware(request: NextRequest) {
    // 1. ตรวจสอบการตั้งค่า SESSION_PASSWORD เบื้องต้น
    if (!sessionOptions.password || sessionOptions.password.length < 32) {
        console.error('CRITICAL SECURITY WARNING: SESSION_PASSWORD is not configured correctly in middleware!');
        // อาจจะแสดงหน้า Error ทันทีเพื่อความปลอดภัย
        return new Response('Internal Server Error: Session configuration issue.', { status: 500 });
    }

    // สร้าง Response เริ่มต้นเพื่อให้ getIronSession ทำงานได้
    const response = NextResponse.next();

    try {
        // 2. พยายามอ่าน Session จาก Cookie
        const session = await getIronSession<SessionData>(request, response, sessionOptions);

        // 3. ดึง Path ปัจจุบันที่ User ร้องขอ
        const { pathname } = request.nextUrl;

        // 4. ตรวจสอบสถานะการ Login (มี userId ใน session หรือไม่)
        const isLoggedIn = !!session.userId;

        // 5. ตรวจสอบว่า Path ปัจจุบันเป็น Public Path หรือไม่
        //    ใช้ .startsWith() เพื่อรองรับกรณีมี Sub-path เช่น /api/public-data/details
        const isPublicPath = PUBLIC_PATHS.some(publicPath =>
            pathname === publicPath || (publicPath !== '/' && pathname.startsWith(publicPath + '/')) || (publicPath === '/' && pathname === '/')
        );

        // --- Logging เพื่อ Debug ---
        console.log(`--------------------------------`);
        console.log(`Middleware Triggered`);
        console.log(`Pathname: ${pathname}`);
        console.log(`Is Logged In: ${isLoggedIn}`);
        console.log(`Is Public Path: ${isPublicPath}`);
        console.log(`--------------------------------`);


        // --- Logic การ Redirect ---

        // กรณีที่ 1: ยังไม่ได้ Login (isLoggedIn = false) และกำลังเข้าถึงหน้าที่ *ไม่ใช่* Public Path
        if (!isLoggedIn && !isPublicPath) {
            console.log(`   Action: Redirecting to LOGIN_PATH (${LOGIN_PATH}) because user is not logged in and accessing a protected path.`);
            // สร้าง URL สำหรับ Redirect ไปหน้า Login
            const redirectUrl = new URL(LOGIN_PATH, request.url);
            // (Optional) เพิ่ม Parameter บอกว่ามาจากไหน
            redirectUrl.searchParams.set('redirectedFrom', pathname);
            return NextResponse.redirect(redirectUrl);
        }

        // กรณีที่ 2: Login แล้ว (isLoggedIn = true) และกำลังพยายามเข้าถึงหน้า Login (LOGIN_PATH)
        if (isLoggedIn && pathname === LOGIN_PATH) {
            console.log(`   Action: Redirecting to HOME_PATH (${HOME_PATH}) because user is already logged in and accessing the login page.`);
            // สร้าง URL สำหรับ Redirect ไปหน้า Dashboard
            return NextResponse.redirect(new URL(HOME_PATH, request.url));
        }

        // กรณีอื่นๆ: (Login แล้วเข้าหน้าที่ได้รับอนุญาต หรือ ยังไม่ Login แต่เข้า Public Path)
        // ไม่ต้องทำอะไร ปล่อยให้ Request ดำเนินการต่อไปตามปกติ
        console.log(`   Action: Allowing request to proceed.`);
        // ส่ง response เดิมกลับไป (อาจมีการ update cookie จาก getIronSession)
        return response;

    } catch (error) {
        // จัดการ Error ที่อาจเกิดจาก getIronSession (เช่น key ผิด, cookie เสียหาย)
        console.error('Middleware error processing session:', error);
        // เพื่อความปลอดภัย อาจจะ Redirect ไปหน้า Login พร้อม Parameter บอก Error
        const errorRedirectUrl = new URL(LOGIN_PATH, request.url);
        errorRedirectUrl.searchParams.set('error', 'session_error');
        console.log(`   Action: Redirecting to LOGIN_PATH (${LOGIN_PATH}) due to session processing error.`);
        return NextResponse.redirect(errorRedirectUrl);
    }
}

// --- Configuration: กำหนดว่า Middleware จะทำงานกับ Path ไหนบ้าง ---
export const config = {
    matcher: [
        /*
         * Match ทุก Path ยกเว้นไฟล์ Static, รูปภาพ, API routes บางตัว (ถ้าต้องการ)
         * การกรอง Public Paths จะทำใน Logic ข้างบน
         * Pattern นี้ค่อนข้างครอบคลุมทั่วไป:
         */
        '/((?!api/|_next/static|_next/image|favicon.ico|images/).*)',

        /*
         * หรือถ้าต้องการให้ Match ทุกอย่างจริงๆ (รวมถึง API) แล้วไปกรองใน Logic ก็ใช้แบบนี้:
         * '/:path*'
         * แต่ต้องระวังเรื่อง Performance ถ้ามี API เยอะๆ ที่ไม่ต้องการ Middleware นี้
         */
    ],
};
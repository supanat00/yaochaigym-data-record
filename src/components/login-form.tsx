// src/components/login-form.tsx
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
// ตรวจสอบ Path import ให้ถูกต้อง
import { userLogin, LoginResponse } from '@/app/actions/auth.actions';

// ใช้ null สำหรับ message เริ่มต้น เพื่อให้ตรงกับ Type ที่แก้แล้ว
const initialState: LoginResponse = {
    success: false,
    message: null, // <--- เปลี่ยนจาก "" เป็น null
};

// Component ปุ่มแยก เพื่อใช้ useFormStatus
function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
    );
}

// Component หลักของฟอร์ม
export default function LoginForm() {
    const [state, formAction] = useActionState(userLogin, initialState);
    const router = useRouter();

    useEffect(() => {
        if (state.success) {
            // Redirect เมื่อ Login สำเร็จ
            console.log("Login successful in form, redirecting...");
            router.push('/'); // **เปลี่ยน path ถ้าหน้า dashboard ไม่ใช่ชื่อนี้**
        }
    }, [state.success, router]);

    return (
        // --- ส่วน UI ด้วย Tailwind ---
        <div className="w-full max-w-md px-8 py-10 bg-white shadow-xl rounded-lg border border-gray-200">
            <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
                เข้าสู่ระบบ
            </h2>
            <form action={formAction} className="space-y-6">
                {/* --- Username Input --- */}
                <div>
                    <label
                        htmlFor="username"
                        className="block text-sm font-medium text-gray-700"
                    >
                        ชื่อผู้ใช้ (UserID)
                    </label>
                    <div className="mt-1">
                        <input
                            id="username"
                            name="username" // ต้องตรงกับ formData.get('username')
                            type="text"
                            autoComplete="username"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            aria-describedby="username-error"
                        />
                    </div>
                    {/* สามารถเพิ่มการแสดง error เฉพาะ field ได้ ถ้า action ส่ง errors กลับมา */}
                    {/* <p id="username-error" className="mt-1 text-xs text-red-600">{state.errors?.username}</p> */}
                </div>

                {/* --- Password Input --- */}
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                    >
                        รหัสผ่าน
                    </label>
                    <div className="mt-1">
                        <input
                            id="password"
                            name="password" // ต้องตรงกับ formData.get('password')
                            type="password"
                            autoComplete="current-password"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            aria-describedby="password-error"
                        />
                    </div>
                    {/* <p id="password-error" className="mt-1 text-xs text-red-600">{state.errors?.password}</p> */}
                </div>

                {/* --- แสดง Error/Success Message ทั่วไป --- */}
                {state.message && (
                    <div
                        className={`p-3 rounded-md text-sm ${state.success
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                            }`}
                        role={state.success ? 'status' : 'alert'}
                    >
                        {state.message}
                        {state.success && ' กำลังนำคุณไป...'}
                    </div>
                )}

                {/* --- ปุ่ม Submit --- */}
                <div>
                    <SubmitButton />
                </div>
            </form>
        </div>
    );
}
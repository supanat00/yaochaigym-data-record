// src/components/customer/add-customer-form.tsx
'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
// *** Import Action เดียว ***
import { addCustomer } from '@/app/actions/customer.actions'; // << ตรวจสอบ Path
import { CustomerActionResponse } from "@/types/base"; // ตรวจสอบ Path
import { CourseType } from '@/types/customer'; // Import CourseType
import { Loader2 } from 'lucide-react';

// --- Helper Function แปลง Date ---
function getTodayDateString(): string {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const adjustedDate = new Date(today.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
}
// ---------------------------------

const initialState: CustomerActionResponse = { success: false, message: null, errors: {} };

interface AddCustomerFormProps {
    onSuccess?: () => void; // Callback เมื่อสำเร็จ (เพื่อปิด Modal)
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} aria-disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed">
            {pending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            บันทึกข้อมูลลูกค้า
        </button>
    );
}

export default function AddCustomerForm({ onSuccess }: AddCustomerFormProps) {
    // *** ใช้ Action รวม 'addCustomer' ***
    const [state, formAction] = useActionState(addCustomer, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const todayString = getTodayDateString();

    // *** State เก็บประเภทคอร์สที่เลือก ***
    const [selectedCourseType, setSelectedCourseType] = useState<CourseType | ''>('');

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        if (state.success) {
            console.log("AddCustomerForm submitted successfully.");
            timeoutId = setTimeout(() => {
                formRef.current?.reset(); // Reset ฟอร์ม
                setSelectedCourseType(''); // Reset ประเภทคอร์สที่เลือก
                // Reset date input
                const dateInput = formRef.current?.elements.namedItem('StartDate') as HTMLInputElement | null;
                if (dateInput) dateInput.value = getTodayDateString();
                if (onSuccess) onSuccess(); // ปิด Modal
            }, 1500);
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [state.success, state.message, onSuccess]);

    return (
        // *** ใช้ formAction ที่ผูกกับ 'addCustomer' ***
        <form ref={formRef} action={formAction} className="space-y-6">

            {/* --- ชื่อ ลูกค้า* --- */}
            <div>
                <label htmlFor="AddFullName" className="block text-lg font-medium leading-6 text-gray-900">ชื่อลูกค้า *</label>
                <div className="mt-2">
                    <input type="text" name="FullName" id="AddFullName" required placeholder="ชื่อจริง หรือ ชื่อเล่น" className="block w-full input-style" />
                </div>
                {state.errors?.FullName && <p className="mt-2 text-base text-red-600">{state.errors.FullName.join(', ')}</p>}
            </div>

            {/* --- เบอร์โทร --- */}
            <div>
                <label htmlFor="AddPhone" className="block text-lg font-medium leading-6 text-gray-900">เบอร์โทร</label>
                <div className="mt-2">
                    <input type="tel" name="Phone" id="AddPhone" placeholder="เช่น 0812345678" className="block w-full input-style" />
                </div>
                {state.errors?.Phone && <p className="mt-2 text-base text-red-600">{state.errors.Phone.join(', ')}</p>}
            </div>

            {/* --- วันที่เริ่มคอร์ส * --- */}
            <div>
                <label htmlFor="AddStartDate" className="block text-lg font-medium leading-6 text-gray-900">วันที่เริ่มคอร์ส *</label>
                <div className="mt-2">
                    <input type="date" name="StartDate" id="AddStartDate" required max={todayString} defaultValue={todayString} className="block w-full input-style" aria-describedby="startdate-help startdate-error" />
                </div>
                {state.errors?.StartDate && <p id="startdate-error" className="mt-2 text-base text-red-600">{state.errors.StartDate.join(', ')}</p>}
                <p id="startdate-help" className="mt-2 text-base text-gray-500">ไม่สามารถเลือกวันที่ล่วงหน้าได้</p>
            </div>

            {/* --- ประเภทคอร์ส * (Radio Buttons) --- */}
            <div>
                <label className="block text-lg font-medium leading-6 text-gray-900">ประเภทคอร์ส *</label>
                {state.errors?.CourseType && <p className="mt-1 text-xs text-red-600">{state.errors.CourseType.join(', ')}</p>}
                <fieldset className="mt-2">
                    <legend className="sr-only">เลือกประเภทคอร์ส</legend>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center gap-x-3">
                            <input
                                id="course-monthly" name="CourseType" type="radio" required value="รายเดือน"
                                // *** อัปเดต State เมื่อเลือก ***
                                onChange={(e) => setSelectedCourseType(e.target.value as CourseType)}
                                className="h-5 w-5 border-gray-300 text-indigo-600 focus:ring-indigo-600" // ขนาดใหญ่ขึ้น
                            />
                            <label htmlFor="course-monthly" className="block text-base font-medium leading-6 text-gray-900">รายเดือน</label>
                        </div>
                        <div className="flex items-center gap-x-3">
                            <input
                                id="course-session" name="CourseType" type="radio" required value="รายครั้ง"
                                // *** อัปเดต State เมื่อเลือก ***
                                onChange={(e) => setSelectedCourseType(e.target.value as CourseType)}
                                className="h-5 w-5 border-gray-300 text-teal-600 focus:ring-teal-600" // ใช้สี Teal
                            />
                            <label htmlFor="course-session" className="block text-base font-medium leading-6 text-gray-900">รายครั้ง</label>
                        </div>
                    </div>
                </fieldset>
            </div>

            {/* --- ตัวเลือกตามประเภทคอร์ส (แสดงผลแบบมีเงื่อนไข) --- */}
            {selectedCourseType === 'รายเดือน' && (
                <div>
                    <label htmlFor="AddDurationOrPackage" className="block text-lg font-medium leading-6 text-gray-900">ระยะเวลาคอร์ส (รายเดือน) *</label>
                    <div className="mt-2">
                        <select name="DurationOrPackage" id="AddDurationOrPackage" required className="block w-full input-style bg-white" defaultValue="">
                            <option value="" disabled>-- เลือกระยะเวลา --</option>
                            <option value="1 เดือน">1 เดือน (30 วัน)</option>
                            <option value="3 เดือน">3 เดือน (90 วัน)</option>
                            <option value="6 เดือน">6 เดือน (180 วัน)</option>
                            <option value="12 เดือน">12 เดือน (360 วัน)</option>
                        </select>
                    </div>
                    {/* *** ใช้ state.errors?.DurationOrPackage เพราะ Action อาจ Validate field นี้ *** */}
                    {state.errors?.DurationOrPackage && <p className="mt-2 text-base text-red-600">{state.errors.DurationOrPackage.join(', ')}</p>}
                </div>
            )}

            {selectedCourseType === 'รายครั้ง' && (
                <div>
                    <label htmlFor="AddDurationOrPackage" className="block text-lg font-medium leading-6 text-gray-900">แพ็กเกจ (รายครั้ง) *</label>
                    <div className="mt-2">
                        <select name="DurationOrPackage" id="AddDurationOrPackage" required className="block w-full input-style bg-white" defaultValue="">
                            <option value="" disabled>-- เลือกแพ็กเกจ --</option>
                            <option value="10 ครั้ง / 2 เดือน">10 ครั้ง / 2 เดือน</option>
                            <option value="20 ครั้ง / 4 เดือน">20 ครั้ง / 4 เดือน</option>
                            <option value="30 ครั้ง / 6 เดือน">30 ครั้ง / 6 เดือน</option>
                        </select>
                    </div>
                    {state.errors?.DurationOrPackage && <p className="mt-2 text-base text-red-600">{state.errors.DurationOrPackage.join(', ')}</p>}
                </div>
            )}

            {/* --- แสดง Error/Success Message ทั่วไป --- */}
            {state.message && (
                <div className={`p-4 rounded-lg text-base ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    role={state.success ? 'status' : 'alert'}>
                    {state.message}
                </div>
            )}

            {/* --- ปุ่ม Submit --- */}
            <div className="pt-6 flex justify-end">
                <SubmitButton />
            </div>
        </form>
    );
}
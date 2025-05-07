// src/components/customer/common/RenewCourseModal.tsx
'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XCircle, Loader2, History } from 'lucide-react'; // ลบ Save ออก ถ้า Action ที่ใช้ไม่ใช่ Update
import { useActionState } from 'react';
// *** Import Action ที่ถูกต้องสำหรับการ "ต่อคอร์ส" ***
// เราจะใช้ 'updateCustomer' เพราะเราต้องการอัปเดตข้อมูลคอร์สในแถวเดิม
import { updateCustomer } from '@/app/actions/customer.actions'; // <<<=== ใช้ updateCustomer
import { CustomerActionResponse } from '@/types/base';
import { CourseType } from '@/types/customer'; // Import CourseType ถ้ายังไม่มี
import { useFormStatus } from 'react-dom';

interface RenewCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerInfo: {

        fullName?: string;
        phone?: string | null;
        CustomerID: string;
    } | null;
    onSuccess: () => void;
}

// State เริ่มต้นสำหรับ Action updateCustomer
const initialRenewState: CustomerActionResponse = { success: false, message: null, errors: {} };

// Helper function หาวันที่ปัจจุบัน
function getTodayDateString(): string {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const adjustedDate = new Date(today.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
}

// *** Helper function formatPhoneNumber (ย้ายมาจาก Detail Modal หรือสร้างใหม่) ***
const formatPhoneNumber = (phone?: string | null): string => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
};

// *** Submit Button แยก ***
function RenewSubmitButton() {
    const { pending } = useFormStatus(); // Hook สำหรับ Form นี้
    return (
        <button type="submit" disabled={pending}
            className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'กำลังบันทึก...' : 'ยืนยันต่อคอร์ส'}
        </button>
    );
}

export default function RenewCourseModal({ isOpen, onClose, customerInfo, onSuccess }: RenewCourseModalProps) {
    // *** ใช้ Action 'updateCustomer' ***
    const [state, formAction] = useActionState(updateCustomer, initialRenewState);
    const formRef = useRef<HTMLFormElement>(null);
    const todayString = getTodayDateString();
    const [selectedCourseType, setSelectedCourseType] = useState<CourseType | ''>('');

    // Effect จัดการหลัง Action ทำงาน
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        if (state.success) {
            console.log("Renew course (update) action successful.");
            timeoutId = setTimeout(() => {
                formRef.current?.reset();
                setSelectedCourseType('');
                if (onSuccess) onSuccess();
            }, 1500);
        }
        // Reset form ถ้า Modal ปิด
        if (!isOpen && formRef.current) {
            formRef.current.reset();
            setSelectedCourseType('');
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [state.success, state.message, onSuccess, isOpen]);

    if (!isOpen || !customerInfo) return null;

    // Define reusable CSS classes (ตัวอย่าง)
    const labelClass = "block text-base font-medium leading-6 text-gray-900";
    const inputStyle = "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200";
    const errorTextStyle = "mt-1.5 text-sm text-red-600"; // ปรับขนาด error text
    const buttonBaseClass = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed";
    const secondaryButtonClass = `${buttonBaseClass} bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0`;


    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                {/* Overlay */}
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-[60] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel as="form" ref={formRef} action={formAction} className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gray-50 border-b">
                                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <History className="h-5 w-5 text-blue-600" />
                                        ต่อคอร์ส / ลงทะเบียนคอร์สใหม่
                                    </Dialog.Title>
                                    <button type="button" className="-m-1 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={onClose}> <XCircle className="h-5 w-5" /> </button>
                                </div>

                                {/* Body - ฟอร์ม */}
                                <div className="px-4 py-5 sm:p-6 space-y-5"> {/* เพิ่ม space-y */}
                                    {/* แสดงข้อมูลลูกค้า */}
                                    <div className='p-3 bg-blue-50 border border-blue-200 rounded-md'>
                                        <p className="text-sm font-medium text-blue-800">ลูกค้า:</p>
                                        <p className="text-lg font-semibold text-blue-900">{customerInfo.fullName || 'N/A'}</p>
                                        {customerInfo.phone && <p className="text-sm text-blue-700">เบอร์โทร: {formatPhoneNumber(customerInfo.phone)}</p>}
                                        {/* *** ส่ง Hidden Inputs ที่จำเป็นสำหรับ Action updateCustomer *** */}
                                        <input type="hidden" name="CustomerID" value={customerInfo.CustomerID} />
                                        <input type="hidden" name="FullName" value={customerInfo.fullName || ''} />
                                        <input type="hidden" name="Phone" value={customerInfo.phone || ''} />
                                        {/* ค่าเริ่มต้นสำหรับ Field อื่นๆ ที่ไม่มีในฟอร์มนี้ */}
                                        <input type="hidden" name="TotalCompensationDays" value="0" />
                                        <input type="hidden" name="ManualEndDate" value="" />
                                        {/* BonusSessions จะถูกจัดการในฟอร์มรายครั้ง หรือส่ง 0 */}
                                    </div>

                                    {/* วันที่เริ่มคอร์สใหม่ * */}
                                    <div>
                                        <label htmlFor="RenewStartDate" className={labelClass}>วันที่เริ่มคอร์สใหม่ *</label>
                                        <div className="mt-1.5">
                                            <input type="date" name="StartDate" id="RenewStartDate" required max={todayString} defaultValue={todayString} className={`block w-full ${inputStyle}`} />
                                        </div>
                                        {state.errors?.StartDate && <p className={errorTextStyle}>{state.errors.StartDate.join(', ')}</p>}
                                        <p className="mt-1.5 text-sm text-gray-500">เลือกวันที่เริ่มคอร์สใหม่ (ไม่เกินวันปัจจุบัน)</p>
                                    </div>

                                    {/* ประเภทคอร์ส * */}
                                    <div>
                                        <label className={labelClass}>ประเภทคอร์สใหม่ *</label>
                                        {state.errors?.CourseType && <p className="mt-1 text-xs text-red-600">{state.errors.CourseType.join(', ')}</p>}
                                        <fieldset className="mt-1.5">
                                            <legend className="sr-only">เลือกประเภทคอร์ส</legend>
                                            <div className="flex items-center space-x-6">
                                                <div className="flex items-center gap-x-2">
                                                    <input id="renew-monthly" name="CourseType" type="radio" required value="รายเดือน" onChange={(e) => setSelectedCourseType(e.target.value as CourseType)} className="h-5 w-5 border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                                                    <label htmlFor="renew-monthly" className="text-base font-medium leading-6 text-gray-900">รายเดือน</label>
                                                </div>
                                                <div className="flex items-center gap-x-2">
                                                    <input id="renew-session" name="CourseType" type="radio" required value="รายครั้ง" onChange={(e) => setSelectedCourseType(e.target.value as CourseType)} className="h-5 w-5 border-gray-300 text-teal-600 focus:ring-teal-600" />
                                                    <label htmlFor="renew-session" className="text-base font-medium leading-6 text-gray-900">รายครั้ง</label>
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {/* ตัวเลือกตามประเภทคอร์ส */}
                                    {selectedCourseType === 'รายเดือน' && (
                                        <div>
                                            <label htmlFor="RenewDurationOrPackageMonthly" className={labelClass}>ระยะเวลาคอร์ส *</label>
                                            <div className="mt-1.5">
                                                <select name="DurationOrPackage" id="RenewDurationOrPackageMonthly" required className={`block w-full bg-white ${inputStyle}`} defaultValue="">
                                                    <option value="" disabled>-- เลือกระยะเวลา --</option>
                                                    <option value="1 เดือน">1 เดือน (30 วัน)</option>
                                                    <option value="3 เดือน">3 เดือน (90 วัน)</option>
                                                    <option value="6 เดือน">6 เดือน (180 วัน)</option>
                                                    <option value="12 เดือน">12 เดือน (360 วัน)</option>
                                                </select>
                                            </div>
                                            {state.errors?.DurationOrPackage && <p className={errorTextStyle}>{state.errors.DurationOrPackage.join(', ')}</p>}
                                        </div>
                                    )}

                                    {selectedCourseType === 'รายครั้ง' && (
                                        <div className="space-y-4"> {/* Group session fields */}
                                            <div>
                                                <label htmlFor="RenewDurationOrPackageSession" className={labelClass}>แพ็กเกจ *</label>
                                                <div className="mt-1.5">
                                                    <select name="DurationOrPackage" id="RenewDurationOrPackageSession" required className={`block w-full bg-white ${inputStyle}`} defaultValue="">
                                                        <option value="" disabled>-- เลือกแพ็กเกจ --</option>
                                                        <option value="10 ครั้ง / 2 เดือน">10 ครั้ง / 2 เดือน</option>
                                                        <option value="20 ครั้ง / 4 เดือน">20 ครั้ง / 4 เดือน</option>
                                                        <option value="30 ครั้ง / 6 เดือน">30 ครั้ง / 6 เดือน</option>
                                                    </select>
                                                </div>
                                                {state.errors?.DurationOrPackage && <p className={errorTextStyle}>{state.errors.DurationOrPackage.join(', ')}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* --- แสดง Error/Success Message --- */}
                                    {state.message && (
                                        <div className={`p-3.5 rounded-lg text-base ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role={state.success ? 'status' : 'alert'}>
                                            {state.message}
                                        </div>
                                    )}

                                </div>

                                {/* Footer */}
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
                                    <RenewSubmitButton />
                                    <button type="button" className={`${secondaryButtonClass} mt-3 sm:mt-0`} onClick={onClose}>
                                        ยกเลิก
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
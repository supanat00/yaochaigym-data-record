// src/components/customer/common/confirm-add-compensation-modal.tsx
'use client';

import { Fragment, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useActionState } from 'react';
import { Loader2, CalendarPlus, AlertTriangle, UserCheck } from 'lucide-react';
import { CustomerActionResponse } from '@/types/base';
import { addCompensationToCustomers } from '@/app/actions/customer.actions'; // Unified action
import { CompensationMode } from '../customer-management-tabs'; // Import CompensationMode if defined there or from shared types

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: CompensationMode; // Mode: 'all-monthly' or 'selected-customers' (or null initially)
    targetCustomerIds?: string[]; // Array of selected customer CustomerIDs
}

const initialState: CustomerActionResponse = { success: false, message: null, errors: {} };

export default function ConfirmAddCompensationModal({
    isOpen,
    onClose,
    onSuccess,
    mode,
    targetCustomerIds = [], // Default to empty array
}: ConfirmModalProps) {
    const [state, formAction, isActionPending] = useActionState(addCompensationToCustomers, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const daysInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            formRef.current?.reset(); // Reset input fields on open
            // To make previous server messages disappear when modal reopens for a new operation:
            // One way is to ensure this component re-mounts by passing a unique `key` prop
            // from CustomerManagementTabs each time `isCompensationModalOpen` becomes true with a new `mode`.
            // Example in CustomerManagementTabs: key={`${compensationMode}-${Date.now()}`}
            // For now, messages from `state` will persist from the last action.
            const timer = setTimeout(() => {
                daysInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, mode]); // Re-focus if mode changes while modal is already open (edge case)

    useEffect(() => {
        let successTimeoutId: NodeJS.Timeout | null = null;
        if (state.success && state.message) {
            console.log("Compensation action in modal succeeded:", state.message);
            successTimeoutId = setTimeout(() => {
                onSuccess(); // Parent (CustomerManagementTabs) handles closing & data refresh
            }, 2000); // Show success message for 2 seconds
        } else if (!state.success && state.message && !isActionPending) {
            // Error messages are displayed directly from `state.message` in the JSX below
            console.error("Compensation action in modal failed:", state.message, state.errors);
        }
        return () => {
            if (successTimeoutId) clearTimeout(successTimeoutId);
        };
    }, [state, onSuccess, isActionPending]); // isActionPending helps prevent acting on stale state

    // Determine modal title, description, and icon based on the mode
    let modalTitle = "ยืนยันเพิ่มวันชดเชย";
    let modalDescription = "โปรดระบุจำนวนวันที่ต้องการเพิ่ม";
    let icon = <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />;
    let headerBgColor = 'bg-yellow-50 border-yellow-200';
    let titleTextColor = 'text-yellow-900';
    let submitButtonDisabled = isActionPending; // Base disabled state

    if (mode === 'all-monthly') {
        modalTitle = "เพิ่มวัน (รายเดือนทุกคน)";
        modalDescription = `คุณกำลังจะเพิ่มวันชดเชยให้กับลูกค้า <strong class="text-red-600">ทุกคน</strong> ที่คอร์สยังไม่หมดอายุ (อิงจาก Original End Date). วันที่เพิ่มจะถูกบวกเข้ากับ Manual End Date (หรือ Original End Date หากไม่มี).`;
        // icon and colors remain yellow for general warning
    } else if (mode === 'selected-customers') {
        modalTitle = `เพิ่มวัน (${targetCustomerIds.length} คนที่เลือก)`;
        modalDescription = `คุณกำลังจะเพิ่มวันชดเชยให้กับลูกค้า <strong class="text-blue-600">${targetCustomerIds.length} คน</strong> ที่คุณเลือก. วันที่เพิ่มจะถูกบวกเข้ากับ Manual End Date (หรือ Original End Date หากไม่มี) ของแต่ละคน.`;
        icon = <UserCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />;
        headerBgColor = 'bg-blue-50 border-blue-200';
        titleTextColor = 'text-blue-900';
        if (targetCustomerIds.length === 0) {
            // This case should ideally be prevented by CustomerManagementTabs,
            // but as a fallback, disable submit if no customers are selected for this mode.
            modalDescription = `<span class="text-red-500">ไม่ได้เลือกลูกค้า!</span> กรุณาปิด Modal นี้และเลือกลูกค้าก่อน`;
            submitButtonDisabled = true;
        }
    } else if (mode === null) { // Should not happen if CustomerManagementTabs guards rendering
        modalTitle = "กรุณาเลือกโหมดการทำงาน";
        modalDescription = "โปรดปิดและเลือกโหมดการเพิ่มวันชดเชยจากเมนูก่อน";
        submitButtonDisabled = true;
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => !isActionPending && onClose()}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
                </Transition.Child>
                <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel as="form" ref={formRef} action={formAction} className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                                {/* Hidden inputs for mode and targetCustomerIds */}
                                {mode && <input type="hidden" name="mode" value={mode} />}
                                {mode === 'selected-customers' && targetCustomerIds && targetCustomerIds.length > 0 && (
                                    <input type="hidden" name="targetCustomerIds" value={JSON.stringify(targetCustomerIds)} />
                                )}

                                <div className={`flex items-center justify-between px-4 py-3 sm:px-6 border-b ${headerBgColor}`}>
                                    <Dialog.Title as="h3" className={`text-lg font-semibold leading-6 flex items-center gap-2 ${titleTextColor}`}>
                                        {icon}
                                        {modalTitle}
                                    </Dialog.Title>
                                    <button type="button" className="-m-1 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={onClose} disabled={isActionPending}>
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="px-4 py-5 sm:p-6 space-y-4">
                                    <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: modalDescription }} />
                                    {(mode === 'all-monthly' || (mode === null && !targetCustomerIds.length)) && ( // Show general warning for bulk type operations
                                        <p className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                                            <strong className='font-medium'>ข้อควรระวัง:</strong> การดำเนินการนี้อาจใช้เวลาหากมีลูกค้าจำนวนมาก และไม่สามารถยกเลิกได้ง่าย กรุณาตรวจสอบจำนวนวันให้ถูกต้อง
                                        </p>
                                    )}
                                    <div>
                                        <label htmlFor="compDaysToAddModalInput" className="block text-sm font-medium leading-6 text-gray-900">จำนวนวันที่จะเพิ่ม *</label>
                                        <div className="mt-2">
                                            <input ref={daysInputRef} type="number" name="daysToAdd" id="compDaysToAddModalInput" required min="1" max="14" step="1" placeholder="1-14" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200" disabled={isActionPending || submitButtonDisabled} aria-describedby="days-error" />
                                        </div>
                                        {state.errors?.daysToAdd && <p id="days-error" className="mt-2 text-sm text-red-600">{state.errors.daysToAdd.join(', ')}</p>}
                                    </div>
                                    {!isActionPending && state.message && (
                                        <p className={`mt-3 text-sm font-medium ${state.success ? 'text-green-600' : 'text-red-600'}`}>{state.message}</p>
                                    )}
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                                    <button type="submit" disabled={isActionPending || submitButtonDisabled} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isActionPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<CalendarPlus className="mr-2 h-4 w-4" strokeWidth={2.5} />)}
                                        {isActionPending ? 'กำลังดำเนินการ...' : 'ยืนยันเพิ่มวัน'}
                                    </button>
                                    <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onClick={onClose} disabled={isActionPending}>ยกเลิก</button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
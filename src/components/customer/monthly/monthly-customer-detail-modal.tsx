// src/components/customer/monthly/monthly-customer-detail-modal.tsx
'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { UnifiedCustomerDisplay } from '@/types/customer';
import { format, isValid, parseISO } from 'date-fns';
import { Pencil, Trash2, XCircle, Loader2, Save, History } from 'lucide-react';
import { deleteCustomer, updateCustomer } from '@/app/actions/customer.actions';
import { CustomerActionResponse } from '@/types/base';
import { useActionState } from 'react'; // From 'react'
import RenewCourseModal from '../common/RenewCourseModal';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: UnifiedCustomerDisplay | null;
    onDataUpdate?: () => void;
}

const getStatusClasses = (status?: UnifiedCustomerDisplay['Status']): string => {
    switch (status) {
        case 'ใช้งาน': return 'bg-green-100 text-green-800';
        case 'ใกล้หมดอายุ': return 'bg-yellow-100 text-yellow-800';
        case 'หมดอายุ (วัน)': return 'bg-red-100 text-red-800';
        case 'หมดอายุ (ครั้ง)': return 'bg-red-100 text-red-800';
        case 'ใกล้หมด (ครั้ง)': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatPhoneNumber = (phone?: string | null): string => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    if (cleaned.length === 9) return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
    return phone;
};

const initialActionState: CustomerActionResponse = { success: false, message: null, errors: {} };

export default function MonthlyCustomerDetailModal({ isOpen, onClose, customer: initialCustomer, onDataUpdate }: ModalProps) {
    const [customer, setCustomer] = useState<UnifiedCustomerDisplay | null>(initialCustomer);
    const [isEditing, setIsEditing] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

    const [updateState, updateAction, isUpdatePending] = useActionState(updateCustomer, initialActionState);
    const [deleteState, deleteAction, isDeletePending] = useActionState(deleteCustomer, initialActionState);

    const editFormRef = useRef<HTMLFormElement>(null); // Ref for the actual <form> element

    useEffect(() => {
        setCustomer(initialCustomer);
        if (!isOpen || initialCustomer?.CustomerID !== customer?.CustomerID) {
            setIsEditing(false);
            // Reset form fields when modal opens for a new customer or is re-opened
            if (editFormRef.current && !isEditing) { // Only reset if not currently in edit mode (or if customer changes)
                editFormRef.current.reset();
            }
            // To clear previous action's state message, you might pass a unique key to this modal
            // when it's opened for a new purpose, forcing a re-mount of useActionState.
            // For now, state.message will show the last action's result until another action is performed.
        }
    }, [initialCustomer, isOpen, customer?.CustomerID, isEditing]); // Added isEditing

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        let actionCompleted = false;
        let actionMessage: string | null | undefined = null;

        if (updateState.success && updateState.message && !isUpdatePending) {
            actionCompleted = true;
            actionMessage = updateState.message;
            console.log("Update successful:", actionMessage);
        } else if (deleteState.success && deleteState.message && !isDeletePending) {
            actionCompleted = true;
            actionMessage = deleteState.message;
            console.log("Delete successful:", actionMessage);
        }

        if (actionCompleted) {
            timeoutId = setTimeout(() => {
                if (onDataUpdate) onDataUpdate();
                onClose();
                setIsEditing(false);
            }, 1500);
        }

        // Log errors when not pending
        if (!updateState.success && updateState.message && isEditing && !isUpdatePending) {
            console.log("Update failed. Message:", updateState.message, "Errors:", JSON.stringify(updateState.errors));
        }
        if (!deleteState.success && deleteState.message && !isDeletePending && !isEditing) {
            console.log("Delete failed. Message:", deleteState.message, "Errors:", JSON.stringify(deleteState.errors));
        }

        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [updateState, deleteState, onDataUpdate, onClose, isEditing, isUpdatePending, isDeletePending]);

    const handleEditToggle = () => {
        const nextIsEditing = !isEditing;
        setIsEditing(nextIsEditing);
        if (!nextIsEditing && editFormRef.current) {
            editFormRef.current.reset();
        }
    };

    const openRenewModal = () => setIsRenewModalOpen(true);
    const closeRenewModal = () => setIsRenewModalOpen(false);
    const handleRenewSuccess = () => { closeRenewModal(); if (onDataUpdate) onDataUpdate(); onClose(); };

    if (!customer || !isOpen) return null;

    const startDateForInput = customer.StartDate && isValid(parseISO(customer.StartDate)) ? customer.StartDate : '';
    const manualEndDateForInput = customer.ManualEndDate && isValid(parseISO(customer.ManualEndDate)) ? customer.ManualEndDate : '';
    const isCourseExpiredForRenewButton = (customer.RemainingDaysRaw ?? Infinity) <= 0;

    const labelClass = "block text-sm font-medium leading-6 text-gray-900";
    const valueClass = "mt-1 text-base text-gray-900";
    const smallLabelClass = "text-md font-medium text-gray-600 uppercase";
    const inputStyle = "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
    const inputDisplay = "block w-full rounded-md border-0 py-1.5 px-3 text-gray-500 bg-gray-100 ring-1 ring-inset ring-gray-200 sm:text-sm sm:leading-6";
    const errorTextStyle = "mt-2 text-xs text-red-600";
    const buttonBaseClass = "inline-flex items-center w-full justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed";
    const primaryButtonClass = `${buttonBaseClass} bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-500`;
    const secondaryButtonClass = `${buttonBaseClass} bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50`;
    const dangerButtonClass = `${buttonBaseClass} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`;
    const editButtonClass = `${buttonBaseClass} bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus-visible:outline-indigo-500`;
    const renewButtonClass = `${buttonBaseClass} bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600`;

    return (
        <>
            <Transition.Root show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-40" onClose={() => !(isUpdatePending || isDeletePending) && onClose()}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/60 backdrop-blur-sm" /></Transition.Child>
                    <div className="fixed inset-0 z-40 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                    <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gray-50 border-b border-gray-200">
                                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">{isEditing ? `แก้ไขข้อมูล: ${customer.FullName}` : `ข้อมูลลูกค้า: ${customer.FullName}`}</Dialog.Title>
                                        <button type="button" onClick={onClose} disabled={isUpdatePending || isDeletePending} className="-m-2 p-2 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"><XCircle className="h-5 w-5" /></button>
                                    </div>

                                    {isEditing ? (
                                        <form action={updateAction} ref={editFormRef}>
                                            <div className="px-4 py-5 sm:p-6 space-y-4">
                                                <input type="hidden" name="CustomerID" value={customer.CustomerID} />
                                                <input type="hidden" name="CourseType" value="รายเดือน" />
                                                {customer.DurationOrPackage && <input type="hidden" name="DurationOrPackage" value={customer.DurationOrPackage} />}
                                                <input type="hidden" name="StartDate" value={startDateForInput} />
                                                <input type="hidden" name="TotalCompensationDays" value={(customer.TotalCompensationDays ?? 0).toString()} />

                                                <div><label htmlFor="editMonthlyFullName" className={labelClass}>ชื่อลูกค้า *</label><div className="mt-2"><input type="text" name="FullName" id="editMonthlyFullName" required defaultValue={customer.FullName} className={inputStyle} disabled={isUpdatePending} /></div>{updateState.errors?.FullName && <p className={errorTextStyle}>{updateState.errors.FullName.join(', ')}</p>}</div>
                                                <div><label htmlFor="editMonthlyPhone" className={labelClass}>เบอร์โทร</label><div className="mt-2"><input type="tel" name="Phone" id="editMonthlyPhone" defaultValue={customer.Phone || ''} className={inputStyle} disabled={isUpdatePending} /></div>{updateState.errors?.Phone && <p className={errorTextStyle}>{updateState.errors.Phone.join(', ')}</p>}</div>
                                                <div><label className="block text-sm font-medium text-gray-500">วันที่เริ่ม (ไม่สามารถแก้ไข)</label><p className={`mt-2 ${inputDisplay}`}>{customer.FormattedStartDate}</p></div>
                                                <div><label htmlFor="editMonthlyManualEndDate" className={labelClass}>วันหมดอายุ (กำหนดเอง)</label><div className="mt-2"><input type="date" name="ManualEndDate" id="editMonthlyManualEndDate" defaultValue={manualEndDateForInput} className={inputStyle} disabled={isUpdatePending} aria-describedby="manual-endDate-help" /></div><p id="manual-endDate-help" className="mt-2 text-xs text-gray-500">กรอก YYYY-MM-DD เพื่อกำหนดเอง</p>{updateState.errors?.ManualEndDate && <p className={errorTextStyle}>{updateState.errors.ManualEndDate.join(', ')}</p>}</div>

                                                {!isUpdatePending && updateState.message && (
                                                    <div className={`mt-4 p-3 rounded-md text-sm ${updateState.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role={updateState.success ? 'status' : 'alert'}>
                                                        {updateState.message}
                                                        {!updateState.success && updateState.errors && Object.keys(updateState.errors).length > 0 && (
                                                            <ul className="list-disc list-inside mt-1 text-xs">
                                                                {Object.entries(updateState.errors).map(([field, errors]) => errors?.map((error, idx) => (<li key={`${field}-${idx}`}>{`${field}: ${error}`}</li>)))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-gray-50 px-4 py-4 sm:px-6 flex flex-col sm:flex-row-reverse items-center gap-3 border-t border-gray-200">
                                                <button type="submit" disabled={isUpdatePending} className={`${primaryButtonClass}`}>{isUpdatePending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{isUpdatePending ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</button>
                                                <button type="button" onClick={handleEditToggle} disabled={isUpdatePending} className={`${secondaryButtonClass}`}>ยกเลิกแก้ไข</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="px-4 py-5 sm:p-6 space-y-5">
                                                <div><span className="text-sm font-medium text-gray-500 mr-2">สถานะ:</span><span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusClasses(customer.Status)}`}>{customer.Status || '-'}</span></div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-gray-200">
                                                    <div><p className={smallLabelClass}>ID</p><p className={valueClass}>{customer.CustomerID || '-'}</p></div>
                                                    <div><p className={smallLabelClass}>ชื่อ</p><p className={valueClass}>{customer.FullName || '-'}</p></div>
                                                    <div><p className={smallLabelClass}>เบอร์โทร</p><p className={valueClass}>{formatPhoneNumber(customer.Phone)}</p></div>
                                                    <div><p className={smallLabelClass}>เริ่ม</p><p className={valueClass}>{customer.FormattedStartDate}</p></div>
                                                    <div><p className={smallLabelClass}>หมดอายุคอร์ส</p><p className="text-base text-gray-500">{customer.FormattedOriginalEndDate}</p></div>
                                                    <div><p className={smallLabelClass}>ระยะเวลา</p><p className={valueClass}>{customer.DurationOrPackage}</p></div>
                                                    {customer.ManualEndDate && isValid(parseISO(customer.ManualEndDate)) && (<div><p className={`${smallLabelClass} text-orange-600`}>หมดอายุ(ล่าสุด)</p><p className="text-base text-orange-700 font-semibold">{format(parseISO(customer.ManualEndDate), 'd MMM yy')}</p></div>)}
                                                    {(typeof customer.TotalCompensationDays === 'number' && customer.TotalCompensationDays > 0) && (<div><p className={smallLabelClass}>วันชดเชย</p><p className={valueClass}>{customer.TotalCompensationDays}</p></div>)}
                                                    <div className="sm:col-span-2 mt-2"><p className="text-md font-medium">เวลาคงเหลือ:</p><p className={`text-xl font-bold ${customer.StatusColorClass}`}>{customer.RemainingDaysDisplay} {typeof customer.RemainingDaysDisplay === 'number' ? 'วัน' : ''}</p></div>
                                                </div>
                                                {!isDeletePending && deleteState.message && !deleteState.success && (<div className="mt-4 p-3 text-sm bg-red-100 text-red-800 rounded-md" role="alert">{deleteState.message}</div>)}
                                            </div>
                                            <div className="bg-gray-100 px-4 py-4 sm:px-6 flex flex-col sm:flex-row-reverse items-center gap-3 border-t border-gray-200">
                                                {isCourseExpiredForRenewButton && (<button type="button" onClick={openRenewModal} disabled={isUpdatePending || isDeletePending} className={`${renewButtonClass} sm:ml-3`}><History className="h-4 w-4 mr-2" />ต่อคอร์ส</button>)}
                                                <button type="button" onClick={handleEditToggle} disabled={isUpdatePending || isDeletePending} className={`${editButtonClass}`}><Pencil className="h-4 w-4 mr-2" />แก้ไข</button>
                                                <form action={deleteAction} onSubmit={(e) => { if (!confirm(`ต้องการลบ "${customer.FullName}" (ID: ${customer.CustomerID})?`)) e.preventDefault(); }}>
                                                    <input type="hidden" name="CustomerID" value={customer.CustomerID} />
                                                    <button type="submit" disabled={isDeletePending || isUpdatePending} className={`${dangerButtonClass}`}>
                                                        {isDeletePending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                        {isDeletePending ? 'กำลังลบ...' : 'ลบ'}
                                                    </button>
                                                </form>
                                                <button type="button" onClick={onClose} disabled={isUpdatePending || isDeletePending} className={`${secondaryButtonClass} ml-auto sm:ml-0 mt-3 sm:mt-0`}> <XCircle className="h-4 w-4 mr-2" /> ปิด </button>
                                            </div>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
            {customer && (<RenewCourseModal isOpen={isRenewModalOpen} onClose={closeRenewModal} customerInfo={{ CustomerID: customer.CustomerID, fullName: customer.FullName, phone: customer.Phone, }} onSuccess={handleRenewSuccess} />)}
        </>
    );
}
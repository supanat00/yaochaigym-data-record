// src/components/customer/session/session-customer-detail-modal.tsx
'use client';

import { Fragment, useState, useEffect, useRef } from 'react'; // Removed useTransition as not directly needed for delete/update with useActionState
import { Dialog, Transition } from '@headlessui/react';
import { UnifiedCustomerDisplay } from '@/types/customer'; // Ensure this includes FormattedCheckInHistory
import { format, isValid, parseISO } from 'date-fns';
import { Pencil, Trash2, XCircle, Loader2, Save, History, CheckCircle, CalendarDays } from 'lucide-react';
import { deleteCustomer, updateCustomer, markSessionUsage } from '@/app/actions/customer.actions';
import { CustomerActionResponse } from '@/types/base';
import { useActionState, useTransition } from 'react'; // useTransition for markUsage
import RenewCourseModal from '../common/RenewCourseModal';

// ... (interface ModalProps, getStatusClasses, formatPhoneNumber, initialActionState - เหมือนเดิม) ...
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: UnifiedCustomerDisplay | null;
    onDataUpdate?: () => void;
}

const getStatusClasses = (status?: UnifiedCustomerDisplay['Status']): string => {
    switch (status) {
        case 'ใช้งาน': return 'bg-green-100 text-green-800';
        case 'ใกล้หมดอายุ': case 'ใกล้หมด (ครั้ง)': return 'bg-yellow-100 text-yellow-800';
        case 'หมดอายุ (วัน)': case 'หมดอายุ (ครั้ง)': return 'bg-red-100 text-red-800';
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


export default function SessionCustomerDetailModal({ isOpen, onClose, customer: initialCustomer, onDataUpdate }: ModalProps) {
    const [customer, setCustomer] = useState<UnifiedCustomerDisplay | null>(initialCustomer);
    const [isEditing, setIsEditing] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [localFeedbackMessage, setLocalFeedbackMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [updateState, updateAction, isUpdatePending] = useActionState(updateCustomer, initialActionState);
    const [deleteState, deleteAction, isDeletePending] = useActionState(deleteCustomer, initialActionState);
    const [isMarkUsageTransitionPending, startMarkUsageTransition] = useTransition();

    const editFormRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        setCustomer(initialCustomer);
        if (!isOpen || initialCustomer?.CustomerID !== customer?.CustomerID) {
            setIsEditing(false);
            setLocalFeedbackMessage(null);
            if (editFormRef.current && isEditing) {
                editFormRef.current.reset();
            }
        }
    }, [initialCustomer, isOpen, customer?.CustomerID, isEditing]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        let actionCompleted = false;
        let closeAfterTimeout = false;

        if (!isUpdatePending && updateState.message) {
            setLocalFeedbackMessage({ type: updateState.success ? 'success' : 'error', message: updateState.message });
            if (updateState.success) { actionCompleted = true; closeAfterTimeout = true; }
        }
        if (!isDeletePending && deleteState.message) {
            setLocalFeedbackMessage({ type: deleteState.success ? 'success' : 'error', message: deleteState.message });
            if (deleteState.success) { actionCompleted = true; closeAfterTimeout = true; }
        }

        if (actionCompleted && closeAfterTimeout) {
            timeoutId = setTimeout(() => {
                if (onDataUpdate) onDataUpdate();
                onClose();
                setIsEditing(false);
                setLocalFeedbackMessage(null);
            }, 1500);
        } else if (localFeedbackMessage && !isMarkUsageTransitionPending && !(actionCompleted && closeAfterTimeout)) { // Auto-clear for markUsage or non-closing errors
            timeoutId = setTimeout(() => {
                setLocalFeedbackMessage(null);
            }, 3000);
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [updateState, isUpdatePending, deleteState, isDeletePending, localFeedbackMessage, onDataUpdate, onClose, isMarkUsageTransitionPending]);

    const handleEditToggle = () => { /* ... */ setIsEditing(prev => !prev); setLocalFeedbackMessage(null); if (isEditing && editFormRef.current) editFormRef.current.reset(); };

    const handleMarkUsage = () => {
        if (!customer || !customer.CustomerID || isMarkUsageTransitionPending || (typeof customer.TotalRemainingSessions === 'number' && customer.TotalRemainingSessions <= 0)) return;
        setLocalFeedbackMessage(null);
        const formData = new FormData();
        formData.append('CustomerID', customer.CustomerID);
        startMarkUsageTransition(async () => {
            const result = await markSessionUsage(initialActionState, formData);
            setLocalFeedbackMessage({ type: result.success ? 'success' : 'error', message: result.message || (result.success ? "เช็คอินสำเร็จ!" : "เกิดข้อผิดพลาด") });
            if (result.success) {
                if (onDataUpdate) onDataUpdate();
                setTimeout(() => { onClose(); }, 1500);
            }
        });
    };

    const openRenewModal = () => setIsRenewModalOpen(true);
    const closeRenewModal = () => setIsRenewModalOpen(false);
    const handleRenewSuccess = () => { closeRenewModal(); if (onDataUpdate) onDataUpdate(); onClose(); };

    if (!customer || !isOpen) return null;

    const currentRemainingDaysRaw = customer.RemainingDaysRaw;
    const currentTotalRemainingSessions = customer.TotalRemainingSessions;
    const isDateExpired = typeof currentRemainingDaysRaw === 'number' && currentRemainingDaysRaw < 0;
    const noSessionsLeft = typeof currentTotalRemainingSessions === 'number' && currentTotalRemainingSessions <= 0;
    const isCourseEffectivelyExpired = isDateExpired || noSessionsLeft;

    const startDateForInput = customer.StartDate && isValid(parseISO(customer.StartDate)) ? customer.StartDate : '';
    const manualEndDateForInput = customer.ManualEndDate && isValid(parseISO(customer.ManualEndDate)) ? customer.ManualEndDate : '';
    const remainingSessionsForInput = (customer.RemainingSessions !== null && typeof customer.RemainingSessions !== 'undefined') ? customer.RemainingSessions : 0;
    const bonusSessionsForInput = (customer.BonusSessions !== null && typeof customer.BonusSessions !== 'undefined') ? customer.BonusSessions : 0;

    const labelClass = "block text-sm font-medium leading-6 text-gray-900";
    const valueClass = "mt-1 text-base text-gray-900";
    const smallLabelClass = "text-md font-medium text-gray-600 uppercase";
    const inputStyle = "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
    const errorTextStyle = "mt-2 text-xs text-red-600";
    const buttonBaseClass = "inline-flex items-center w-full justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed";
    const primaryButtonClass = `${buttonBaseClass} bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-500`;
    const secondaryButtonClass = `${buttonBaseClass} bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50`;
    const dangerButtonClass = `${buttonBaseClass} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`;
    const editButtonClass = `${buttonBaseClass} bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus-visible:outline-indigo-500`;
    const renewButtonClass = `${buttonBaseClass} bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600`;
    const markUsageButtonClass = `${buttonBaseClass} bg-teal-600 text-white hover:bg-teal-500 focus-visible:outline-teal-600`;

    return (
        <>
            <Transition.Root show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-40" onClose={() => !(isUpdatePending || isDeletePending || isMarkUsageTransitionPending) && onClose()}>
                    <Transition.Child as={Fragment} /* ...Overlay... */><div className="fixed inset-0 bg-black/60 backdrop-blur-sm" /></Transition.Child>
                    <div className="fixed inset-0 z-40 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
                            <Transition.Child as={Fragment} /* ...Panel Transition... */ >
                                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                    <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gray-50 border-b">
                                        <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">{isEditing ? `แก้ไข: ${customer.FullName}` : `ข้อมูล: ${customer.FullName}`}</Dialog.Title>
                                        <button type="button" onClick={onClose} disabled={isUpdatePending || isDeletePending || isMarkUsageTransitionPending} className="-m-2 p-2 rounded-full text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
                                    </div>
                                    {localFeedbackMessage && (<div className={`mx-4 mt-4 sm:mx-6 p-3 rounded-md text-sm ${localFeedbackMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">{localFeedbackMessage.message}</div>)}

                                    {isEditing ? (
                                        <form action={updateAction} ref={editFormRef}>
                                            <div className="px-4 py-5 sm:p-6 space-y-4">
                                                <input type="hidden" name="CustomerID" value={customer.CustomerID} />
                                                <input type="hidden" name="CourseType" value="รายครั้ง" />
                                                {customer.DurationOrPackage && <input type="hidden" name="DurationOrPackage" value={customer.DurationOrPackage} />}
                                                <input type="hidden" name="StartDate" value={startDateForInput} />
                                                {(typeof customer.TotalCompensationDays === 'number') && (<input type="hidden" name="TotalCompensationDays" value={customer.TotalCompensationDays.toString()} />)}

                                                <div><label htmlFor="editSessFullNameModal" className={labelClass}>ชื่อลูกค้า *</label><div className="mt-2"><input type="text" name="FullName" id="editSessFullNameModal" required defaultValue={customer.FullName} className={inputStyle} disabled={isUpdatePending} /></div>{!isUpdatePending && updateState.errors?.FullName && <p className={errorTextStyle}>{updateState.errors.FullName.join(', ')}</p>}</div>
                                                <div><label htmlFor="editSessPhoneModal" className={labelClass}>เบอร์โทร</label><div className="mt-2"><input type="tel" name="Phone" id="editSessPhoneModal" defaultValue={customer.Phone || ''} className={inputStyle} disabled={isUpdatePending} /></div>{!isUpdatePending && updateState.errors?.Phone && <p className={errorTextStyle}>{updateState.errors.Phone.join(', ')}</p>}</div>
                                                <div><label htmlFor="editSessRemainingModal" className={labelClass}>ครั้งคงเหลือ (ปกติ)</label><div className="mt-2"><input type="number" name="RemainingSessions" id="editSessRemainingModal" min="0" step="1" defaultValue={remainingSessionsForInput} className={inputStyle} disabled={isUpdatePending} /></div>{!isUpdatePending && updateState.errors?.RemainingSessions && <p className={errorTextStyle}>{updateState.errors.RemainingSessions.join(', ')}</p>}</div>
                                                <div><label htmlFor="editSessBonusModal" className={labelClass}>ครั้งโบนัส</label><div className="mt-2"><input type="number" name="BonusSessions" id="editSessBonusModal" min="0" step="1" defaultValue={bonusSessionsForInput} className={inputStyle} disabled={isUpdatePending} /></div>{!isUpdatePending && updateState.errors?.BonusSessions && <p className={errorTextStyle}>{updateState.errors.BonusSessions.join(', ')}</p>}</div>
                                                <div><label htmlFor="editSessManualEndModal" className={labelClass}>วันหมดอายุแพ็กเกจ (กำหนดเอง)</label><div className="mt-2"><input type="date" name="ManualEndDate" id="editSessManualEndModal" defaultValue={manualEndDateForInput} className={inputStyle} disabled={isUpdatePending} /></div><p className="mt-1 text-xs text-gray-500">หากไม่กำหนด จะใช้วันหมดอายุเดิม</p>{!isUpdatePending && updateState.errors?.ManualEndDate && <p className={errorTextStyle}>{updateState.errors.ManualEndDate.join(', ')}</p>}</div>

                                                {!isUpdatePending && updateState.message && !updateState.success && (
                                                    <div className={`mt-4 p-3 rounded-md text-sm bg-red-100 text-red-800`} role="alert">
                                                        {updateState.message}
                                                        {updateState.errors && Object.keys(updateState.errors).length > 0 && (<ul className="list-disc list-inside mt-1 text-xs">{Object.entries(updateState.errors).map(([field, errors]) => errors?.map((error, idx) => (<li key={`${field}-${idx}`}>{`${field}: ${error}`}</li>)))}</ul>)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-gray-100 px-4 py-4 sm:px-6 flex flex-col sm:flex-row-reverse items-center gap-3 border-t">
                                                <button type="submit" disabled={isUpdatePending} className={`${primaryButtonClass}`}>{isUpdatePending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{isUpdatePending ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</button>
                                                <button type="button" onClick={handleEditToggle} disabled={isUpdatePending} className={`${secondaryButtonClass}`}>ยกเลิกแก้ไข</button>
                                            </div>
                                        </form>
                                    ) : ( // --- DISPLAY MODE ---
                                        <>
                                            <div className="px-4 py-5 sm:p-6 space-y-5">
                                                <div><span className="text-sm font-medium text-gray-500 mr-2">สถานะ:</span><span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusClasses(customer.Status)}`}>{customer.Status || '-'}</span></div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t">
                                                    <div><p className={smallLabelClass}>ID</p><p className={valueClass}>{customer.CustomerID || '-'}</p></div>
                                                    <div><p className={smallLabelClass}>ชื่อ</p><p className={valueClass}>{customer.FullName || '-'}</p></div>
                                                    <div><p className={smallLabelClass}>เบอร์โทร</p><p className={valueClass}>{formatPhoneNumber(customer.Phone)}</p></div>
                                                    <div><p className={smallLabelClass}>เริ่ม</p><p className={valueClass}>{customer.FormattedStartDate}</p></div>
                                                    <div><p className={smallLabelClass}>แพ็กเกจ</p><p className={valueClass}>{customer.DurationOrPackage}</p></div>
                                                    <div><p className={smallLabelClass}>หมดอายุคอร์ส</p><p className="text-base text-gray-500">{customer.FormattedOriginalEndDate}</p></div>
                                                    {customer.ManualEndDate && isValid(parseISO(customer.ManualEndDate)) && (<div><p className={`${smallLabelClass} text-orange-600`}>หมดอายุ(ล่าสุด)</p><p className="text-base text-orange-700 font-semibold">{format(parseISO(customer.ManualEndDate), 'd MMM yy')}</p></div>)}
                                                    <div className="sm:col-span-2 mt-2"><p className="text-md font-medium">วันหมดอายุแพ็กเกจ:</p><p className={`text-xl font-bold ${isDateExpired ? 'text-red-600' : ((typeof currentRemainingDaysRaw === 'number' && currentRemainingDaysRaw <= 7) ? 'text-yellow-600' : 'text-gray-700')}`}>{customer.FinalEndDate} ({customer.RemainingDaysDisplay})</p></div>
                                                    <div className="sm:col-span-2"><p className="text-md font-medium">จำนวนครั้ง:</p><p className={`text-lg font-semibold ${noSessionsLeft ? 'text-red-600' : ((typeof currentTotalRemainingSessions === 'number' && currentTotalRemainingSessions <= 3) ? 'text-yellow-600' : 'text-green-600')}`}>{customer.RemainingSessionsDisplay}</p><p className="text-xs text-gray-500">ปกติ: {(typeof customer.RemainingSessions === 'number') ? customer.RemainingSessions : 0}, โบนัส: {(typeof customer.BonusSessions === 'number') ? customer.BonusSessions : 0}</p></div>

                                                    {/* ***** แสดงประวัติการเช็คอิน ***** */}
                                                    {customer.FormattedCheckInHistory && customer.FormattedCheckInHistory.length > 0 && (
                                                        <div className="sm:col-span-2 mt-3 pt-3 border-t">
                                                            <p className={smallLabelClass}><CalendarDays className="inline h-4 w-4 mr-1" /> ประวัติการเช็คอิน ({customer.FormattedCheckInHistory.length} ครั้ง):</p>
                                                            <ul className="list-disc list-inside text-sm text-gray-600 mt-1 max-h-28 overflow-y-auto pl-5 space-y-0.5">
                                                                {customer.FormattedCheckInHistory.map((entry, index) => (
                                                                    <li key={index}>{entry.display}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                                {!isDeletePending && deleteState.message && !deleteState.success && (<div className="mt-4 p-3 text-sm bg-red-100 text-red-800 rounded-md" role="alert">{deleteState.message}</div>)}
                                            </div>
                                            <div className="bg-gray-100 px-4 py-4 sm:px-6 flex flex-col sm:flex-row-reverse items-center gap-3 border-t">
                                                {isCourseEffectivelyExpired && (<button type="button" onClick={openRenewModal} disabled={isUpdatePending || isDeletePending || isMarkUsageTransitionPending} className={`${renewButtonClass} sm:ml-3`}><History className="h-4 w-4 mr-2" />ต่อคอร์ส</button>)}
                                                {!isCourseEffectivelyExpired && (typeof currentTotalRemainingSessions === 'number' && currentTotalRemainingSessions > 0) && (<button type="button" onClick={handleMarkUsage} disabled={isMarkUsageTransitionPending || isUpdatePending || isDeletePending} className={`${markUsageButtonClass}`}><CheckCircle className="h-4 w-4 mr-2" />{isMarkUsageTransitionPending ? 'กำลังเช็คอิน...' : 'เช็คอิน'}</button>)}
                                                <button type="button" onClick={handleEditToggle} disabled={isUpdatePending || isDeletePending || isMarkUsageTransitionPending} className={`${editButtonClass}`}><Pencil className="h-4 w-4 mr-2" />แก้ไข</button>
                                                <form action={deleteAction} onSubmit={(e) => { if (!customer || !confirm(`ต้องการลบ "${customer.FullName}" (ID: ${customer.CustomerID})?`)) e.preventDefault(); }}>
                                                    {customer && <input type="hidden" name="CustomerID" value={customer.CustomerID} />}
                                                    <button type="submit" disabled={isDeletePending || isUpdatePending || isMarkUsageTransitionPending} className={`${dangerButtonClass}`}>
                                                        {isDeletePending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                        {isDeletePending ? 'กำลังลบ...' : 'ลบ'}
                                                    </button>
                                                </form>
                                                <button type="button" onClick={onClose} disabled={isUpdatePending || isDeletePending || isMarkUsageTransitionPending} className={`${secondaryButtonClass} ml-auto sm:ml-0 mt-3 sm:mt-0`}> <XCircle className="h-4 w-4 mr-2" /> ปิด </button>
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
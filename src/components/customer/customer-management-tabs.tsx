// src/components/customer/CustomerManagementTabs.tsx
'use client';

import { useState, useMemo, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedCustomer, UnifiedCustomerDisplay } from '@/types/customer';
import MonthlyCustomerTable from './monthly/monthly-customer-table';
import SessionCustomerTable from './session/session-customer-table';
import AllCustomersTable from './all-customers-table';
import AddCustomerModal from './add-customer-modal';
import ConfirmAddCompensationModal from './common/confirm-add-compensation-modal';
import SelectCustomersForCompensationModal from './common/SelectCustomersForCompensationModal'; // แม้จะยังไม่ได้ใช้เต็มที่ ก็ import ไว้
import { getTodayUTCMidnight, parseDateString, addDays, differenceInDays, formatDateToDDMMYYYY, format } from '@/lib/date-utils';
import { CalendarPlus, Users, UserPlus } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

interface CustomerManagementTabsProps {
    initialAllCustomers: UnifiedCustomer[];
    allCustomersError?: string | null;
}

type ActiveTab = 'all' | 'monthly' | 'session';
export type CompensationMode = 'all-monthly' | 'selected-customers' | null;

export default function CustomerManagementTabs({
    initialAllCustomers,
    allCustomersError,
}: CustomerManagementTabsProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ActiveTab>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [isConfirmCompensationModalOpen, setIsConfirmCompensationModalOpen] = useState(false);
    const [compensationMode, setCompensationMode] = useState<CompensationMode>(null);
    const [selectedCustomerIdsForCompensation, setSelectedCustomerIdsForCompensation] = useState<string[]>([]);
    const [isSelectCustomersModalOpen, setIsSelectCustomersModalOpen] = useState(false);

    // --- processedCustomersFullArray useMemo (เหมือนเดิมที่คุณมี) ---
    const processedCustomersFullArray: UnifiedCustomerDisplay[] = useMemo(() => {
        const today = getTodayUTCMidnight();
        const customersToProcess = initialAllCustomers ?? [];
        if (customersToProcess.length === 0 && !allCustomersError) return [];

        return customersToProcess.map(customer => {
            let finalEndDateObject: Date | null = null;
            let remainingDaysRaw: number | null = null;
            let status: UnifiedCustomerDisplay['Status'] = '-';
            let remainingDaysDisplay: string | number = '-';
            let remainingSessionsDisplay: string | number = '-';
            let statusColorClass: UnifiedCustomerDisplay['StatusColorClass'] = 'text-gray-700';
            let totalRemainingSessions: number | null = null;

            let formattedCheckInHistory: { date: string; display: string }[] | undefined = undefined;
            if (customer.CheckInHistory && Array.isArray(customer.CheckInHistory) && customer.CheckInHistory.length > 0) {
                formattedCheckInHistory = customer.CheckInHistory
                    .map(dateStr => {
                        const dateObj = parseDateString(dateStr); // Use your robust parseDateString
                        return {
                            date: dateStr, // Keep original for sorting if needed
                            display: dateObj ? format(dateObj, 'd MMM yyyy') : dateStr // ถ้าไม่ใช้ locale
                        };
                    })
                    .sort((a, b) => b.date.localeCompare(a.date)); // Sort by original date string, descending
            }

            const startDate = parseDateString(customer.StartDate);
            const formattedStartDate = startDate ? formatDateToDDMMYYYY(startDate) : '-';
            const originalEndDateFromSheet = parseDateString(customer.OriginalEndDate);
            const formattedOriginalEndDate = originalEndDateFromSheet ? formatDateToDDMMYYYY(originalEndDateFromSheet) : '-';
            const manualEndDateFromSheet = parseDateString(customer.ManualEndDate);

            if (manualEndDateFromSheet) {
                finalEndDateObject = manualEndDateFromSheet;
            } else if (originalEndDateFromSheet) {
                finalEndDateObject = addDays(originalEndDateFromSheet, customer.TotalCompensationDays || 0);
            }

            const finalEndDateString = finalEndDateObject ? formatDateToDDMMYYYY(finalEndDateObject) : '-';

            if (finalEndDateObject) {
                const comparisonEndDate = new Date(finalEndDateObject.getTime());
                comparisonEndDate.setUTCHours(0, 0, 0, 0);
                remainingDaysRaw = differenceInDays(comparisonEndDate, today);
            }

            if (customer.CourseType === 'รายเดือน') {
                remainingSessionsDisplay = '-';
                totalRemainingSessions = null;
                if (remainingDaysRaw === null) {
                    status = '-'; remainingDaysDisplay = '-'; statusColorClass = 'text-gray-700';
                } else if (remainingDaysRaw < 0) {
                    status = 'หมดอายุ (วัน)'; remainingDaysDisplay = 'หมดอายุ'; statusColorClass = 'text-red-600 font-semibold';
                } else if (remainingDaysRaw === 0) {
                    status = 'ใกล้หมดอายุ';
                    remainingDaysDisplay = 'ใกล้หมด';
                    statusColorClass = 'text-orange-500 font-semibold';
                } else {
                    remainingDaysDisplay = remainingDaysRaw + 2;
                    if (remainingDaysRaw <= 7) {
                        status = 'ใกล้หมดอายุ'; statusColorClass = 'text-yellow-600';
                    } else {
                        status = 'ใช้งาน'; statusColorClass = 'text-green-600';
                    }
                }
            } else if (customer.CourseType === 'รายครั้ง') {
                totalRemainingSessions = (customer.RemainingSessions ?? 0) + (customer.BonusSessions ?? 0);
                remainingSessionsDisplay = `${totalRemainingSessions} ครั้ง`;

                if (remainingDaysRaw !== null && remainingDaysRaw < 0) {
                    status = 'หมดอายุ (วัน)';
                    remainingDaysDisplay = 'หมดอายุ (แพ็กเกจ)';
                    statusColorClass = 'text-red-600 font-semibold';
                } else if (totalRemainingSessions <= 0) {
                    status = 'หมดอายุ (ครั้ง)';
                    remainingSessionsDisplay = 'หมด (ครั้ง)';
                    statusColorClass = 'text-red-600 font-semibold';
                    remainingDaysDisplay = finalEndDateObject ? ((remainingDaysRaw === 0) ? 'ใกล้หมด (แพ็กเกจ)' : `${(remainingDaysRaw ?? 0) + 1} วัน`) : '-';
                } else if (remainingDaysRaw !== null && remainingDaysRaw === 0) {
                    status = 'ใกล้หมดอายุ';
                    remainingDaysDisplay = 'ใกล้หมด (แพ็กเกจ)';
                    statusColorClass = 'text-orange-500 font-semibold';
                } else if (remainingDaysRaw !== null && remainingDaysRaw <= 7) {
                    status = 'ใกล้หมดอายุ';
                    remainingDaysDisplay = `${remainingDaysRaw + 1} วัน`;
                    statusColorClass = 'text-yellow-600';
                } else if (totalRemainingSessions <= 3) {
                    status = 'ใกล้หมด (ครั้ง)';
                    statusColorClass = 'text-yellow-600';
                    remainingDaysDisplay = finalEndDateObject ? `${(remainingDaysRaw ?? 0) + 1} วัน` : '-';
                } else {
                    status = 'ใช้งาน';
                    statusColorClass = 'text-green-600';
                    remainingDaysDisplay = finalEndDateObject ? `${(remainingDaysRaw ?? 0) + 1} วัน` : '-';
                }
            } else {
                status = '-'; remainingDaysDisplay = '-'; remainingSessionsDisplay = '-'; statusColorClass = 'text-gray-700';
            }
            return { /* ... UnifiedCustomerDisplay object ... */
                ...customer,
                FinalEndDate: finalEndDateString,
                FinalEndDateDate: finalEndDateObject,
                RemainingDaysDisplay: remainingDaysDisplay,
                RemainingSessionsDisplay: remainingSessionsDisplay,
                Status: status,
                StatusColorClass: statusColorClass,
                RemainingDaysRaw: remainingDaysRaw,
                TotalRemainingSessions: totalRemainingSessions,
                FormattedStartDate: formattedStartDate,
                FormattedOriginalEndDate: formattedOriginalEndDate,
                FormattedCheckInHistory: formattedCheckInHistory,
            };
        });
    }, [initialAllCustomers, allCustomersError]);

    const allCustomers = processedCustomersFullArray;
    const monthlyCustomers = processedCustomersFullArray.filter(c => c.CourseType === 'รายเดือน');
    const sessionCustomers = processedCustomersFullArray.filter(c => c.CourseType === 'รายครั้ง');


    const handleTabClick = (tab: ActiveTab) => setActiveTab(tab);
    const openAddModal = useCallback(() => setIsAddModalOpen(true), []);
    const closeAddModal = useCallback(() => { setIsAddModalOpen(false); router.refresh(); }, [router]);
    const handleDataNeedsRefresh = useCallback(() => { router.refresh(); }, [router]);

    const startCompensationProcess = useCallback((mode: CompensationMode) => {
        setCompensationMode(mode);
        if (mode === 'selected-customers') {
            setIsSelectCustomersModalOpen(true); // เปิด Modal เลือกลูกค้า
        } else if (mode === 'all-monthly') {
            setSelectedCustomerIdsForCompensation([]); // ไม่มีการเลือก ID สำหรับโหมดนี้
            setIsConfirmCompensationModalOpen(true); // เปิด Modal ยืนยันโดยตรง
        }
    }, []); // Removed getSelectedCustomerIdsFromActiveTable from deps for now

    const handleCustomerSelectionConfirmed = useCallback((selectedIds: string[]) => {
        setSelectedCustomerIdsForCompensation(selectedIds);
        setIsSelectCustomersModalOpen(false);
        if (selectedIds.length > 0) { // เปิด Confirm Modal ต่อเมื่อมีการเลือกจริง
            setIsConfirmCompensationModalOpen(true);
        } else {
            setCompensationMode(null); // ถ้าไม่มีการเลือก ก็ reset mode
            alert("ไม่ได้เลือกลูกค้าใดๆ");
        }
    }, []);

    const closeSelectCustomersModal = useCallback(() => {
        setIsSelectCustomersModalOpen(false);
        // ไม่ reset compensationMode ที่นี่ เพราะอาจจะยังต้องการใช้ถ้าผู้ใช้แค่ปิด Modal เลือก
    }, []);

    const closeConfirmCompensationModal = useCallback(() => {
        setIsConfirmCompensationModalOpen(false);
        setCompensationMode(null); // Reset mode เมื่อ Modal ยืนยันถูกปิด
        setSelectedCustomerIdsForCompensation([]);
    }, []);

    const handleCompensationActionSuccess = useCallback(() => { // Renamed from handleBulkCompensationSuccess
        closeConfirmCompensationModal(); // This will reset mode and selected IDs
        router.refresh();
    }, [router, closeConfirmCompensationModal]);

    const ControlSection = () => (
        <div className="p-4 sm:px-6 sm:py-4 border-b border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-end items-center gap-x-3 gap-y-2 w-full">
                <Menu as="div" className="relative inline-block text-left w-full sm:w-auto">
                    <div><Menu.Button className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"><CalendarPlus className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2} />เพิ่มวันชดเชย<ChevronDownIcon className="ml-2 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" /></Menu.Button></div>
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                        <Menu.Items className="absolute right-0 sm:left-0 z-10 mt-2 w-60 origin-top-right sm:origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                                <Menu.Item>{({ active }) => (<button onClick={() => startCompensationProcess('all-monthly')} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}><Users className="mr-3 h-5 w-5 text-yellow-500" />เพิ่มให้ลูกค้า (ทุกคน)</button>)}</Menu.Item>
                                <Menu.Item>{({ active }) => (<button onClick={() => startCompensationProcess('selected-customers')} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-md px-3 py-2 text-sm`} title="เลือกรายการลูกค้าก่อนใช้งานฟังก์ชันนี้"><UserPlus className="mr-3 h-5 w-5 text-sky-500" />เพิ่มให้ลูกค้า (บางคน)</button>)}</Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
                <button onClick={openAddModal} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">+ เพิ่มลูกค้าใหม่</button>
            </div>
        </div>
    );

    const customersForSelection = processedCustomersFullArray; // หรือ filter ตาม activeTab ถ้าต้องการ

    return (
        <>
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <div className="border-b border-gray-200 bg-white rounded-t-lg">
                    <nav className="-mb-px flex flex-wrap sm:flex-nowrap space-x-4 sm:space-x-6 px-4 sm:px-6" aria-label="Tabs">
                        <button onClick={() => handleTabClick('all')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150 ${activeTab === 'all' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} aria-current={activeTab === 'all' ? 'page' : undefined}>ลูกค้าทั้งหมด ({allCustomers.length})</button>
                        <button onClick={() => handleTabClick('monthly')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150 ${activeTab === 'monthly' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} aria-current={activeTab === 'monthly' ? 'page' : undefined}>รายเดือน ({monthlyCustomers.length})</button>
                        <button onClick={() => handleTabClick('session')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150 ${activeTab === 'session' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} aria-current={activeTab === 'session' ? 'page' : undefined}>รายครั้ง ({sessionCustomers.length})</button>
                    </nav>
                </div>
                <ControlSection />
                <div className="mt-0">
                    {allCustomersError && (<div className="p-4 m-4 bg-red-50 text-red-700 rounded-md text-sm" role="alert"><strong>เกิดข้อผิดพลาดในการโหลดข้อมูล:</strong> {allCustomersError}</div>)}
                    {activeTab === 'all' && <AllCustomersTable customers={allCustomers} onDataUpdate={handleDataNeedsRefresh} />}
                    {activeTab === 'monthly' && <MonthlyCustomerTable customers={monthlyCustomers} onDataUpdate={handleDataNeedsRefresh} />}
                    {activeTab === 'session' && <SessionCustomerTable customers={sessionCustomers} onDataUpdate={handleDataNeedsRefresh} />}
                </div>
            </div>
            <AddCustomerModal isOpen={isAddModalOpen} onClose={closeAddModal} />

            <SelectCustomersForCompensationModal
                isOpen={isSelectCustomersModalOpen}
                onClose={closeSelectCustomersModal}
                customers={customersForSelection}
                onConfirmSelection={handleCustomerSelectionConfirmed}
                initiallySelectedIds={selectedCustomerIdsForCompensation}
            />

            {compensationMode && isConfirmCompensationModalOpen && (
                <ConfirmAddCompensationModal
                    isOpen={isConfirmCompensationModalOpen}
                    onClose={closeConfirmCompensationModal}
                    onSuccess={handleCompensationActionSuccess}
                    mode={compensationMode}
                    targetCustomerIds={selectedCustomerIdsForCompensation}
                />
            )}
        </>
    );
}
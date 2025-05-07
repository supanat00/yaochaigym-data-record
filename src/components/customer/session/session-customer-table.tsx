// src/components/customer/session/SessionCustomerTable.tsx
'use client';

import { useState, useMemo } from 'react';
import { UnifiedCustomer, UnifiedCustomerDisplay } from '@/types/customer';
import { format, differenceInDays, addDays, isValid, parseISO } from 'date-fns';
import SessionCustomerDetailModal from './session-customer-detail-modal'; // เราจะสร้างไฟล์นี้ถัดไป
import { ClipboardList } from 'lucide-react'; // อาจจะใช้ Users หรือไอคอนอื่นสำหรับ "ครั้ง"
import { getTodayUTCMidnight } from '@/lib/date-utils';

interface SessionCustomerTableProps {
    customers: UnifiedCustomer[]; // รับข้อมูล UnifiedCustomer ที่ filter เฉพาะรายครั้งมาแล้ว
    onDataUpdate?: () => void;
}

export default function SessionCustomerTable({ customers, onDataUpdate }: SessionCustomerTableProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomerDisplay | null>(null);

    const openModal = (customer: UnifiedCustomerDisplay) => {
        setSelectedCustomer(customer);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedCustomer(null);
    };

    const processedCustomers: UnifiedCustomerDisplay[] = useMemo(() => {
        console.log("[SessionTable] Processing session customers:", customers);
        const today = getTodayUTCMidnight();

        if (!customers || customers.length === 0) return [];

        const mappedCustomers: UnifiedCustomerDisplay[] = customers
            .filter(customer => customer.CourseType === 'รายครั้ง') // Ensure only session type
            .map(customer => {
                let finalEndDateObject: Date | null = null;
                let finalEndDateString = '-';
                let remainingDaysRaw: number | null = null; // For package validity
                let status: UnifiedCustomerDisplay['Status'] = '-';
                let remainingDaysDisplay: string | number = '-'; // For package validity
                let remainingSessionsDisplay: string | number = '-';
                let statusColorClass: UnifiedCustomerDisplay['StatusColorClass'] = 'text-gray-600';
                let formattedStartDate = '-';
                let formattedOriginalEndDate = '-';

                const totalSessions = (customer.RemainingSessions ?? 0) + (customer.BonusSessions ?? 0);

                // 1. Calculate Final End Date (for package validity)
                const manualEndDate = customer.ManualEndDate ? parseISO(customer.ManualEndDate) : null;
                const originalEndDate = customer.OriginalEndDate ? parseISO(customer.OriginalEndDate) : null;

                if (manualEndDate && isValid(manualEndDate)) {
                    finalEndDateObject = manualEndDate;
                } else if (originalEndDate && isValid(originalEndDate)) {
                    finalEndDateObject = addDays(originalEndDate, customer.TotalCompensationDays || 0);
                }

                if (finalEndDateObject && isValid(finalEndDateObject)) {
                    finalEndDateString = format(finalEndDateObject, 'dd/MM/yyyy');
                    remainingDaysRaw = differenceInDays(finalEndDateObject, today);
                }

                // Format StartDate and OriginalEndDate
                if (customer.StartDate && isValid(parseISO(customer.StartDate))) {
                    formattedStartDate = format(parseISO(customer.StartDate), 'dd/MM/yyyy');
                }
                if (customer.OriginalEndDate && isValid(parseISO(customer.OriginalEndDate))) {
                    formattedOriginalEndDate = format(parseISO(customer.OriginalEndDate), 'dd/MM/yyyy');
                }

                // 2. Calculate Status, Display, Color (for session-based customers)
                // Priority: 1. Package Expired by Date, 2. Sessions Depleted, 3. Nearing Date Expiry, 4. Nearing Session Depletion
                if (remainingDaysRaw !== null && remainingDaysRaw < 0) {
                    status = 'หมดอายุ (วัน)';
                    remainingDaysDisplay = 'หมดอายุ (ตามวัน)';
                    remainingSessionsDisplay = `${totalSessions} ครั้ง`; // Show remaining sessions even if date expired
                    statusColorClass = 'text-red-600 font-semibold';
                } else if (totalSessions <= 0) {
                    status = 'หมดอายุ (ครั้ง)';
                    remainingSessionsDisplay = 'หมด (ครั้ง)';
                    remainingDaysDisplay = finalEndDateObject ? (remainingDaysRaw === 0 ? 'หมดวันนี้' : `${remainingDaysRaw ?? '-'} วัน`) : '-';
                    statusColorClass = 'text-red-600 font-semibold';
                } else if (remainingDaysRaw !== null && remainingDaysRaw === 0) { // Package ends today
                    status = 'ใกล้หมดอายุ'; // Or 'หมดอายุ (วัน)' if preferred
                    remainingDaysDisplay = 'หมดวันนี้ (ตามวัน)';
                    remainingSessionsDisplay = `${totalSessions} ครั้ง`;
                    statusColorClass = 'text-orange-500 font-semibold';
                } else if (remainingDaysRaw !== null && remainingDaysRaw <= 7) { // Nearing package date expiry
                    status = 'ใกล้หมดอายุ';
                    remainingDaysDisplay = `${remainingDaysRaw} วัน`;
                    remainingSessionsDisplay = `${totalSessions} ครั้ง`;
                    statusColorClass = 'text-yellow-600';
                } else if (totalSessions <= 3) { // Nearing session depletion (e.g., 3 or less)
                    status = 'ใกล้หมด (ครั้ง)';
                    remainingSessionsDisplay = `${totalSessions} ครั้ง`;
                    remainingDaysDisplay = finalEndDateObject ? `${remainingDaysRaw ?? '-'} วัน` : '-';
                    statusColorClass = 'text-yellow-600';
                } else {
                    status = 'ใช้งาน';
                    remainingDaysDisplay = finalEndDateObject ? `${remainingDaysRaw ?? '-'} วัน` : '-';
                    remainingSessionsDisplay = `${totalSessions} ครั้ง`;
                    statusColorClass = 'text-green-600';
                }

                const displayData: UnifiedCustomerDisplay = {
                    ...customer,
                    FinalEndDate: finalEndDateString,
                    FinalEndDateDate: finalEndDateObject,
                    RemainingDaysDisplay: remainingDaysDisplay,
                    RemainingSessionsDisplay: remainingSessionsDisplay,
                    Status: status,
                    StatusColorClass: statusColorClass,
                    RemainingDaysRaw: remainingDaysRaw,
                    TotalRemainingSessions: totalSessions,
                    FormattedStartDate: formattedStartDate,
                    FormattedOriginalEndDate: formattedOriginalEndDate,
                };
                return displayData;
            });

        // Sort: Prioritize by status urgency (e.g., nearing expiry first), then by remaining days/sessions
        mappedCustomers.sort((a, b) => {
            const getSortPriority = (s: UnifiedCustomerDisplay['Status']): number => {
                switch (s) {
                    case 'ใกล้หมดอายุ':
                    case 'ใกล้หมด (ครั้ง)':
                        return 1;
                    case 'หมดอายุ (วัน)': // Ends today
                        if (a.RemainingDaysRaw === 0) return 2; // Specific for "ends today"
                        return 4; // Already expired by date
                    case 'หมดอายุ (ครั้ง)':
                        return 3; // Expired by sessions
                    case 'ใช้งาน':
                        return 5;
                    default:
                        return 6;
                }
            };

            const priorityA = getSortPriority(a.Status);
            const priorityB = getSortPriority(b.Status);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // If same priority, sort by remaining days (if applicable), then by remaining sessions
            if (a.RemainingDaysRaw !== null && b.RemainingDaysRaw !== null && a.RemainingDaysRaw !== b.RemainingDaysRaw) {
                return (a.RemainingDaysRaw ?? Infinity) - (b.RemainingDaysRaw ?? Infinity);
            }
            return (a.TotalRemainingSessions ?? Infinity) - (b.TotalRemainingSessions ?? Infinity);
        });

        return mappedCustomers;

    }, [customers]);

    return (
        <>
            <div className="overflow-x-auto shadow-md sm:rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-md font-semibold text-gray-600 uppercase tracking-wider">ชื่อลูกค้า</th>
                            <th scope="col" className="px-4 py-3 text-center text-md font-semibold text-gray-600 uppercase tracking-wider">วันที่เริ่ม</th>
                            <th scope="col" className="px-4 py-3 text-center text-md font-semibold text-gray-600 uppercase tracking-wider">วันที่หมด</th>
                            <th scope="col" className="px-4 py-3 text-center text-md font-semibold text-gray-600 uppercase tracking-wider">จำนวนคงเหลือ</th>
                            <th scope="col" className="relative px-4 py-3 text-right">
                                <span className="sr-only">ดูรายละเอียด</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedCustomers.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">ไม่พบข้อมูลลูกค้ารายครั้ง</td></tr>
                        )}
                        {processedCustomers.map((customer) => (
                            <tr key={customer.rowNumber} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 py-3 whitespace-nowrap text-md font-medium text-gray-900">{customer.FullName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-md text-center text-gray-500">
                                    {customer.FormattedStartDate}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-md text-center text-gray-500">
                                    {customer.FinalEndDate}
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-md text-center font-semibold ${customer.StatusColorClass}`}>
                                    {customer.RemainingSessionsDisplay}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => openModal(customer)}
                                        title="ดู/จัดการรายละเอียด"
                                        className="p-1.5 text-gray-500 rounded-md hover:bg-blue-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors duration-150"
                                    >
                                        <ClipboardList className="h-5 w-5" strokeWidth={1.75} />
                                        <span className="sr-only">ดู/จัดการ {customer.FullName}</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedCustomer && (
                <SessionCustomerDetailModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    customer={selectedCustomer}
                    onDataUpdate={onDataUpdate}
                />
            )}
        </>
    );
}
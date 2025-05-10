// src/components/customer/monthly/monthly-customer-table.tsx
'use client';

import { useState, useMemo } from 'react';
// Import Type ที่ถูกต้อง
import { UnifiedCustomer, UnifiedCustomerDisplay } from '@/types/customer'; // ใช้ UnifiedCustomer สำหรับ props และ UnifiedCustomerDisplay สำหรับ processed
import { format, differenceInDays, addDays, isValid, parseISO } from 'date-fns';
import MonthlyCustomerDetailModal from './monthly-customer-detail-modal';
import { ClipboardList } from 'lucide-react';
import { getTodayUTCMidnight } from '@/lib/date-utils'; // <<<--- IMPORT THIS

interface MonthlyCustomerTableProps {
    customers: UnifiedCustomer[]; // รับข้อมูล UnifiedCustomer ที่ filter เฉพาะรายเดือนมาแล้ว
    onDataUpdate?: () => void;
}

export default function MonthlyCustomerTable({ customers, onDataUpdate }: MonthlyCustomerTableProps) {
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
        console.log("[MonthlyTable] Processing monthly customers:", customers);
        const today = getTodayUTCMidnight(); // <<<--- ใช้ getTodayUTCMidnight()

        if (!customers || customers.length === 0) return [];

        const mappedCustomers: UnifiedCustomerDisplay[] = customers
            .filter(customer => customer.CourseType === 'รายเดือน') // เพิ่มการ filter เผื่อ props ส่งมาไม่ตรง
            .map(customer => {
                let finalEndDateObject: Date | null = null;
                let finalEndDateString = '-';
                let remainingDaysRaw: number | null = null;
                let status: UnifiedCustomerDisplay['Status'] = '-';
                let remainingDaysDisplay: string | number = '-';
                let statusColorClass: UnifiedCustomerDisplay['StatusColorClass'] = 'text-gray-600';
                let formattedStartDate = '-';
                let formattedOriginalEndDate = '-';

                // 1. หา Final End Date
                const manualEndDate = customer.ManualEndDate ? parseISO(customer.ManualEndDate) : null;
                const originalEndDate = customer.OriginalEndDate ? parseISO(customer.OriginalEndDate) : null;

                if (manualEndDate && isValid(manualEndDate)) {
                    finalEndDateObject = manualEndDate;
                } else if (originalEndDate && isValid(originalEndDate)) {
                    finalEndDateObject = addDays(originalEndDate, customer.TotalCompensationDays || 0);
                }

                if (finalEndDateObject && isValid(finalEndDateObject)) {
                    // finalEndDateObject.setHours(23, 59, 59, 999); // ไม่จำเป็นถ้า today ก็เป็น midnight และ differenceInDays จัดการได้ดี
                    finalEndDateString = format(finalEndDateObject, 'dd/MM/yyyy');
                    remainingDaysRaw = differenceInDays(finalEndDateObject, today);
                }

                // Format StartDate และ OriginalEndDate
                if (customer.StartDate && isValid(parseISO(customer.StartDate))) {
                    formattedStartDate = format(parseISO(customer.StartDate), 'dd/MM/yyyy');
                }
                if (customer.OriginalEndDate && isValid(parseISO(customer.OriginalEndDate))) {
                    formattedOriginalEndDate = format(parseISO(customer.OriginalEndDate), 'dd/MM/yyyy');
                }

                // 2. คำนวณ Status, Display, Color (สำหรับรายเดือน)
                if (remainingDaysRaw === null) {
                    status = '-';
                    remainingDaysDisplay = '-';
                    statusColorClass = 'text-gray-700';
                } else if (remainingDaysRaw <= 0) { // หมดอายุไปแล้ว (เช่น -1, -2, ...)
                    status = 'หมดอายุ (วัน)';
                    remainingDaysDisplay = 'หมดอายุ';
                    statusColorClass = 'text-red-600 font-semibold';
                } else {
                    remainingDaysDisplay = remainingDaysRaw + 2;

                    if (remainingDaysRaw <= 7) { // ถ้าจำนวนวันที่เหลือ (ไม่รวมวันนี้) <= 7
                        status = 'ใกล้หมดอายุ';
                        statusColorClass = 'text-yellow-600';
                    } else {
                        status = 'ใช้งาน';
                        statusColorClass = 'text-green-600';
                    }
                }

                // ... ส่วนที่เหลือของการสร้าง displayData ...

                // สำหรับ UnifiedCustomerDisplay อาจมี fields ของรายครั้งด้วย ให้เป็น null หรือ default
                const displayData: UnifiedCustomerDisplay = {
                    ...customer,
                    FinalEndDate: finalEndDateString,
                    FinalEndDateDate: finalEndDateObject,
                    RemainingDaysDisplay: remainingDaysDisplay,
                    RemainingSessionsDisplay: '-', // รายเดือนไม่มีครั้งที่เหลือ
                    Status: status,
                    StatusColorClass: statusColorClass,
                    RemainingDaysRaw: remainingDaysRaw,
                    TotalRemainingSessions: null, // รายเดือนไม่มี
                    FormattedStartDate: formattedStartDate,
                    FormattedOriginalEndDate: formattedOriginalEndDate,
                };
                return displayData;
            });

        // เรียงลำดับ: ใกล้หมดอายุก่อน, แล้วตามด้วยใช้งาน, แล้วตามด้วยหมดอายุแล้ว (หรือตาม RemainingDaysRaw น้อยไปมาก)
        mappedCustomers.sort((a, b) => {
            const valA = a.RemainingDaysRaw ?? Infinity; // ให้ค่า null/undefined เป็น Infinity (ท้ายสุด)
            const valB = b.RemainingDaysRaw ?? Infinity;

            // หมดอายุแล้ว (val < 0) ไปอยู่ท้ายสุด
            if (valA < 0 && valB >= 0) return 1;
            if (valA >= 0 && valB < 0) return -1;
            if (valA < 0 && valB < 0) return valA - valB; // ถ้าหมดอายุทั้งคู่ เรียงตามวันที่หมดนานสุดก่อน (น้อยสุด)

            return valA - valB; // เรียงจากน้อยไปมาก (ใกล้หมดก่อน)
        });

        return mappedCustomers;

    }, [customers]);

    return (
        <>
            <div className="overflow-x-auto shadow-md sm:rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ชื่อ</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">วันที่เริ่ม</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">วันที่หมด</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">คงเหลือ</th>
                            <th scope="col" className="relative px-4 py-3 text-right">
                                <span className="sr-only">ดูรายละเอียด</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedCustomers.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">ไม่พบข้อมูลลูกค้ารายเดือน</td></tr>
                        )}
                        {processedCustomers.map((customer) => ( // customer ที่นี่คือ UnifiedCustomerDisplay
                            <tr key={customer.rowNumber} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">{customer.FullName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-center text-gray-500">
                                    {customer.FormattedStartDate}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-center text-gray-500">
                                    {customer.FinalEndDate}
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-xs text-center font-semibold ${customer.StatusColorClass}`}> {/* ใช้ StatusColorClass */}
                                    {customer.RemainingDaysDisplay} {typeof customer.RemainingDaysDisplay === 'number' ? 'วัน' : ''}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
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
                <MonthlyCustomerDetailModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    customer={selectedCustomer} // selectedCustomer คือ UnifiedCustomerDisplay
                    onDataUpdate={onDataUpdate}
                />
            )}
        </>
    );
}
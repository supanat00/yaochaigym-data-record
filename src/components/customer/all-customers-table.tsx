// src/components/customer/all-customers-table.tsx
'use client';

import { useState } from 'react';
import { UnifiedCustomerDisplay } from '@/types/customer';
import MonthlyCustomerDetailModal from './monthly/monthly-customer-detail-modal';
import SessionCustomerDetailModal from './session/session-customer-detail-modal';
// import { ClipboardList } from 'lucide-react'; // Uncomment if you add back detail button

interface AllCustomersTableProps {
    customers: UnifiedCustomerDisplay[];
    onDataUpdate?: () => void;
}

export default function AllCustomersTable({ customers, onDataUpdate }: AllCustomersTableProps) {
    const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomerDisplay | null>(null);
    const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

    // Uncomment if you add back the detail button/functionality:
    // const openDetailModal = (customer: UnifiedCustomerDisplay) => {
    //     setSelectedCustomer(customer);
    //     if (customer.CourseType === 'รายเดือน') {
    //         setIsMonthlyModalOpen(true);
    //     } else if (customer.CourseType === 'รายครั้ง') {
    //         setIsSessionModalOpen(true);
    //     } else {
    //         console.warn("Cannot open detail modal: Unknown or missing CourseType for customer", customer);
    //     }
    // };

    const closeAllModals = () => {
        setIsMonthlyModalOpen(false);
        setIsSessionModalOpen(false);
        setSelectedCustomer(null);
    };

    const handleDataUpdated = () => {
        closeAllModals();
        if (onDataUpdate) {
            onDataUpdate();
        }
    };

    const displayCustomers = customers;

    // Helper function for calculating display value for monthly customers' "Remaining" column
    // This uses the logic you provided:
    // <= 0 is "หมดอายุ"
    // > 0 is raw + 2
    // (The case for raw === 0 being "ใกล้หมด" was in your previous specific request for this helper,
    //  but this version matches the one you provided just before asking to add the column)
    const getMonthlyDisplayValueConsistent = (remainingDaysRaw: number | null | undefined): string | number => {
        if (remainingDaysRaw === null || typeof remainingDaysRaw === 'undefined') {
            return '-';
        } else if (remainingDaysRaw <= 0) { // This will catch raw = 0 and raw < 0
            return 'หมดอายุ';
        } else { // remainingDaysRaw >= 1
            return remainingDaysRaw + 2;
        }
    };


    return (
        <>
            <div className="overflow-hidden shadow-md sm:rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>{/* Ensure no extra space */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ชื่อ</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">คอร์ส</th>
                            {/* ***** NEW COLUMN HEADER: วันที่หมดอายุ ***** */}
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">วันที่หมด</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">คงเหลือ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayCustomers.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">ไม่พบข้อมูลลูกค้า</td></tr> // Adjusted colSpan
                        )}
                        {displayCustomers.map((customer) => {
                            let displayValueForRemainingColumn: string | number = '-';
                            let unit = '';

                            const currentRemainingDaysRaw = customer.RemainingDaysRaw;

                            if (customer.CourseType === 'รายเดือน') {
                                displayValueForRemainingColumn = getMonthlyDisplayValueConsistent(currentRemainingDaysRaw);
                                if (typeof displayValueForRemainingColumn === 'number' && displayValueForRemainingColumn > 0) {
                                    unit = ' วัน';
                                }
                            } else if (customer.CourseType === 'รายครั้ง') {
                                if (typeof customer.TotalRemainingSessions === 'number' && customer.TotalRemainingSessions > 0) {
                                    displayValueForRemainingColumn = customer.TotalRemainingSessions;
                                    unit = ' ครั้ง';
                                } else if (typeof customer.TotalRemainingSessions === 'number' && customer.TotalRemainingSessions === 0) {
                                    displayValueForRemainingColumn = 'หมด'; // Or "0"
                                    unit = ' ครั้ง'; // "หมด ครั้ง"
                                } else {
                                    displayValueForRemainingColumn = customer.RemainingSessionsDisplay || '-';
                                    if (typeof customer.RemainingSessionsDisplay === 'string' && customer.RemainingSessionsDisplay.includes('ครั้ง')) {
                                        unit = '';
                                    } else if (typeof customer.RemainingSessionsDisplay === 'number' && customer.RemainingSessionsDisplay > 0) {
                                        unit = ' ครั้ง';
                                    }
                                }
                            }

                            return (
                                <tr key={customer.rowNumber} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">{customer.FullName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-center">
                                        <span className={`px-2 py-0.5 inline-flex text-md leading-5 font-semibold rounded-full ${customer.CourseType === 'รายเดือน' ? 'bg-indigo-100 text-indigo-800' :
                                            customer.CourseType === 'รายครั้ง' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {customer.CourseType || '-'}
                                        </span>
                                    </td>
                                    {/* ***** NEW COLUMN CELL: วันที่หมดอายุ ***** */}
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 text-center">
                                        {customer.FinalEndDate || '-'}
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-xs text-center font-semibold ${customer.StatusColorClass}`}>
                                        {displayValueForRemainingColumn}{unit}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modals - kept for completeness, will not open if detail button is removed */}
            {selectedCustomer?.CourseType === 'รายเดือน' && (
                <MonthlyCustomerDetailModal
                    isOpen={isMonthlyModalOpen}
                    onClose={closeAllModals}
                    customer={selectedCustomer}
                    onDataUpdate={handleDataUpdated}
                />
            )}
            {selectedCustomer?.CourseType === 'รายครั้ง' && (
                <SessionCustomerDetailModal
                    isOpen={isSessionModalOpen}
                    onClose={closeAllModals}
                    customer={selectedCustomer}
                    onDataUpdate={handleDataUpdated}
                />
            )}
        </>
    );
}
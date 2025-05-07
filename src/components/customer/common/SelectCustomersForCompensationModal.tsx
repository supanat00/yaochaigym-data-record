// src/components/customer/common/SelectCustomersForCompensationModal.tsx
'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { UnifiedCustomerDisplay } from '@/types/customer'; // CustomerID should be string here

interface SelectCustomersModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: UnifiedCustomerDisplay[];
    onConfirmSelection: (selectedCustomerIDs: string[]) => void; // <<<< CHANGED to string[]
    initiallySelectedIds?: string[]; // <<<< CHANGED to string[]
}

export default function SelectCustomersForCompensationModal({
    isOpen,
    onClose,
    customers,
    onConfirmSelection,
    initiallySelectedIds = []
}: SelectCustomersModalProps) {
    const [selectedCustomerIDs, setSelectedCustomerIDs] = useState<Set<string>>(new Set()); // <<<< CHANGED to string

    useEffect(() => {
        if (isOpen) {
            setSelectedCustomerIDs(new Set(initiallySelectedIds || [])); // Ensure initiallySelectedIds is handled if undefined
        }
    }, [isOpen, initiallySelectedIds]);

    const handleToggleSelect = (customerId: string) => { // <<<< Parameter is string
        setSelectedCustomerIDs(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(customerId)) {
                newSelected.delete(customerId);
            } else {
                newSelected.add(customerId);
            }
            return newSelected;
        });
    };

    const handleSelectAll = () => {
        if (selectedCustomerIDs.size === customers.length && customers.length > 0) {
            setSelectedCustomerIDs(new Set());
        } else {
            // Assuming customer.CustomerID is the correct string identifier
            setSelectedCustomerIDs(new Set(customers.map(c => c.CustomerID)));
        }
    };

    const handleSubmitSelection = () => {
        if (selectedCustomerIDs.size === 0) {
            alert("กรุณาเลือกอย่างน้อย 1 รายการ");
            return;
        }
        onConfirmSelection(Array.from(selectedCustomerIDs)); // <<<< Sends string[]
    };

    if (!isOpen) return null;

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />
                </Transition.Child>
                <div className="fixed inset-0 z-[70] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg md:max-w-2xl">
                                <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-sky-50 border-b border-sky-200">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-sky-900 flex items-center gap-2">
                                        <UserPlusIcon className="h-5 w-5 text-sky-600" strokeWidth={2} />
                                        เลือกลูกค้าเพื่อเพิ่มวันชดเชย
                                    </Dialog.Title>
                                    <button type="button" className="-m-1 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500" onClick={onClose}><XMarkIcon className="h-5 w-5" /></button>
                                </div>
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="mb-4 flex justify-between items-center">
                                        <button type="button" onClick={handleSelectAll} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium py-1 px-2 rounded hover:bg-indigo-50">
                                            {selectedCustomerIDs.size === customers.length && customers.length > 0 ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                                        </button>
                                        <span className="text-sm text-gray-600">เลือกแล้ว: {selectedCustomerIDs.size} / {customers.length} รายการ</span>
                                    </div>
                                    <div className="max-h-80 sm:max-h-96 overflow-y-auto border rounded-md divide-y divide-gray-200">
                                        {customers.length === 0 && <p className="p-4 text-center text-gray-500">ไม่พบข้อมูลลูกค้าให้เลือก</p>}
                                        {customers.map((customer) => (
                                            <div key={customer.CustomerID} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer" onClick={() => handleToggleSelect(customer.CustomerID)}>
                                                <input id={`select-comp-customer-${customer.CustomerID}`} name={`select-comp-customer-${customer.CustomerID}`} type="checkbox" className="h-5 w-5 self-center rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={selectedCustomerIDs.has(customer.CustomerID)} onChange={() => handleToggleSelect(customer.CustomerID)} onClick={(e) => e.stopPropagation()} />
                                                <label htmlFor={`select-comp-customer-${customer.CustomerID}`} className="ml-3 min-w-0 flex-1 text-sm cursor-pointer">
                                                    <span className="font-medium text-gray-900">{customer.FullName}</span> <span className="text-xs text-gray-400">(ID: {customer.CustomerID})</span>
                                                    <p className="text-xs text-gray-500">{customer.CourseType} - <span className={customer.StatusColorClass}>{customer.Status}</span>
                                                        {customer.CourseType === 'รายเดือน' && ` (${customer.RemainingDaysDisplay}${typeof customer.RemainingDaysDisplay === 'number' ? ' วัน' : ''})`}
                                                        {customer.CourseType === 'รายครั้ง' && ` (${customer.RemainingSessionsDisplay})`}
                                                    </p>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
                                    <button type="button" onClick={handleSubmitSelection} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50" disabled={selectedCustomerIDs.size === 0}>ยืนยัน ({selectedCustomerIDs.size})</button>
                                    <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onClick={onClose}>ยกเลิก</button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
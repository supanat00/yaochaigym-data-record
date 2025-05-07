// src/components/customer/add-customer-modal.tsx
'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline'; // หรือใช้ XCircle จาก Lucide
// *** Import ฟอร์มรวมอันเดียว ***
import AddCustomerForm from './add-customer-form'; // <<<=== ตรวจสอบ Path นี้ให้ถูกต้อง

interface ModalProps {
    isOpen: boolean;
    onClose: () => void; // Function ที่ Parent ส่งมาเพื่อปิด Modal
    // ไม่ต้องมี onDataUpdate ที่นี่แล้ว เพราะ AddCustomerForm จะเรียก onSuccess ซึ่งจะปิด Modal
    // และ Parent (Tabs) จะเรียก router.refresh() เอง
}

export default function AddCustomerModal({ isOpen, onClose }: ModalProps) {

    // Callback function ที่จะส่งให้ฟอร์มย่อยเรียกเมื่อทำงานสำเร็จ
    const handleFormSuccess = () => {
        console.log("AddCustomerForm submitted successfully. Closing modal via onClose callback.");
        onClose(); // เรียกฟังก์ชันปิด Modal ที่ได้รับมาจาก Parent
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            {/* ตั้งค่า z-index สูงเพื่อให้ Modal อยู่หน้าสุด */}
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                {/* Background overlay */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
                    {/* จัดตำแหน่ง Modal ให้อยู่กลางจอ */}
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            {/* Dialog Panel หลัก */}
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                                        เพิ่มลูกค้าใหม่
                                    </Dialog.Title>
                                    {/* ปุ่มปิด Modal */}
                                    <button
                                        type="button"
                                        className="-m-2 p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close panel</span>
                                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                        {/* หรือ <XCircle className="h-5 w-5" /> */}
                                    </button>
                                </div>

                                {/* *** Modal Body - แสดงฟอร์มรวมอันเดียว *** */}
                                <div className="px-4 py-5 sm:p-6">
                                    {/* Render ฟอร์มรวม และส่ง Callback ไป */}
                                    <AddCustomerForm onSuccess={handleFormSuccess} />
                                </div>
                                {/* *** ไม่มี Tabs หรือ Footer ใน Modal นี้แล้ว *** */}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
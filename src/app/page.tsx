// src/app/page.tsx
import CustomerManagementTabs from '@/components/customer/customer-management-tabs'; // ตรวจสอบ Path
// *** Import Action เดียว ***
import { getCustomers } from '@/app/actions/customer.actions';
import { getAppSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Home() {
  // --- 1. ตรวจสอบ Session ---
  const session = await getAppSession();
  // ถ้ายังไม่ได้ Login และหน้านี้ (`/`) ไม่ใช่หน้า Login ให้ Redirect
  // สมมติว่าหน้า Login คือ /login
  if (!session.userId) {
    console.log("[Home Page] User not logged in, redirecting to /login");
    redirect('/login');
  }
  // ถ้า Login แล้ว และเข้ามาที่ / (ซึ่งเป็น Dashboard) ก็ให้แสดงผลต่อไป

  console.log("--- Home Page Server Component ---");
  console.log("Fetching initial unified customer data...");

  // --- 2. Fetch ข้อมูลลูกค้าทั้งหมด ---
  const customerResult = await getCustomers(); // เรียก Action รวม

  // Log ผลลัพธ์การ Fetch
  console.log("Unified Customer fetch result:", customerResult.success ? `${customerResult.data?.length ?? 0} customers found` : `Error - ${customerResult.message}`);
  if (!customerResult.success && customerResult.error) {
    // Log รายละเอียด Error ฝั่ง Server ถ้ามี (ไม่ควรแสดงให้ Client เห็นโดยตรง)
    console.error("[Home Page] Error details from getCustomers:", customerResult.error);
  }
  console.log("---------------------------------");

  // --- 3. เตรียมข้อมูลสำหรับส่งเป็น Props ---
  // ใช้ Nullish Coalescing (??) เพื่อให้เป็น Array ว่างเสมอถ้า data เป็น null/undefined
  const allCustomersData = customerResult.data ?? [];
  // เก็บ Error message ถ้าการ Fetch ไม่สำเร็จ
  const allCustomersError = !customerResult.success ? (customerResult.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า') : null;

  // --- 4. Render หน้า UI ---
  return (
    // ใช้ Layout หลักของหน้า
    <main className="min-h-screen bg-gray-100 p-4 overflow-hidden">
      {/* Container จำกัดความกว้าง */}
      <div className="max-w-screen-xl mx-auto"> {/* หรือขนาดอื่นที่ต้องการ เช่น max-w-7xl */}
        {/* Header ของหน้า */}
        <header className="mb-6 pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">
              ระบบจัดการลูกค้า <span className="text-indigo-600 font-bold">Yaochai Gym</span>
            </h1>
            {/* แสดงชื่อผู้ใช้ที่ Login */}
            <p className="text-sm text-gray-600">
              เข้าสู่ระบบโดย: <span className='font-medium'>{session.fullName || session.username || 'N/A'}</span>
            </p>
          </div>
        </header>

        {/* Render Component หลักสำหรับแสดง Tabs และ ตาราง */}
        {/* *** ส่งข้อมูลรวม และ Error รวมไปให้ *** */}
        <CustomerManagementTabs
          initialAllCustomers={allCustomersData}
          allCustomersError={allCustomersError}
        />
      </div>
    </main>
  );
}
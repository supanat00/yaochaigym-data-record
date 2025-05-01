// src/app/page.tsx
import LoginForm from '@/components/login-form'; // **ปรับ Path ให้ถูกต้อง**

export default function Home() {
    return (
        // จัด Layout หน้าหลักตามต้องการ เช่น ใช้ Flexbox จัดกึ่งกลาง
        <main className="flex items-center justify-center min-h-screen bg-gray-100">
            {/* เรียกใช้ Component LoginForm */}
            <LoginForm />
        </main>
    );
}
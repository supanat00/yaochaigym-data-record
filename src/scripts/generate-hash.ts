// scripts/generate-hash.ts
import bcrypt from 'bcrypt';
import * as readline from 'node:readline/promises'; // ใช้สำหรับรับ Input อย่างปลอดภัย
import { stdin as input, stdout as output } from 'node:process';

// กำหนดจำนวน Salt Rounds (ค่ามาตรฐานที่แนะนำคือ 10-12)
// ยิ่งค่าสูง ยิ่งปลอดภัย แต่ก็ยิ่งใช้เวลา Hash นานขึ้น
const saltRounds = 10;

async function createPasswordHash() {
    const rl = readline.createInterface({ input, output });

    try {
        // ถามรหัสผ่านจาก User (ไม่แสดงรหัสผ่านตอนพิมพ์)
        // **หมายเหตุ:** การใช้ rl.question โดยตรงจะยังแสดงผลตอนพิมพ์
        // การซ่อนต้องใช้ trick หรือ library เพิ่มเติม แต่สำหรับ script นี้ ใช้แบบนี้ก่อนได้
        const plainPassword = await rl.question('Enter the password to hash: ');

        if (!plainPassword) {
            console.error('Password cannot be empty.');
            return;
        }

        console.log('\nHashing password...');

        // ทำการ Hash รหัสผ่าน
        // bcrypt.hash จะสร้าง Salt ให้โดยอัตโนมัติและรวมเข้าไปในค่า Hash ที่ได้
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        console.log('\n--- Hashing Complete ---');
        console.log(`Plain Password: ${plainPassword}`); // แสดงเพื่อยืนยัน
        console.log(`Salt Rounds:    ${saltRounds}`);
        console.log(`\n>>> Generated Hash (Copy this value):`);
        console.log(hashedPassword); // *** นี่คือค่าที่คุณต้องคัดลอก ***
        console.log('\nCopy the generated hash and paste it into the "PasswordHash" column in your Google Sheet.');

    } catch (error) {
        console.error('\nError generating password hash:', error);
    } finally {
        rl.close(); // ปิด interface readline เสมอ
    }
}

// เรียกใช้ฟังก์ชัน
createPasswordHash();
@echo off
rem สุ่มตัวเลขระหว่าง 1 ถึง 100 (ปรับตามที่คุณต้องการ)
set /a number=%random% %% 100 + 1

rem เพิ่มไฟล์ทั้งหมดใน Git
git add .

rem สร้างข้อความ commit โดยใช้ตัวเลขที่สุ่ม
git commit -m "update %number%"

rem ส่งการเปลี่ยนแปลงไปที่ remote repository
git push origin main

pause

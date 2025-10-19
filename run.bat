@echo off
rem สุ่มตัวเลขระหว่าง 1 ถึง 100 (ปรับตามที่คุณต้องการ)
set /a number=%random% %% 100 + 1

rem รัน Node.js ใน background
start node index.js

rem รอให้ผู้ใช้ตอบคำถาม
set /p userChoice="รันต่อหรือไม่? (กด Y เพื่อไปต่อ หรือ N เพื่อเลิก): "

if /i "%userChoice%"=="Y" (
    rem เพิ่มไฟล์ทั้งหมดใน Git
    git add .

    rem สร้างข้อความ commit โดยใช้ตัวเลขที่สุ่ม
    git commit -m "update %number%"

    rem ส่งการเปลี่ยนแปลงไปที่ remote repository
    git push origin main
) else (
    echo การดำเนินการถูกยกเลิก
)

pause

import fs from "fs";
import path from "path";
import { downloadAndSaveImage } from "./imageload.js";

// 🧩1. ฟังก์ชันช่วยบันทึกไฟล์ลงโฟลเดอร์ history ตามวันและประเภท
function saveFileToHistory(fileBuffer, originalFileName, type="images") {
  const baseDir = path.join(process.cwd(), "chat_history");   // โฟลเดอร์หลัก
  const dateDir = new Date().toISOString().split("T")[0];     // YYYY-MM-DD
  const typeDir = path.join(baseDir, type, dateDir);

  // สร้างโฟลเดอร์ถ้ายังไม่มี
  if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });

  // ตั้งชื่อไฟล์แบบ timestamp + ชื่อเดิม
  const fileName = `${Date.now()}_${originalFileName}`;
  const filePath = path.join(typeDir, fileName);

  // บันทึกไฟล์ลงโฟลเดอร์
  fs.writeFileSync(filePath, fileBuffer);

  return filePath; // คืน path ของไฟล์ที่บันทึก
}

export async function handleImageMessage(event, replyToken, userId, client, userName) {
  try {
    // 🧩 3. ดาวน์โหลดและบันทึกภาพจากผู้ใช้
    const imageBuffer = await downloadAndSaveImage(event, replyToken, userId, client, userName);

    if (!imageBuffer) {
      console.error("🧩handleImage.Failed to download image");
      return null;
    }
    // 🧩 4. บันทึกไฟล์ลง folder history/images/YYYY-MM-DD
    const originalFileName = `userImage.jpg`; // หรือดึงชื่อไฟล์จริงจาก downloadAndSaveImage
    const savedPath = saveFileToHistory(imageBuffer, originalFileName, "images");

    // 🧩 5. สร้าง log JSON ของข้อความและภาพ
    const logFile = path.join(process.cwd(), "chat_history", "logs", `${new Date().toISOString().split("T")[0]}_messages.json`);
    if (!fs.existsSync(path.dirname(logFile))) fs.mkdirSync(path.dirname(logFile), { recursive: true });

    let logData = [];
    if (fs.existsSync(logFile)) {
      logData = JSON.parse(fs.readFileSync(logFile));
    }

    logData.push({
      timestamp: new Date().toISOString(),
      userId,
      userName,
      messageType: "image",
      fileName: path.basename(savedPath),
      filePath: savedPath
    });
    // 🧩 6. บันทึก
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log("🧩handleImage.Saved image and log to PC:", savedPath);
    
  } catch (error) {
    // 🧩 7. บันทึกข้อผิดพลาดถ้ามีปัญหา
    console.error("🧩handleImage.Error:", {
      message: error.message,
      response: error.response?.data,
    });
  }  
}


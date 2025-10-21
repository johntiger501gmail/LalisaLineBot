import fs from "fs";
import path from "path";
import axios from "axios";

/**
 * 🔹 ฟังก์ชัน: ดาวน์โหลดไฟล์ทั้งหมดที่มีวันหมดอายุ (จาก log)
 * - ตรวจ log ในโฟลเดอร์ chat_history/logs/
 * - ดาวน์โหลดเฉพาะไฟล์ที่ยังไม่มีในเครื่อง
 * - แยกเก็บตามประเภท (images / videos / files)
 */
export async function downloadAllExpiredFiles(client) {
  try {
    const baseDir = path.join(process.cwd(), "chat_history");
    const logDir = path.join(baseDir, "logs");

    if (!fs.existsSync(logDir)) {
      console.log("🧩 ไม่มี log สำหรับดาวน์โหลด — กำลังสร้างโฟลเดอร์ใหม่...");
      fs.mkdirSync(logDir, { recursive: true });
      return;
    }

    // 🔸 อ่านไฟล์ log ทั้งหมด
    const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith("_messages.json"));
    console.log(`🧩 พบ log ทั้งหมด ${logFiles.length} ไฟล์`);

    for (const logFile of logFiles) {
      const logPath = path.join(logDir, logFile);
      const logData = JSON.parse(fs.readFileSync(logPath));

      for (const item of logData) {
        if (!item.filePath && item.messageType && item.messageId) {
          // 🔸 ตรวจประเภทไฟล์
          let folderType = "files";
          if (item.messageType === "image") folderType = "images";
          if (item.messageType === "video") folderType = "videos";
          if (item.messageType === "audio") folderType = "audio";

          const dateDir = new Date(item.timestamp).toISOString().split("T")[0];
          const typeDir = path.join(baseDir, folderType, dateDir);

          if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });

          const fileName = `${Date.now()}_${item.messageId}.${getFileExtension(folderType)}`;
          const filePath = path.join(typeDir, fileName);

          // 🔸 ตรวจว่ามีไฟล์แล้วหรือยัง
          if (fs.existsSync(filePath)) {
            console.log(`⏩ ข้ามไฟล์ที่มีอยู่แล้ว: ${fileName}`);
            continue;
          }

          // 🔸 ดาวน์โหลดไฟล์จาก LINE API
          console.log(`⬇️ กำลังดาวน์โหลด ${item.messageType} (${item.messageId})...`);
          const stream = await client.getMessageContent(item.messageId);

          // เขียน stream ลงไฟล์
          const writable = fs.createWriteStream(filePath);
          await new Promise((resolve, reject) => {
            stream.pipe(writable);
            stream.on("end", resolve);
            stream.on("error", reject);
          });

          // 🔸 อัปเดต log
          item.filePath = filePath;
          console.log(`✅ บันทึกไฟล์สำเร็จ: ${filePath}`);
        }
      }

      // 🔸 เขียน log กลับ (update filePath)
      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    }

    console.log("🎯 ดาวน์โหลดไฟล์ทั้งหมดเสร็จสิ้น!");

  } catch (error) {
    console.error("❌ downloadAllExpiredFiles.Error:", error.message);
  }
}

/**
 * 🔹 ตัวช่วย: คืนค่านามสกุลไฟล์ตามประเภท
 */
function getFileExtension(type) {
  switch (type) {
    case "images": return "jpg";
    case "videos": return "mp4";
    case "audio": return "m4a";
    default: return "bin";
  }
}

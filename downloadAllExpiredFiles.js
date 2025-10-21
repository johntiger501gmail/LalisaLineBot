import fs from "fs";
import path from "path";

/**
 * 🔹 ตรวจสอบและสร้างโฟลเดอร์/ไฟล์ log หากยังไม่มี
 * - ปรับให้ใช้โฟลเดอร์จริงบนคอม Windows: D:\LalisaLineBot\chat_history
 */
function ensureLogSetup() {
  // ใช้โฟลเดอร์โปรเจคจริงบน Windows
  const baseDir = path.join(process.cwd(), "chat_history");
  const logDir = path.join(baseDir, "logs");
  const logFile = path.join(logDir, "messages.jsonl");

  // ตรวจสอบโฟลเดอร์ chat_history
  if (!fs.existsSync(baseDir)) {
    console.log("🧩 สร้างโฟลเดอร์ chat_history...");
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // ตรวจสอบโฟลเดอร์ logs
  if (!fs.existsSync(logDir)) {
    console.log("🧩 สร้างโฟลเดอร์ logs...");
    fs.mkdirSync(logDir, { recursive: true });
  }

  // ตรวจสอบไฟล์ messages.jsonl
  if (!fs.existsSync(logFile)) {
    console.log("🧩 สร้างไฟล์ log messages.jsonl ใหม่...");
    fs.writeFileSync(logFile, "");
  }

  return { baseDir, logDir, logFile };
}

export default ensureLogSetup;


/**
 * 🔹 ดาวน์โหลดไฟล์จาก log และอัปเดต log
 */
export async function downloadAllExpiredFiles(client) {
  try {
    const { baseDir, logDir } = ensureLogSetup();

    // อ่านไฟล์ log ทั้งหมด
    const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith(".jsonl"));
    console.log(`🧩 พบ log ทั้งหมด ${logFiles.length} ไฟล์`);

    for (const logFile of logFiles) {
      const logPath = path.join(logDir, logFile);
      const lines = fs.readFileSync(logPath, "utf-8").split("\n").filter(l => l.trim() !== "");
      const logData = lines.map(l => JSON.parse(l));

      for (const item of logData) {
        if (!item.filePath && item.messageType && item.messageId) {
          // ตรวจประเภทไฟล์
          let folderType = "files";
          if (item.messageType === "image") folderType = "images";
          if (item.messageType === "video") folderType = "videos";
          if (item.messageType === "audio") folderType = "audio";

          const dateDir = new Date(item.timestamp).toISOString().split("T")[0];
          const typeDir = path.join(baseDir, folderType, dateDir);
          if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });

          const fileName = `${Date.now()}_${item.messageId}.${getFileExtension(folderType)}`;
          const filePath = path.join(typeDir, fileName);

          // ข้ามไฟล์ที่มีอยู่แล้ว
          if (fs.existsSync(filePath)) {
            console.log(`⏩ ข้ามไฟล์ที่มีอยู่แล้ว: ${fileName}`);
            continue;
          }

          // ดาวน์โหลดไฟล์จาก LINE API
          console.log(`⬇️ ดาวน์โหลด ${item.messageType} (${item.messageId})...`);
          const stream = await client.getMessageContent(item.messageId);

          const writable = fs.createWriteStream(filePath);
          await new Promise((resolve, reject) => {
            stream.pipe(writable);
            stream.on("end", resolve);
            stream.on("error", reject);
          });

          item.filePath = filePath;
          console.log(`✅ บันทึกไฟล์สำเร็จ: ${filePath}`);

          // อัปเดต log
          saveChatLog(item);
        }
      }

      // เขียน log กลับไฟล์เดิม
      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    }

    console.log("🎯 ดาวน์โหลดไฟล์ทั้งหมดเสร็จสิ้น!");

  } catch (error) {
    console.error("❌ downloadAllExpiredFiles.Error:", error.message);
  }
}

/**
 * 🔹 saveChatLog เก็บข้อมูลสำคัญ
 */
function saveChatLog(message) {
  const { logFile } = ensureLogSetup();

  const logEntry = {
    timestamp: message.timestamp || new Date().toISOString(),
    senderName: message.senderName || null,
    text: message.text || null,
    filePath: message.filePath || null
  };

  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
}

/**
 * 🔹 คืนค่านามสกุลไฟล์ตามประเภท
 */
function getFileExtension(type) {
  switch (type) {
    case "images": return "jpg";
    case "videos": return "mp4";
    case "audio": return "m4a";
    default: return "bin";
  }
}

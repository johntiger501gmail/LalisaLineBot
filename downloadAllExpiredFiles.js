import fs from "fs";
import path from "path";

function ensureLogSetup() {
  const baseDir = path.join(process.cwd(), "chat_history");
  const logDir = path.join(baseDir, "logs");
  const logFile = path.join(logDir, "messages.jsonl");

  // สร้างโฟลเดอร์หลักและ logs
  [baseDir, logDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // สร้างไฟล์ log ถ้ายังไม่มี
  if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "");

  // สร้างโฟลเดอร์สำหรับเก็บไฟล์ดาวน์โหลดล่วงหน้า
  const folders = ["images", "videos", "files", "audio"];
  folders.forEach(f => {
    const folderPath = path.join(baseDir, f);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  });

  console.log("✅ ensureLogSetup: ตรวจสอบโฟลเดอร์และไฟล์ log เสร็จเรียบร้อย");

  return { baseDir, logDir, logFile };
}

export default ensureLogSetup;

/**
 * 🔹 saveChatLog เก็บข้อมูลสำคัญ
 */
function saveChatLog(message) {
  const { logFile } = ensureLogSetup();

  const logEntry = {
    timestamp: message.timestamp || new Date().toISOString(),
    senderName: message.senderName || null,
    text: message.text || null,
    filePath: message.filePath || null,
    messageType: message.messageType || null,
    messageId: message.messageId || null
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

/**
 * 🔹 ดาวน์โหลดไฟล์จาก log และอัปเดต log
 */
export async function downloadAllExpiredFiles(client) {
  try {
    const { baseDir, logDir } = ensureLogSetup();

    // อ่านไฟล์ log messages.jsonl
    const logFile = path.join(logDir, "messages.jsonl");
    if (!fs.existsSync(logFile)) return console.log("⚠️ ไม่มีไฟล์ log");

    const lines = fs.readFileSync(logFile, "utf-8").split("\n").filter(l => l.trim() !== "");
    const logData = lines.map(l => JSON.parse(l));

    console.log(`🧩 downloadAll: พบ log ทั้งหมด ${logData.length} รายการ`);

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

        if (fs.existsSync(filePath)) {
          console.log(`⏩ ข้ามไฟล์ที่มีอยู่แล้ว: ${fileName}`);
          continue;
        }

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

        saveChatLog(item);
      }
    }

    // เขียน log กลับไฟล์เดิม
    fs.writeFileSync(logFile, logData.map(d => JSON.stringify(d)).join("\n"));

    console.log("🎯 downloadAll: ดาวน์โหลดไฟล์ทั้งหมดเสร็จสิ้น!");

  } catch (error) {
    console.error("❌ downloadAllExpiredFiles.Error:", error);
  }
}

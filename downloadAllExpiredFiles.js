import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();

// แปลง URL ของโมดูลเป็น path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// สร้าง Google Auth จาก environment variables
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

async function ensureLogSetup() {
  const client = await auth.getClient();
  const drive = google.drive({ version: "v3", auth: client });

  // ฟังก์ชันช่วยสร้างโฟลเดอร์บน Google Drive
  async function createDriveFolder(name, parentId = null) {
    const fileMetadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    };
    const res = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name",
    });
    console.log(`✅ สร้างโฟลเดอร์: ${res.data.name} (${res.data.id})`);
    return res.data.id;
  }

  // ฟังก์ชันช่วยสร้างไฟล์บน Google Drive
  async function createDriveFile(name, folderId) {
    const fileMetadata = {
      name,
      parents: [folderId],
    };
    const media = {
      mimeType: "application/json",
      body: "",
    };
    const res = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, name",
    });
    console.log(`✅ สร้างไฟล์ log: ${res.data.name} (${res.data.id})`);
    return res.data.id;
  }

  // สร้างโฟลเดอร์หลัก
  const baseDirId = await createDriveFolder("Google Drive");

  // สร้างโฟลเดอร์ logs และไฟล์ log
  const logDirId = await createDriveFolder("logs", baseDirId);
  const logFileId = await createDriveFile("messages.jsonl", logDirId);

  // สร้างโฟลเดอร์ย่อย
  const folders = ["images", "videos", "files", "audio"];
  for (const f of folders) {
    await createDriveFolder(f, baseDirId);
  }

  console.log("📂 การตรวจสอบโฟลเดอร์และไฟล์ log บน Google Drive เสร็จเรียบร้อย");

  return { baseDirId, logDirId, logFileId };
}

// เรียกใช้งาน
ensureLogSetup().catch(console.error);

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

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();

// อ่านค่าโปรเจกต์จาก .env
const projectId = process.env.GOOGLE_PROJECT_ID;

const privateKey = Buffer.from(
  process.env.GOOGLE_PRIVATE_KEY_BASE64,
  "base64"
).toString("utf8");

// สร้างออบเจ็กต์ auth โดยใช้ credentials จาก environment
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// แปลง URL ของโมดูลเป็น path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// * 🔹 ดาวน์โหลดไฟล์จาก log และอัปเดต log
export async function downloadAllExpiredFiles(client) {
    try {
        // 1️⃣ เตรียมโฟลเดอร์ในเครื่อง
        const { baseDir, logs: logDir } = ensureLocalFolders();

        // 2️⃣ เตรียมโฟลเดอร์บน Drive
        const driveFolders = await ensureDriveFolders();

        // 3️⃣ โหลด log
        const logFile = path.join(logDir, "messages.jsonl");
        if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "", "utf-8");
        const logData = fs.readFileSync(logFile, "utf-8")
            .split("\n")
            .filter(l => l.trim() !== "")
            .map(l => JSON.parse(l));

        // 4️⃣ ประมวลผลแต่ละรายการ
        for (const item of logData) {
            if (!item.filePath && item.messageType && item.messageId) {
                let folderType = "files";
                if (item.messageType === "image") folderType = "images";
                if (item.messageType === "video") folderType = "videos";
                if (item.messageType === "audio") folderType = "audio";

                const dateDir = new Date(item.timestamp).toISOString().split("T")[0];
                const typeDir = path.join(baseDir, folderType, dateDir);
                if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });

                const fileName = `${Date.now()}_${item.messageId}.${getFileExtension(folderType)}`;
                const filePath = path.join(typeDir, fileName);

                if (fs.existsSync(filePath)) continue;

                console.log(`⬇️ ดาวน์โหลด ${item.messageType} (${item.messageId})...`);
                const stream = await client.getMessageContent(item.messageId);

                await new Promise((resolve, reject) => {
                    const writable = fs.createWriteStream(filePath);
                    stream.pipe(writable);
                    stream.on("end", resolve);
                    stream.on("error", reject);
                });

                item.filePath = filePath;
                console.log(`✅ บันทึกไฟล์สำเร็จ: ${filePath}`);

                // optional: upload ไป Google Drive
                // await uploadFileToDrive(filePath, fileName, driveFolders[folderType]);
            }
        }

        // 5️⃣ เขียน log กลับไฟล์เดิม
        fs.writeFileSync(logFile, logData.map(d => JSON.stringify(d)).join("\n"), "utf-8");
        console.log("🎯 ดาวน์โหลดไฟล์ทั้งหมดเสร็จสิ้น!");

    } catch (error) {
        console.error("❌ downloadAllExpiredFiles.Error:", error);
    }
}

// 🔹 สร้างโฟลเดอร์โลคอลสี่อัน
export function ensureLocalFolders() {
  const baseDir = path.join(__dirname, "downloads");
  const folderNames = ["logs", "images", "videos", "audio"];

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const folderPaths = {};

  folderNames.forEach(name => {
    const fullPath = path.join(baseDir, name);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ สร้างโฟลเดอร์โลคอล: ${fullPath}`);
    }
    folderPaths[name] = fullPath;
  });

  return { baseDir, ...folderPaths };
}

// 🔹 สร้าง folder บน Google Drive
export async function ensureDriveFolders() {
  const folderNames = ["logs", "images", "videos", "audio"];
  const folderIds = {};

  for (const name of folderNames) {
    folderIds[name] = await createDriveFolderIfNotExists(name);
  }

  return folderIds;
}

// 🔹 ฟังก์ชันช่วยสร้าง folder บน Drive ถ้ายังไม่มี
async function createDriveFolderIfNotExists(name, parentId = null) {
  const client = await auth.getClient();
  const drive = google.drive({ version: "v3", auth: client });

  // ตรวจสอบว่ามี folder อยู่แล้วหรือไม่
  const qParts = [`mimeType='application/vnd.google-apps.folder'`, `name='${name}'`];
  if (parentId) qParts.push(`'${parentId}' in parents`);
  const resList = await drive.files.list({ q: qParts.join(" and "), fields: "files(id, name)" });

  if (resList.data.files && resList.data.files.length > 0) {
    console.log(`ℹ️ โฟลเดอร์ Drive มีอยู่แล้ว: ${resList.data.files[0].name}`);
    return resList.data.files[0].id;
  }

  // ถ้ายังไม่มี สร้าง folder
  const fileMetadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : [],
  };

  const res = await drive.files.create({ requestBody: fileMetadata, fields: "id, name" });
  console.log(`✅ สร้างโฟลเดอร์บน Drive: ${res.data.name} (${res.data.id})`);
  return res.data.id;
}
// 🔹 saveChatLog เก็บข้อมูลสำคัญ
function saveChatLog(message) {
  const { logDir } = ensureLocalLogSetup(); // แก้ตรงนี้
  const logFile = path.join(logDir, "messages.jsonl");

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

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
const driveClient = await auth.getClient();
const drive = google.drive({ version: "v3", auth: driveClient });
/**
 * 🔹 ดาวน์โหลดไฟล์จาก log และอัปเดต log
 */
// 🔹 ฟังก์ชันหลัก
export async function downloadAllExpiredFiles(client) {
  try {
    // 1️⃣ เตรียมโฟลเดอร์บน Drive
    const folderIds = await ensureDriveFolders(drive);


    // 2️⃣ โหลด log หรือสร้างใหม่ถ้าไม่มี
    const { fileId: logFileId, logData } = await loadDriveLog(drive, folderIds.logs);


    // 3️⃣ ดาวน์โหลดไฟล์
    for (const item of logData) {
      if (item.filePath || !item.messageType || !item.messageId) continue;


      let folderType = "files";
      if (item.messageType === "image") folderType = "images";
      if (item.messageType === "video") folderType = "videos";
      if (item.messageType === "audio") folderType = "audio";


      console.log(`⬇️ ดาวน์โหลด ${item.messageType} (${item.messageId})...`);
      const stream = await client.getMessageContent(item.messageId);


      // สร้างไฟล์ temp ก่อนอัปโหลดไป Drive
      const tmpPath = path.join(process.cwd(), `${Date.now()}_${item.messageId}.${getFileExtension(folderType)}`);
      await new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(tmpPath);
        stream.pipe(writable);
        stream.on("end", resolve);
        stream.on("error", reject);
      });


      // อัปโหลดไป Drive folder ที่ตรงประเภท
      const fileMetadata = { name: path.basename(tmpPath), parents: [folderIds[folderType]] };
      const media = { body: fs.createReadStream(tmpPath) };
      const uploaded = await drive.files.create({ requestBody: fileMetadata, media, fields: "id, name" });


      item.filePath = `DriveFileID:${uploaded.data.id}`;
      console.log(`✅ บันทึกไฟล์บน Drive: ${uploaded.data.name}`);


      fs.unlinkSync(tmpPath); // ลบ temp file
    }


    // 4️⃣ เขียน log กลับไป Drive
    await saveDriveLog(drive, folderIds.logs, logFileId, logData);
    console.log("🎯 ดาวน์โหลดไฟล์ทั้งหมดเสร็จสิ้น!");


  } catch (err) {
    console.error("❌ downloadAllExpiredFiles.Error:", err);
  }
}
// ----------------------- ฟังก์ชันช่วยเหลือ -------------------------
// Step 1: สร้างโฟลเดอร์บน Drive
async function ensureDriveFolders(drive) {
  const folderNames = ["logs", "images", "videos", "audio"];
  const folderIds = {};


  for (const name of folderNames) {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}'`;
    const res = await drive.files.list({ q, fields: "files(id, name)" });


    if (res.data.files && res.data.files.length > 0) {
      folderIds[name] = res.data.files[0].id;
      console.log(`ℹ️ โฟลเดอร์ Drive มีอยู่แล้ว: ${name}`);
    } else {
      const fileMetadata = { name, mimeType: "application/vnd.google-apps.folder" };
      const folder = await drive.files.create({ requestBody: fileMetadata, fields: "id, name" });
      folderIds[name] = folder.data.id;
      console.log(`✅ สร้างโฟลเดอร์บน Drive: ${folder.data.name}`);
    }
  }
  return folderIds;
}

// Step 2: โหลด log จาก Drive หรือสร้างใหม่
async function loadDriveLog(drive, logsFolderId) {
  const q = `'${logsFolderId}' in parents and name='messages.jsonl'`;
  const res = await drive.files.list({ q, fields: "files(id, name)" });


  let fileId;
  if (res.data.files && res.data.files.length > 0) {
    fileId = res.data.files[0].id;
    console.log("ℹ️ พบไฟล์ log บน Drive: messages.jsonl");
  } else {
    const fileMetadata = { name: "messages.jsonl", parents: [logsFolderId] };
    const media = { mimeType: "application/json", body: "" };
    const file = await drive.files.create({ requestBody: fileMetadata, media, fields: "id, name" });
    fileId = file.data.id;
    console.log("✅ สร้างไฟล์ log ใหม่บน Drive: messages.jsonl");
  }


  // ดาวน์โหลดเนื้อหา log
  const contentRes = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  let data = "";
  await new Promise((resolve, reject) => {
    contentRes.data.on("data", chunk => (data += chunk));
    contentRes.data.on("end", resolve);
    contentRes.data.on("error", reject);
  });


  const lines = data.split("\n").filter(l => l.trim() !== "");
  const logData = lines.map(l => JSON.parse(l));


  return { fileId, logData };
}


// Step 4: บันทึก log กลับไป Drive
async function saveDriveLog(drive, logsFolderId, fileId, logData) {
  const tempPath = path.join(process.cwd(), `messages_temp.jsonl`);
  fs.writeFileSync(tempPath, logData.map(d => JSON.stringify(d)).join("\n"), "utf8");


  const media = { body: fs.createReadStream(tempPath) };
  await drive.files.update({ fileId, media });
  fs.unlinkSync(tempPath);
}


// กำหนดนามสกุลไฟล์
function getFileExtension(type) {
  switch (type) {
    case "images": return "jpg";
    case "videos": return "mp4";
    case "audio": return "m4a";
    default: return "bin";
  }
}

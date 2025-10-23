import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 🔹 path ของไฟล์ปัจจุบัน
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------------------------------------------
// * 🔹 ฟังก์ชันหลัก: ดาวน์โหลดไฟล์จาก log แล้วอัปโหลดขึ้น Google Drive
// --------------------------------------------------------------
export async function downloadAllExpiredFiles(client) {
    try {
        // 1️⃣ เชื่อมต่อ Google Drive API
        const driveClient = await auth.getClient();
        const drive = google.drive({ version: "v3", auth: driveClient });

        // 2️⃣ ตรวจสอบและสร้างโฟลเดอร์บน Drive (logs, images, videos, audio)
        const folderIds = await ensureDriveFolders(drive);

        // 3️⃣ โหลด log จากโฟลเดอร์ logs (messages.jsonl)
        const { fileId: logFileId, logData } = await loadDriveLog(drive, folderIds.logs);
        console.log(`📄 พบ log ${logData.length} รายการ`);

        // 4️⃣ ประมวลผลทีละรายการ
        for (const item of logData) {
            if (item.filePath || !item.messageId || !item.messageType) continue;

            // จัดการประเภทไฟล์
            let folderType = "files";
            if (item.messageType === "image") folderType = "images";
            if (item.messageType === "video") folderType = "videos";
            if (item.messageType === "audio") folderType = "audio";

            console.log(`⬇️ ดาวน์โหลด ${item.messageType} (${item.messageId})...`);

            // ดาวน์โหลดไฟล์จาก client (เช่น LINE หรือ Chat API)
            const stream = await client.getMessageContent(item.messageId);

            // บันทึกเป็น temp ไฟล์ในเครื่อง
            const tmpPath = path.join(process.cwd(), `${Date.now()}_${item.messageId}.${getFileExtension(folderType)}`);
            await new Promise((resolve, reject) => {
                const writable = fs.createWriteStream(tmpPath);
                stream.pipe(writable);
                stream.on("end", resolve);
                stream.on("error", reject);
            });

            // 5️⃣ อัปโหลดไฟล์ขึ้น Google Drive
            const fileMetadata = { name: path.basename(tmpPath), parents: [folderIds[folderType]] };
            const media = { body: fs.createReadStream(tmpPath) };
            const uploaded = await drive.files.create({ requestBody: fileMetadata, media, fields: "id, name" });

            // 6️⃣ อัปเดต log ด้วย Drive File ID
            item.filePath = `DriveFileID:${uploaded.data.id}`;
            console.log(`✅ อัปโหลดเสร็จ: ${uploaded.data.name} (${uploaded.data.id})`);

            fs.unlinkSync(tmpPath); // ลบ temp
        }

        // 7️⃣ เขียน log กลับขึ้น Google Drive
        await saveDriveLog(drive, logFileId, logData);
        console.log("🎯 ดาวน์โหลดและอัปโหลดไฟล์ทั้งหมดเสร็จสิ้น!");

    } catch (error) {
        console.error("❌ downloadAllExpiredFiles.Error:", error);
    }
}

// --------------------------------------------------------------
// 🔹 สร้างโฟลเดอร์บน Google Drive (logs, images, videos, audio)
// --------------------------------------------------------------
async function ensureDriveFolders(drive) {
    const folderNames = ["logs", "images", "videos", "audio"];
    const folderIds = {};

    for (const name of folderNames) {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
        const res = await drive.files.list({ q, fields: "files(id, name)" });

        if (res.data.files.length > 0) {
            folderIds[name] = res.data.files[0].id;
            console.log(`ℹ️ พบโฟลเดอร์บน Drive แล้ว: ${name}`);
        } else {
            const fileMetadata = { name, mimeType: "application/vnd.google-apps.folder" };
            const folder = await drive.files.create({ requestBody: fileMetadata, fields: "id, name" });
            folderIds[name] = folder.data.id;
            console.log(`✅ สร้างโฟลเดอร์บน Drive: ${name}`);
        }
    }
    return folderIds;
}

// --------------------------------------------------------------
// 🔹 โหลด log (messages.jsonl) จากโฟลเดอร์ logs
// --------------------------------------------------------------
async function loadDriveLog(drive, logsFolderId) {
    const q = `'${logsFolderId}' in parents and name='messages.jsonl' and trashed=false`;
    const res = await drive.files.list({ q, fields: "files(id, name)" });

    let fileId;
    if (res.data.files.length > 0) {
        fileId = res.data.files[0].id;
        console.log("ℹ️ พบไฟล์ log บน Drive");
    } else {
        const fileMetadata = { name: "messages.jsonl", parents: [logsFolderId] };
        const media = { mimeType: "application/json", body: "" };
        const file = await drive.files.create({ requestBody: fileMetadata, media, fields: "id, name" });
        fileId = file.data.id;
        console.log("✅ สร้างไฟล์ log ใหม่บน Drive");
    }

    // ดาวน์โหลดเนื้อหา log
    let data = "";
    const resStream = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
    await new Promise((resolve, reject) => {
        resStream.data.on("data", chunk => (data += chunk));
        resStream.data.on("end", resolve);
        resStream.data.on("error", reject);
    });

    const lines = data.split("\n").filter(l => l.trim() !== "");
    const logData = lines.map(l => JSON.parse(l));

    return { fileId, logData };
}

// --------------------------------------------------------------
// 🔹 เขียน log กลับไปยัง Google Drive
// --------------------------------------------------------------
async function saveDriveLog(drive, fileId, logData) {
    const tempPath = path.join(process.cwd(), `messages_temp.jsonl`);
    fs.writeFileSync(tempPath, logData.map(d => JSON.stringify(d)).join("\n"), "utf8");

    const media = { body: fs.createReadStream(tempPath) };
    await drive.files.update({ fileId, media });
    fs.unlinkSync(tempPath);
    console.log("📝 อัปเดต log กลับไปที่ Drive แล้ว");
}

// --------------------------------------------------------------
// 🔹 คืนค่านามสกุลไฟล์ตามประเภท
// --------------------------------------------------------------
function getFileExtension(type) {
    switch (type) {
        case "images": return "jpg";
        case "videos": return "mp4";
        case "audio": return "m4a";
        default: return "bin";
    }
}

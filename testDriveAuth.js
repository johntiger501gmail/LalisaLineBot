import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const projectId = process.env.GOOGLE_PROJECT_ID;

// สร้าง Google Drive client
const driveClient = new google.drive_v3.Drive({
    auth: new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/drive"],
    }),
    version: "v3",
});

// ฟังก์ชันทดสอบการเชื่อมต่อ Google Drive
export async function testDriveAuth() {
    if (!projectId) throw new Error("Google project ID is not defined.");

    // ตรวจสอบหรือสร้าง global.driveAuthStatus
    if (!global.driveAuthStatus) global.driveAuthStatus = {};

    try {
        const authClient = await driveClient.auth.getClient();
        const drive = google.drive({ version: "v3", auth: authClient });

        const res = await drive.files.list({ pageSize: 5 });
        console.log("✅ Drive API เชื่อมต่อสำเร็จ:", res.data.files);

        global.driveAuthStatus.connected = true;
        global.driveAuthStatus.files = res.data.files;
        return res.data.files;
    } catch (error) {
        console.error("❌ Drive auth error:", error);
        global.driveAuthStatus.connected = false;
        throw error;
    }
}

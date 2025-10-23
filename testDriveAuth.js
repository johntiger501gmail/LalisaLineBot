import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// ฟังก์ชันทดสอบการเชื่อมต่อ Google Drive
export async function testDriveAuth() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/drive"],
        });

        const client = await auth.getClient();
        const drive = google.drive({ version: "v3", auth: client });

        const res = await drive.files.list({ pageSize: 5 });
        console.log("✅ Drive API เชื่อมต่อสำเร็จ:", res.data.files);

        // เก็บสถานะ global
        if (!global.driveAuthStatus) global.driveAuthStatus = {};
        global.driveAuthStatus.connected = true;
        global.driveAuthStatus.files = res.data.files;

        return res.data.files;
    } catch (error) {
        console.error("❌ Drive auth error:", error);
        if (!global.driveAuthStatus) global.driveAuthStatus = {};
        global.driveAuthStatus.connected = false;
        throw error;
    }
}

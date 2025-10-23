import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();
export async function testDriveAuth() {
    try {
        // แปลง \n ที่อยู่ใน ENV ให้เป็น new line จริง
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: privateKey,
            },
            scopes: ["https://www.googleapis.com/auth/drive"],
        });

        const client = await auth.getClient();
        const drive = google.drive({ version: "v3", auth: client });

        const res = await drive.files.list({ pageSize: 1 });
        console.log("✅ Drive API เชื่อมต่อสำเร็จ:", res.data.files);
    } catch (error) {
        console.error("❌ Drive auth error:", error);
    }
}

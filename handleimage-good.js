import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { sendFallbackMenu } from './ansmenu.js';
import { downloadAndSaveImage } from './imageload.js';


export async function handleImageMessage(event, replyToken, userId, client, userName) {
  try {
    // 🧩 3. ดาวน์โหลดและบันทึกภาพจากผู้ใช้
    const imagePath = await downloadAndSaveImage(event, replyToken, userId, client, userName);
    console.log("🧩handleImage.imagePath:", JSON.stringify(imagePath, null, 2));

    if (!imagePath) {
      console.error("🧩handleImage.Failed to download or save image");
      return null;
    }

    // 🧩 4. สร้าง URL สำหรับภาพที่บันทึกไว้
    const fileName = imagePath.split("/").pop();
    const baseUrl = "https://lalisalinebot.onrender.com/images";

    const searchResult = {
      type: "image",
      url: `${baseUrl}/${fileName}`,
    };
    console.log("🧩handleImage.searchResult.url:", searchResult.url);

    // 🧩 5. รวมข้อมูลทั้งหมดไว้ใน contentText
    const contentText = {
      resultDBF: "ไม่มีข้อมูลจากไฟล์ DBF",
      intentResult: "ไม่มีกระบวนการ Intent",
      searchResult: searchResult || {},
      resultOther: "ไม่มีข้อมูลเพิ่มเติม",
    };

    console.log("🧩handleImage.contentText:", JSON.stringify(contentText, null, 2));

    // 🧩 7. (อาจ) ลบภาพหลังใช้งาน
    const filePath = path.join(process.cwd(), "images", fileName);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("🧩handleImage.Error deleting file:", err);
      } else {
        console.log("🧩handleImage.File deleted:", filePath);
      }
    });

  } catch (error) {
    // 🧩 8. บันทึกข้อผิดพลาดถ้ามีปัญหา
    console.error("🧩handleImage.Error:", {
      message: error.message,
      response: error.response?.data,
    });
  }
}


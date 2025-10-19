// videos.js ฟังก์ชัน handleVideoMessage
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleVideoMessage(event, replyToken, message, client) {
  const videoUrl = message.contentProvider?.originalContentUrl || "";
  const tempFilePath = path.join(__dirname, "temp_video.mp4");

  if (!videoUrl) {
    console.log("Unknown video source:", videoUrl);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "ไม่พบ URL ของวิดีโอ",
    });
    // ดาวน์โหลดวิดีโอ
    console.log("videos:Downloading video from:", videoUrl);
    const response = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log("Videos: downloaded successfully:", tempFilePath);

    // ส่งวิดีโอกลับไปยังผู้ใช้
    const videoMessage = {
      type: "video",
      originalContentUrl: `file://${tempFilePath}`, // เปลี่ยนเป็น URL จริงเมื่ออัปโหลด
      previewImageUrl: "https://via.placeholder.com/240x120.png?text=Video",
    };

    await client.replyMessage(replyToken, videoMessage);
    console.log("Videos: replied successfully.");
    return;
  }

  try {
    // ตรวจสอบแหล่งที่มาของวิดีโอ
    if (videoUrl.includes("tiktok.com")) {
      console.log("Video source: TikTok");
      await client.replyMessage(replyToken, {
        type: "text",
        text: `ขอบคุณสำหรับคลิป TikTok! URL: ${videoUrl}`,
      });
    } else if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      console.log("Video source: YouTube");
      await client.replyMessage(replyToken, {
        type: "text",
        text: `ขอบคุณสำหรับคลิป YouTube! URL: ${videoUrl}`,
      });
    } else {
      console.log("Video source: Other");
      await client.replyMessage(replyToken, {
        type: "text",
        text: `ขอบคุณสำหรับคลิปอื่นๆ! URL: ${videoUrl}`,
      });
    }
  } catch (error) {
    console.error("Error processing video:", error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "เกิดข้อผิดพลาดในการประมวลผลวิดีโอ",
    });
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("Temporary file deleted:", tempFilePath);
    }
  }
}

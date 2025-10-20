import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ตั้งค่า __dirname สำหรับ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const destinationDir = path.join(__dirname, 'images');
const serverUrl = "https://lalisalinebot.onrender.com"; // กำหนด URL ของเซิร์ฟเวอร์ "https://tiger501linebot.onrender.com";

export async function downloadAndSaveImage(event) {
  // ตรวจสอบและดึงข้อมูลภาพจาก event
  if (!event || !event.message) {
    console.error("imageload.Invalid event or missing message data");
    return;
  }
  const imageId = event.message.id; // ID ของข้อความที่เป็นภาพ
  if (!imageId) {
    console.error("imageload.No image ID found in the message");
    return;
  }
  const downloadUrl = `https://api-data.line.me/v2/bot/message/${imageId}/content`;

  try {
    if (!downloadUrl) throw new Error('Invalid image URL');

    const baseUrl = 'https://api-data.line.me/v2/bot/message/';
    const completeImageUrl = downloadUrl.startsWith('http')
      ? downloadUrl
      : `${baseUrl}${downloadUrl}/content`;

    // ตรวจสอบ Content-Type
    const headResponse = await axios.head(completeImageUrl, {
      headers: {
        Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
      },
    });

    const contentType = headResponse.headers['content-type'];
    if (!contentType.startsWith('image/')) {
      throw new Error('The URL does not point to an image.');
    }

    // ดาวน์โหลดไฟล์
    const response = await axios.get(completeImageUrl, {
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
      },
    });

    // แยกชื่อไฟล์จาก URL โดยใช้ timestamp
    const fileName = `${Date.now()}_image.jpg`;
    // สร้างโฟลเดอร์หากยังไม่มี
    if (!fs.existsSync(destinationDir)) fs.mkdirSync(destinationDir, { recursive: true });

    const filePath = path.join(destinationDir, fileName);

    // บันทึกไฟล์ลงในระบบ
    const writeStream = fs.createWriteStream(filePath);
    response.data.pipe(writeStream);

    // รอให้การเขียนไฟล์เสร็จสมบูรณ์
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    // ตรวจสอบ URL ที่สามารถเปิดได้
    const imageUrl = `${serverUrl}/images/${fileName}`;
    //console.log(`imageload.filePath: ${filePath}`);
    console.log(`imageload.imageUrl: ${imageUrl}`);
    const filecanopen = await checkUrl(imageUrl);
    if (!filecanopen) {
      console.error(`imageload.File ${imageUrl} can't be opened`);
      return "https://i.imgur.com/V1TSVpc.jpg";  // ใช้ URL สำรองในกรณีไม่สามารถเปิดได้
    }
    
    // ส่งกลับ URL ที่สามารถเข้าถึงไฟล์ที่บันทึกในเซิร์ฟเวอร์
    return `${serverUrl}/images/${fileName}`;
  } catch (error) {
    console.error('imageload.Error downloading image:', error.message);
    return;
  }
}

export async function checkUrl(imageUrl) {
  try {
      const response = await axios.get(imageUrl, { timeout: 5000 });  // 5 วินาที
      // ตรวจสอบว่า status code 2xx คือ success
      if (response.status >= 200 && response.status < 300) {
          return true;  // URL ใช้งานได้
      } else {
          return false;  // ถ้า status code ไม่ใช่ 2xx ก็ถือว่า URL ใช้งานไม่ได้
      }
  } catch (error) {
      // ไม่พิมพ์ข้อความข้อผิดพลาดในกรณีที่เกิดข้อผิดพลาด
      console.log("imageload.checkUrl >> เปิดไม่ได้ url:", imageUrl);
      return false;  // ถ้าเกิดข้อผิดพลาดจะคืนค่า false
  }
}
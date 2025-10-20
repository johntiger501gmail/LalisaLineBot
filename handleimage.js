import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { downloadAndSaveImage } from './imageload.js'; 
import { sendFallbackMenu } from './ansmenu.js'
export async function handleImageMessage(event, replyToken, userId, client, userName) {
    // สร้างข้อความที่อาจจะถูกเลือกสุ่ม
  const messages = [
    `ขอบคุณ สำหรับภาพที่ส่งมา! ${userName}`,
    `ขอบคุณ ภาพที่ส่งมาดูดีมากเลย! ${userName}`,
    `ขอบคุณ อย่าส่งภาพมาอีกนะ! ${userName}`,
  ];
  
  // เลือกข้อความแบบสุ่ม
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  // ผลลัพธ์ค่าเริ่มต้น
  const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF";
  const intentResult = "ไม่มีกระบวนการ Intent";
  const resultOther = "ไม่มีข้อมูลเพิ่มเติม";
  
  // ดาวน์โหลดและบันทึกภาพ
  const imagePath = await downloadAndSaveImage(event, replyToken, userId, client, userName);
  console.log("handleImage.imagePath", JSON.stringify(imagePath, null, 2));
  if (imagePath) {
    // ถ้าภาพดาวน์โหลดสำเร็จ ให้แสดงผลในแชทพร้อมข้อความ randomMessage
    const searchResult = {
      type: 'image',
      url: `https://lalisalinebot.onrender.com/images/${imagePath.split('/').pop()}`, // ใช้ URL ของภาพที่เก็บในเซิร์ฟเวอร์
      text: randomMessage, // ข้อความที่แสดง
    };
    console.log("handleImage.searchResult.url", searchResult.url);
    // รวมข้อมูลใน contentText
    const contentText = {
      resultDBF: resultDBF || "ไม่มีข้อมูลจากฐานข้อมูล",
      intentResult: intentResult || "ไม่มีกระบวนการ Intent",
      searchResult: searchResult || {},
      resultOther: resultOther || "ไม่มีข้อมูลเพิ่มเติม",
    };
    
    try {
      // ส่งข้อความกลับไปยังผู้ใช้ในรูปแบบ Flex Message
      await sendFallbackMenu(replyToken, client, userId, searchResult, contentText);
      
      /* ลบไฟล์หลังจากการส่งเสร็จ
      const filePath = path.join(__dirname, 'images', imagePath.split('/').pop());
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {
          console.log("File deleted:", filePath);
        }
      }); */
    } catch (error) {
      console.error("handleImage.Error sending reply message:", error.message);
    }
  } else {
      // ถ้าดาวน์โหลดภาพไม่สำเร็จ
      console.error('handleImage.Failed to download or save image');
      return null;
  }
}

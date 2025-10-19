import { sendFallbackMenu } from './ansmenu.js'
export const handleStickerMessage = async (event, replyToken, userId, client) => {
    if (!event || !event.source) {
      console.error("Invalid event data", event);
      return;
    }
  
    const message = {
      type: "sticker",
      text: "sticker"
    }; // ดึงข้อมูล message จาก event
    //console.log("swEvents.message.type", message.type);
  
    if (message.type === "sticker") {
      // ตัวแปรพื้นฐาน
      const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF";
      const intentResult = "ไม่มีกระบวนการ Intent";
      const packageIds = [1, 2, 3]; // กำหนดตัวเลือก Package ID
      const packageId = packageIds[Math.floor(Math.random() * packageIds.length)]; // สุ่มค่า packageId
      const stickerId = Math.floor(Math.random() * 40) + 1; // สุ่ม stickerId ในช่วง 1 ถึง 40
  
      const randomSticker = {
        type: "sticker",
        packageId: String(packageId),
        stickerId: String(stickerId),
      };
  
      // ตรวจสอบสถานะ userClickStatus
      if (!global.userClickStatus) global.userClickStatus = {}; // ตรวจสอบและกำหนดค่าเริ่มต้น
      let resultOther;
  
      if (Object.keys(global.userClickStatus).length === 0 || !global.userClickStatus[userId]) {
        resultOther = "ไม่มีข้อมูล"; // หากว่างเปล่า
      } else {
        resultOther = "มีค่าอะไรสักอย่าง"; // ทดสอบค่าที่มี
      }
  
      // สร้าง contentText
      const contentText = {
        resultDBF: resultDBF,
        intentResult: intentResult,
        searchResult: randomSticker,
        resultOther: resultOther,
      };
  
      try {
        console.log(
          `swEvents.sticker: ${contentText.searchResult?.packageId} ${contentText.searchResult?.stickerId} type: ${contentText.searchResult?.type}`
        );
  
        // ส่งเมนู fallback
        await sendFallbackMenu(replyToken, client, userId, message, contentText);
      } catch (err) {
        const errMessage = err.response?.data || err.message;
        // สร้างข้อความที่ใช้ในการตอบกลับ
        const errorMessage = {
          type: "text",
          text: errMessage,
        };
        await client.replyMessage(replyToken, errorMessage);
      }
    } else {
      console.error("swEvents.Unsupported message type:", message.type);
      await client.replyMessage(replyToken, {
        type: "text",
        text: "ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้. swEvents.",
      });
    }
  };
  
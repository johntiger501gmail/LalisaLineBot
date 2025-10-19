//swEvents.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { downloadAndSaveImage } from './imageload.js'; // นำเข้า downloadAndSaveImage จาก imageload.js
import { handleAudioMessage } from "./handleaudio.js";
import { handleVideoMessage } from "./videos.js";
import { handleReplyMessage } from "./replys.js";
import { handleTextMessage } from "./textmessages.js";
import { handleSelectedMenu } from './handleselect.js';
import { sendFallbackMenu } from './ansmenu.js'
import { getGoogleSearchResults } from "./googles.js";
export async function handleSwitchEventTypes(event, replyToken, userId, client, botUserId) {
  const eventType = event.type || null;
  let message = event.message || null;  // ใช้ let แทน const
  const messageType = message ? message.type : null;
  const messageText = messageType === "text" ? message.text : null;
  const timestamp = event.timestamp || null;
  const source = event.source || null;
  const sourceType = source ? source.type : null;
  const sourceId = sourceType === "user" ? source.userId :
                  sourceType === "group" ? source.groupId : 
                  sourceType === "room" ? source.roomId : null;
  let locationMessage;
  switch (event.type) {
    case "postback":
      const postbackData = event.postback.data;
      console.log("sw.event.type:postbackData:", postbackData);
      await handleSelectedMenu(event, client, event.replyToken, userId, postbackData);  // ใช้ await
      break;
      
    case "follow":
      console.log("sw.event.type:Follow > ", message);
      await client.replyMessage(replyToken, {
        type: "text",
        text: "ยินดีต้อนรับ! ขอบคุณที่เพิ่มฉันเป็นเพื่อน",
      }).catch(console.error);
      break;

    case "join":
      console.log("sw.event.type:join > ", message);
      const joinMessage = {
        type: "text",
        text: "สวัสดีทุกคน! ฉันได้เข้าร่วมกลุ่มนี้แล้ว!"
      };
      await client.replyMessage(replyToken, joinMessage).catch(console.error);
      break;

    case "leave":
      console.log("sw.event.type: leave > ", message);
      console.log(`index:Bot left group: ${event.source.groupId}`);
      break;

    case "message":
      //console.log("sw.EventType:", event.type, message.type);
      //console.log("sw.Events.Message.type:", message.type);
      
      if (!message || !message.type) {
        console.error("sw.Message or message.type is missing or invalid:", message);
        await client.replyMessage(replyToken, {
          type: "text",
          text: `swEvents. ${message} ไม่สามารถประมวลผลข้อความของคุณได้.`
        });
      }
      switch (message.type.toLowerCase()) {
        case "location":  // กรณีโลเคชัน
          console.log("sw.EventType.Received a location message:", message);

          const googleMapsLink = `https://www.google.com/maps?q=${message.latitude},${message.longitude}`;

          const locationMessage = {
              type: "text",
              text: `คุณแชร์โลเคชัน: ${message.title}\n` +
                    `ที่อยู่: ${message.address}\n` +
                    `พิกัด: (${message.latitude}, ${message.longitude})\n\n` +
                    `ดูแผนที่: ${googleMapsLink}`
          };

          await client.replyMessage(replyToken, locationMessage);
          break;
        case "text":
          if (message.repliedMessage && typeof message.repliedMessage === "object") {
            try {
              await handleReplyMessage(event, replyToken, client, botUserId);  // ใช้ await
            } catch (error) {
              console.error("Error handling reply message:", error);
              await client.replyMessage(replyToken, {
                type: "text",
                text: "เกิดข้อผิดพลาดในการประมวลผลข้อความตอบกลับ",
              });
            }
          } else {
            const urlPattern = /(https?:\/\/[^\s]+)/i;
            if (urlPattern.test(message.text)) {
              await handleUrlMessage(event, replyToken, userId, client);  // ใช้ await
            } else {
              console.log("sw.handleTextMessage message: " + message.text);
              await handleTextMessage(event, replyToken, userId, client);  // ใช้ await
            }
          }
          break;

        case "image":
          console.log("sw.EventType.Received image message.");
          await handleImageMessage(event, replyToken, client);  // ใช้ await
          break;

        case "audio":
          try {
            const resultText = await handleAudioMessage(event, replyToken, client);
            if (resultText && typeof resultText === 'object' && resultText.text) {
              message = resultText.text;  // เอาข้อความที่แปลงจากเสียงมาใช้
              console.log('swEvents.ข้อความที่แปลงจากเสียง:', message);
            } else {
                console.log('swEvents.ไม่สามารถได้รับข้อความจากบอท หรือ ข้อความไม่ใช่ string', resultText);
                message = "";  // ถ้า resultText ไม่ใช่ข้อความที่แปลงได้
            }          
            const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF" || null;
            const intentResult = "ไม่มีกระบวนการ Intent" || null; 
            const resultOther = "ไม่มีข้อมูล" || null; 
            let searchResult = resultText || "ไม่มีข้อมูลจากการค้นหา"; // กำหนดค่าเริ่มต้นหาก resultText เป็น undefined
            const contentText = { 
              resultDBF: resultDBF, 
              intentResult: intentResult,
              searchResult: searchResult,
              resultOther: resultOther
            };

            console.log("swEvents.audioHandling:", contentText?.searchResult?.text || "ไม่มีข้อความใน searchResult");
            sendFallbackMenu(replyToken, client, userId, message, contentText);
          } catch (error) {
            console.error('เกิดข้อผิดพลาดในการจัดการข้อความเสียง:', error);
          }
          break;

        case "sticker":
          await handleStickerMessage(event, replyToken, userId, client);  // ใช้ await
          break;

        case "video":
          await handleVideoMessage(event, replyToken, message, client);  // ใช้ await
          break;

        default:
          console.error("Unsupported message type:", message.type);
          await client.replyMessage(replyToken, {
            type: "text",
            text: "ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้",
          });
          break;
      }
      break;

    default:
      console.log("Unknown event type:", event.type);
      console.error("Unsupported event type:", event.type);
      await client.message(replyToken, {
        type: "text",
        text: "ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้",
      });
      break;
  }
}


export const handleUrlMessage = async (event, replyToken, userId, client) => {
  const message = event?.message?.text || null; // ข้อความใน event/url
  const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF" || null;
  const intentResult = "ไม่มีกระบวนการ Intent" || null; 
  const resultOther = "ไม่มีข้อมูล" || null; 
  let searchResult = await getGoogleSearchResults(message) || null;//getGoogleSearchResults(url)
  const contentText = { // รวมค่ากับ contentText const contentText = searchResult.text.trim;
    resultDBF: resultDBF, 
    intentResult: intentResult,
    searchResult: searchResult,
    resultOther: resultOther// ใช้ค่าที่กำหนดให้กับ resultOther
  };

  if (!replyToken || !client || !userId || !contentText) {   // ตรวจสอบค่าที่ต้องการก่อนส่ง
    console.error("Missing required parameters for sendFallbackMenu");
    return;
  }
  // ตรวจสอบว่า searchResult เป็น array หรือไม่
  if (!searchResult || !Array.isArray(searchResult)) {
    console.error("searchResult is not a valid array:", searchResult);

    // หากเป็น null หรือไม่ใช่ array ให้กำหนดค่าเป็น array ว่าง
    searchResult = [];
  }

  if (searchResult.length > 0) {
      // ประมวลผลเมื่อมีผลลัพธ์
      console.log("swEvents.message", message, "searchResult:", searchResult);
  } else {
      // กรณีไม่มีผลลัพธ์
      console.log("No results found. Returning fallback.");
  }
  console.log("swEvents.Handling URL:", "contentText:", contentText);
  sendFallbackMenu(replyToken, client, userId, message, contentText);
  //client.replyMessage(replyToken, replyMessage).catch(console.error);
}
async function handleImageMessage(event, replyToken, client, userName) {
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
  const imagePath = await downloadAndSaveImage(event, replyToken, userId, client);
  console.log("swEvents.imagePath", JSON.stringify(imagePath, null, 2));
  if (imagePath) {
    // ถ้าภาพดาวน์โหลดสำเร็จ ให้แสดงผลในแชทพร้อมข้อความ randomMessage
    const searchResult = {
      type: 'image',
      url: `https://tiger501linebot.onrender.com/images/${imagePath.split('/').pop()}`, // ใช้ URL ของภาพที่เก็บในเซิร์ฟเวอร์
      text: randomMessage, // ข้อความที่แสดง
    };
    console.log("swEvents.searchResult.url", searchResult.url);
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
      console.error("Error sending reply message:", error.message);
    }
  } else {
      // ถ้าดาวน์โหลดภาพไม่สำเร็จ
      console.error('Failed to download or save image');
      return null;
  }
}

export const handleStickerMessage = async (event, replyToken, userId, client) => {
  if (!event || !event.source) {
    console.error("Invalid event data", event);
    return;
  }

  const { message } = event; // ดึงข้อมูล message จาก event
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

import { handleSelectedMenu } from './handleselect.js';
import { handleReplyMessage } from "./handlereplys.js";
import { handleTextMessage } from "./handletextmess.js";
import { handleAudioMessage } from "./handleaudio.js";
import { handleVideoMessage } from "./handlevideos.js";
import { handleStickerMessage } from './handlesticker.js';
import { handleImageMessage } from './handleimage.js';
import { sendFallbackMenu } from './ansmenu.js'
import { downloadAndSaveImage } from './imageload.js'; 
import { getGoogleSearchResults } from "./googles.js";
import { downloadAllExpiredFiles } from "./downloadAllExpiredFiles.js";
import { chatHistory, printChatHistory, exportChatHistoryJSON, exportChatHistoryCSV } from './chatExport.js';

export async function handleEventTypes(event, replyToken, userId, client, botUserId) {
  //console.log("🧩 FULL EVENT DEBUG:", JSON.stringify(event, null, 2));
  //console.log("🧩 event.type:", event?.type);
  if (!event || !event.type) {
    console.error("swEvents: Event object is missing or invalid:", event);
    return;
  }

  const message = event?.message || null;
  const source = event?.source || null;
  let profile = { displayName: "ไม่ทราบชื่อ" };
  if (userId) {
    profile = await client.getProfile(userId).catch(() => ({ displayName: "ไม่ทราบชื่อ" }));
  }

  //console.log("🧩 message object:", JSON.stringify(message, null, 2));
  const metadata = {
    eventType: event.type || null,
    messageType: message?.type || null,
    userId : event.source.type === "user" ? event.source.userId : null,
    userName : profile.displayName || "ผู้ใช้งาน",
    sourceType: source?.type || null,
    sourceId: source?.userId || source?.groupId || source?.roomId || null,
    timestamp: event.timestamp || Date.now(),
    replyToMessageId: message?.repliedMessage?.id || null,
    mentions: message?.text?.match(/@([^\s]+)/g) || [],
    filePath: null,
    textContent: message?.text || null
  };
  // 🔹 แทรกตรงนี้: ตรวจสอบคำสั่ง "download image"
  const allowedUsers = ["Uf67316a349dcaae214c7a084a4dba25b"];

  // เมื่อรับข้อความ
  if (
    metadata.messageType === "text" &&
    metadata.textContent?.toLowerCase() === "download image" &&
    allowedUsers.includes(metadata.userId)
  ) {
    console.log("🧩sw.event.Trigger download ALL images:", metadata.userName);
    await downloadAllExpiredFiles(client);
  }

  // เมื่อรับ event ภาพ
  if (metadata.messageType === "image" && downloadFlags[metadata.userId]) {
    console.log("🧩sw.event.Download image event detected:", metadata.userName);
    await handleImageMessage(event, replyToken, metadata.userId, client, metadata.userName);
    downloadFlags[metadata.userId] = false; // รีเซ็ต flag หลังดาวน์โหลด
  }

  let locationMessage;
  switch (event.type) {
    case "postback":
      const postbackData = event.postback.data;
      console.log("🧩sw.event.type:postbackData:", postbackData);
      //await handleSelectedMenu(event, client, event.replyToken, userId, postbackData);  // ใช้ await
      break;
      
    case "follow":
      console.log("🧩sw.event.type:Follow > ", message);
      /*await client.replyMessage(replyToken, {
        type: "text",
        text: "sw.event.type:follow:ยินดีต้อนรับ! ขอบคุณที่เพิ่มฉันเป็นเพื่อน",
      }).catch(console.error); */
      break;

    case "join":
      console.log("🧩sw.event.type:join > ", message);
      const joinMessage = {
        type: "text",
        text: "sw.event.type:join:สวัสดีทุกคน! ฉันได้เข้าร่วมกลุ่มนี้แล้ว!"
      };
      //await client.replyMessage(replyToken, joinMessage).catch(console.error);
      break;

    case "leave":
      console.log("🧩sw.event.type: leave > ", message);
      console.log(`🧩sw.event:Left group: ${event.source.groupId}`);
      break;

    case "message":
      console.log("🧩sw.EventType:", event.type, "sw.Events.Message.type:", message.type);
      
      if (!message || !message.type) {
        console.error("sw.Message or message.type is missing or invalid:", message);
        /*await client.replyMessage(replyToken, {
          type: "text",
          text: `swEvents. ${message} ไม่สามารถประมวลผลข้อความของคุณได้.`
        }); */
      }
      switch (message.type.toLowerCase()) {
        case "image":
          try {
            // 🧩 1. รับภาพจากผู้ใช้ และดาวน์โหลด/บันทึกภาพในเซิร์ฟเวอร์
            const imagePath = await downloadAndSaveImage(event);
            console.log("🧩sw.message.type.imagePath", JSON.stringify(imagePath, null, 2));

            if (!imagePath) {
              console.error("🧩sw.message.type.Failed to download or save image");
              return null;
            }

            // 🧩 4. สร้าง URL สำหรับภาพที่บันทึกไว้
            const fileName = imagePath.split('/').pop();
            const baseUrl = "https://lalisalinebot.onrender.com/images";

            const searchResult = {
              type: 'image',
              originalContentUrl: `${baseUrl}/${fileName}`,
              previewImageUrl: `${baseUrl}/${fileName}`,
            };

            // 🧩 5. รวมข้อมูลทั้งหมดไว้ในอ็อบเจ็กต์ contentText
            const contentText = {
              resultDBF: "ไม่มีข้อมูลจากไฟล์ DBF",
              intentResult: "ไม่มีกระบวนการ Intent",
              searchResult: searchResult || {},
              resultOther: "ไม่มีข้อมูลเพิ่มเติม",
            };

            console.log("🧩sw.message.type.contentText", JSON.stringify(contentText, null, 2));

          } catch (error) {
            // 🧩 7. บันทึก error ถ้ามีปัญหา
            console.error("sw.message.type.Error in handleImageMessage:", {
              message: error.message,
              response: error.response?.data,
            });
          }

          await handleImageMessage(event, replyToken, userId, client);
          break;

        case "location":  // กรณีโลเคชัน
          console.log("🧩sw.message.type:Received a location message:", message);

          const googleMapsLink = `https://www.google.com/maps?q=${message.latitude},${message.longitude}`;

          const locationMessage = {
              type: "text",
              text: `คุณแชร์โลเคชัน: ${message.title}\n` +
                    `ที่อยู่: ${message.address}\n` +
                    `พิกัด: (${message.latitude}, ${message.longitude})\n\n` +
                    `ดูแผนที่: ${googleMapsLink}`
          };
          //await client.replyMessage(replyToken, locationMessage);
          break;
        case "text":
          let mentionedUsers = [];
          
          // ตรวจสอบ @mention
          if (message.text) {
            // regex สำหรับ @username
            const mentionMatches = message.text.match(/@([^\s]+)/g);
            
            if (mentionMatches) {
              for (const mention of mentionMatches) {
                const name = mention.slice(1); // ตัด @ ออก
                try {
                  // ดึง profile ของผู้ใช้จาก userId ถ้า name ตรงกับ userName
                  // NOTE: ใน LINE API, เราต้องมี userId ของคนใน group/room เพื่อ getProfile
                  // สำหรับตัวอย่าง สมมติว่ามี mapping userName -> userId
                  // ในระบบจริงควรใช้ event.source.groupId และ getGroupMemberProfile
                  const profile = await client.getProfile(userId); // userId ของผู้ส่ง
                  if (profile.displayName === name) {
                    mentionedUsers.push({
                      userId: userId,
                      displayName: profile.displayName
                    });
                  }
                } catch (err) {
                  console.error("sw.message.type:Cannot fetch profile for mention:", name, err);
                }
              }
            }
          }

          // ถ้าเป็นข้อความตอบกลับ
          if (message.repliedMessage && typeof message.repliedMessage === "object") {
            try {
              //await handleReplyMessage(event, replyToken, client, botUserId, mentionedUsers);
              console.log("🧩sw.message.repliedMessage message: " + message.text);
            } catch (error) {
              console.error("🧩sw.message.type:Error handling reply message:", error);
              /*await client.replyMessage(replyToken, {
                type: "text",
                text: "🧩sw.EventType:repliedMessage:เกิดข้อผิดพลาดในการประมวลผลข้อความตอบกลับ",
              }); */
            }
          } else {
            console.log("🧩sw.message.type.handleTextMessage message: " + message.text);
            //await handleTextMessage(event, replyToken, userId, client, mentionedUsers);
          }
          break;

        case "audio":
          try {
            const resultText = await handleAudioMessage(event, replyToken, client);
            if (resultText && typeof resultText === 'object' && resultText.text) {
              message = {
                type: "text",
                text: resultText.text || "ไม่สามารถถอดข้อความเสียงได้."};  // เอาข้อความที่แปลงจากเสียงมาใช้
                console.log('sw.message.type.ข้อความที่แปลงจากเสียง:', message.text);
            } else {
                console.log('sw.message.type.ไม่สามารถได้รับข้อความจากบอท หรือ ข้อความไม่ใช่ string', resultText);
                message = "";  // ถ้า resultText ไม่ใช่ข้อความที่แปลงได้
            }          
            const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF" || null;
            const intentResult = "ไม่มีกระบวนการ Intent" || null; 
            const resultOther = "ไม่มีข้อมูล" || null; 
            let searchResult = {
              type: "text",
              text: resultText.text || "ไม่มีข้อมูลจากการค้นหา",
            }; // กำหนดค่าเริ่มต้นหาก resultText เป็น undefined
            const contentText = { 
              resultDBF: resultDBF, 
              intentResult: intentResult,
              searchResult: searchResult,
              resultOther: resultOther
            };

            console.log("swmessage.type.audioHandling:", contentText?.searchResult?.text || "ไม่มีข้อความใน searchResult");
            sendFallbackMenu(replyToken, client, userId, message, contentText);
          } catch (error) {
            console.error('sw.message.type.เกิดข้อผิดพลาดในการจัดการข้อความเสียง:', error);
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
            text: "default.message.type:ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้",
          });
          break;
      }
      break;

    default:
      console.log("sw.message.type.Unknown event type:", event.type);
      console.error("sw.message.type.Unsupported event type:", event.type);
      if (replyToken && replyToken !== "00000000000000000000000000000000") {
        await client.replyMessage(replyToken, {
          type: "text",
          text: "default.event.type:ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้",
        });
      } else {
        await client.pushMessage(userId, {
          type: "text",
          text: "default.event.type:ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้",
        });
      }
      break;
  }
  // บันทึก metadata
  chatHistory.push(metadata);

  // **แสดง metadata ใน Console เท่านั้น**
  console.log(`swEvents.[${new Date(metadata.timestamp).toLocaleString()}] userId: ${metadata.userId}, userName: ${metadata.userName}, type: ${metadata.messageType}, content: ${metadata.textContent || metadata.filePath || "-"}`);

  // **บันทึก metadata ทุกชนิด**
  //saveEventMetadata(metadata);
}
// ฟังก์ชันตัวอย่างสำหรับบันทึก metadata
function saveEventMetadata(metadata) {
  // เก็บในฐานข้อมูล หรือ JSON file / local storage
  console.log("swEvents.Saved metadata:", metadata);
}
export const handleUrlMessage = async (event, replyToken, userId, client) => {
  const message = event?.message || null; // ดึงข้อความจาก event

  if (!message) {
    console.error("swEvents.No message found in the event");
    return;
  }

  // ตรวจสอบว่า message เป็น string หรือไม่
  if (typeof message.text !== "string") {
    console.log(`swEvents.ชนิดของ message: ${typeof message}`, message);
    return;
  }

  const messageContent = message.text.trim(); // ตัดช่องว่างหน้าและหลังข้อความ

  // Regular Expression สำหรับตรวจสอบ URL
  const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;

  let resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF";
  let intentResult = "ไม่มีกระบวนการ Intent";
  let resultOther = "ไม่มีข้อมูล";
  let searchResult = [];

  if (urlRegex.test(messageContent)) {
    console.log("swEvents.เป็นข้อความชนิด url:", messageContent);
    searchResult = await getGoogleSearchResults(url) || [];
    if (!Array.isArray(searchResult)) {
      console.error("swEvents.searchResult is not a valid array:", searchResult);
      searchResult = [];
  }

  console.log("swEvents.Search results for URL:", searchResult);
  } else {
    console.log(`swEvents.ชนิดของ message: ${typeof messageContent}`, messageContent);
    
  }

  // รวมผลลัพธ์ทั้งหมดใน contentText
  const contentText = {
    resultDBF: resultDBF,
    intentResult: intentResult,
    searchResult: searchResult,
    resultOther: resultOther,
  };

  console.log("swEvents.Final contentText to sendFallbackMenu:", contentText);
  sendFallbackMenu(replyToken, client, userId, messageContent, contentText);
};

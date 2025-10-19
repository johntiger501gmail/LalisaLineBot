import { handleSelectedMenu } from './handleselect.js';
import { handleAudioMessage } from "./handleaudio.js";
import { handleVideoMessage } from "./videos.js";
import { handleReplyMessage } from "./replys.js";
import { handleTextMessage } from "./textmessages.js";
import { handleStickerMessage } from './handlesticker.js';
import { sendFallbackMenu } from './ansmenu.js'
import { downloadAndSaveImage } from './imageload.js'; 
import { getGoogleSearchResults } from "./googles.js";
export async function handleEventTypes(event, replyToken, userId, client, botUserId) {
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
  const profile = await client.getProfile(userId);
  const userName = profile.displayName || "ผู้ใช้งาน";

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
      console.log("sw.EventType:", event.type, "sw.Events.Message.type:", message.type);
      
      if (!message || !message.type) {
        console.error("sw.Message or message.type is missing or invalid:", message);
        await client.replyMessage(replyToken, {
          type: "text",
          text: `swEvents. ${message} ไม่สามารถประมวลผลข้อความของคุณได้.`
        });
      }
      switch (message.type.toLowerCase()) {
        case "location":  // กรณีโลเคชัน
          console.log("Received a location message:", message);

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
                  console.error("Cannot fetch profile for mention:", name, err);
                }
              }
            }
          }

          // ถ้าเป็นข้อความตอบกลับ
          if (message.repliedMessage && typeof message.repliedMessage === "object") {
            try {
              await handleReplyMessage(event, replyToken, client, botUserId, mentionedUsers);
            } catch (error) {
              console.error("Error handling reply message:", error);
              await client.replyMessage(replyToken, {
                type: "text",
                text: "เกิดข้อผิดพลาดในการประมวลผลข้อความตอบกลับ",
              });
            }
          } else {
            console.log("sw.handleTextMessage message: " + message.text);
            await handleTextMessage(event, replyToken, userId, client, mentionedUsers);
          }
          break;

        case "image":
          const choiceMessages = [ 
            `ขอบคุณ สำหรับภาพที่ส่งมา! ${userName}`,
            `ขอบคุณ ภาพที่ส่งมาดูดีมากเลย! ${userName}`,
            `ขอบคุณ อย่าส่งภาพมาอีกนะ! ${userName}`,
          ];
        
          const randomMessage = choiceMessages[Math.floor(Math.random() * choiceMessages.length)]; 
          const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF"; 
          const intentResult = "ไม่มีกระบวนการ Intent";
          const resultOther = "ไม่มีข้อมูลเพิ่มเติม";
          //console.log("sw.handleImageMessage image: handleimage.js");
          try {
            const imagePath = await downloadAndSaveImage(event); // ดาวน์โหลดและบันทึกภาพ
            console.log("swEvents.imagePath", JSON.stringify(imagePath, null, 2));
          
            if (!imagePath) {
              // ถ้าดาวน์โหลดภาพไม่สำเร็จ
              console.error('Failed to download or save image');
              return null;
            }
          
            // สร้าง searchResult โดยใช้เส้นทางไฟล์
            const fileName = imagePath.split('/').pop(); // แยกชื่อไฟล์จาก path
            const baseUrl = "https://tiger501linebot.onrender.com/images"; // URL พื้นฐานของโฟลเดอร์ภาพ
          
            const searchResult = {
              type: 'image',
              originalContentUrl: `${baseUrl}/${fileName}`, // URL สำหรับภาพต้นฉบับ
              previewImageUrl: `${baseUrl}/${fileName}`,   // URL สำหรับภาพตัวอย่าง
              text: randomMessage,
            };
          
            const contentText = { // รวมข้อมูลใน contentText
              resultDBF: resultDBF || "ไม่มีข้อมูลจากฐานข้อมูล",
              intentResult: intentResult || "ไม่มีกระบวนการ Intent",
              searchResult: searchResult || {},
              resultOther: resultOther || "ไม่มีข้อมูลเพิ่มเติม",
            };
          
            // ส่งข้อความกลับไปยังผู้ใช้ในรูปแบบ Flex Message
            await sendFallbackMenu(replyToken, client, userId, searchResult, contentText);
          } catch (error) {
            console.error("Error in handleImageMessage:", {
              message: error.message,
              response: error.response?.data,
            });
          }            
          //await handleImageMessage(event, replyToken, userId, client);  // ใช้ await
          break;

        case "audio":
          try {
            const resultText = await handleAudioMessage(event, replyToken, client);
            if (resultText && typeof resultText === 'object' && resultText.text) {
              message = {
                type: "text",
                text: resultText.text || "ไม่สามารถถอดข้อความเสียงได้."};  // เอาข้อความที่แปลงจากเสียงมาใช้
              //console.log('swEvents.ข้อความที่แปลงจากเสียง:', message.text);
            } else {
                console.log('swEvents.ไม่สามารถได้รับข้อความจากบอท หรือ ข้อความไม่ใช่ string', resultText);
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
  const message = event?.message || null; // ดึงข้อความจาก event

  if (!message) {
    console.error("No message found in the event");
    return;
  }

  // ตรวจสอบว่า message เป็น string หรือไม่
  if (typeof message.text !== "string") {
    console.log(`ชนิดของ message: ${typeof message}`, message);
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
    console.log("เป็นข้อความชนิด url:", messageContent);
    searchResult = await getGoogleSearchResults(url) || [];
    if (!Array.isArray(searchResult)) {
      console.error("searchResult is not a valid array:", searchResult);
      searchResult = [];
  }

  console.log("Search results for URL:", searchResult);
  } else {
    console.log(`ชนิดของ message: ${typeof messageContent}`, messageContent);
    
  }

  // รวมผลลัพธ์ทั้งหมดใน contentText
  const contentText = {
    resultDBF: resultDBF,
    intentResult: intentResult,
    searchResult: searchResult,
    resultOther: resultOther,
  };

  console.log("Final contentText to sendFallbackMenu:", contentText);
  sendFallbackMenu(replyToken, client, userId, messageContent, contentText);
};

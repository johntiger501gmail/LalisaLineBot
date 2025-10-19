import axios from 'axios';
import { sendFallbackMenu } from './ansmenu.js'
import { getGoogleSearchResults } from "./googles.js";
import { formatSearchResult } from './googles.js';
import { formatUrlsInTextForFlex } from './handletools.js';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// ใช้ค่าจาก environment variables
const projectId = process.env.GOOGLE_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'); // แก้ไข private key ให้อยู่ในรูปแบบที่ถูกต้อง
const clientId = process.env.GOOGLE_CLIENT_ID;
const tokenUri = process.env.GOOGLE_TOKEN_URI;
export async function handleSelectedMenu(event, client, replyToken, userId, postbackData) {
    try {
      // ตรวจสอบสถานะปัจจุบัน
      global.userClickStatus[userId] = global.userClickStatus[userId] || {};
      const currentStatus = global.userClickStatus[userId] || "no_click";

      //console.log(`สถานะปัจจุบันของ ${userId}: ${currentStatus}`);
      //console.log("handleSelect:event.type:> ", event.type, userId);
      switch (event.type) {
        case "location": {
          // เมื่อผู้ใช้ส่งตำแหน่ง
          const latitude = event.message.latitude;
          const longitude = event.message.longitude;
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
      
          // สร้างลิงก์ไปยัง Google Maps ด้วยพิกัดที่ได้รับ
          const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      
          // ส่งข้อความให้ผู้ใช้
          const locationMessage = {
              type: "text",
              text: `พิกัดของคุณคือ:\nละติจูด: ${latitude}\nลองจิจูด: ${longitude}\n\n` +
                    `ดูแผนที่: ${googleMapsUrl}`
          };
      
          await client.replyMessage(replyToken, locationMessage);
          break;
        }
        case "postback": {
          let [action, searchTerm, userId, imageUrl] = event.postback.data.split('|') || [];
          const currentUserId = event.source.userId; // ID ของผู้ที่คลิกปุ่ม
          //console.log(`handleSelect.postback:searchTerm detected. Data:`, searchTerm);
          console.log(`handleSelect.Postback.searchTerm: ${searchTerm}, userId: ${userId}`);
          // ตรวจสอบว่า searchTerm มีค่า valid หรือไม่
          if (!searchTerm || typeof searchTerm !== "string" || searchTerm.trim() === "" || searchTerm === "invalid_data") {
              console.error("handleSelect.postback: No valid search term found in postback data.");
              global.userClickStatus[userId] = "no_click"; // ล้างสถานะเมื่อพบข้อผิดพลาด
              return;
          }
          // ตรวจสอบว่า currentUserId ตรงกับ userId หรือไม่
          if (currentUserId !== userId) {
            console.warn(`handleSelect.ไม่ใช่เจ้าของข้อความ , currentUserId: ${currentUserId} click. Ignoring postback action.`);
            /* ส่งข้อความแจ้งเตือนหรือหยุดกระบวนการ
            await client.replyMessage(replyToken, {
                type: "text",
                text: "ขออภัย คุณไม่สามารถดำเนินการนี้ได้."
            });
            */
            return;
          }
          //console.log(`handleSelect.postback.message:`, message);
      
          // ตรวจสอบ action
          if (action === "ข้อมูลเพิ่มเติม") {
              console.log("handleSelect.postback.ข้อมูลเพิ่มเติม:", action);
              global.userClickStatus[userId] = "clicked_info"; // อัปเดตสถานะการคลิก
      
              // สร้างลิงก์ Google Maps
              const latitude = 13.7563;  // พิกัดละติจูด
              const longitude = 100.5018; // พิกัดลองจิจูด
              const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      
              // ส่งลิงก์ Google Maps กลับไปยังผู้ใช้
              await client.replyMessage(replyToken, {
                  type: "text",
                  text: `ตำแหน่งของคุณ:\nพิกัด: (${latitude}, ${longitude})\nดูแผนที่: ${googleMapsLink}`
              });
              break;
          }
          if (action === "ค้นหาเพิ่มเติมใน Google") {
           
            global.userClickStatus[userId] = "clicked_google"; // อัปเดตสถานะการคลิก
        
            const resultDBF = "ไม่มีข้อมูลจากไฟล์ DBF";
            const intentResult = "ไม่มีกระบวนการ Intent";
            let resultOther = "ไม่มีลิงก์เพิ่มเติม";
            let searchResult = {
              type: "search", 
              text: "ไม่พบข้อมูลการค้นหา"};
            let messageResult = "ไม่พบข้อมูลการค้นหา";
        
            // ตรวจสอบว่า searchTerm เป็น URL ของภาพหรือไม่
            if (searchTerm === "image" && imageUrl) {
                // ตรวจสอบว่า imageUrl เป็น URL ของภาพที่ถูกต้อง
                if (isValidImageUrl(imageUrl)) {
                    searchTerm = imageUrl; // เปลี่ยน searchTerm เป็น imageUrl
                    console.log("handleSelect.image.searchTerm: ", searchTerm);
        
                    try {
                        messageResult = await getGoogleSearchResults(searchTerm);
                        console.log("handleSelect.messageResult:", messageResult || "ไม่มีข้อมูลจากการค้นหาภาพ");
                    } catch (error) {
                        console.error("Error during Google search:", error);
                        messageResult = "handleSelect.เกิดข้อผิดพลาดในการค้นหาภาพ";
                    }
                } else {
                    // ถ้า imageUrl ไม่ถูกต้อง ใช้ URL สำรองแทน
                    searchTerm = "https://i.imgur.com/V1TSVpc.jpg";
                    console.log("ใช้ URL สำรอง: ", searchTerm);
                    messageResult = await getGoogleSearchResults(searchTerm);
                }
            } else if (typeof searchTerm === "string" && searchTerm.trim() !== "") {
                console.log("handleSelect.string.event.type:", event.type, action, searchTerm);
                // ถ้า searchTerm เป็นข้อความ ให้ค้นหาตามข้อความ
                try {
                    messageResult = await getGoogleSearchResults(searchTerm);
                } catch (error) {
                    console.error("handleSelect.Error during Google search:", error);
                    messageResult = "handleSelect.เกิดข้อผิดพลาดในการค้นหาข้อความ";
                }
            } else {
                // กรณี searchTerm ไม่มีค่าหรือไม่ถูกต้อง
                console.warn("handleSelect.ข้อมูลไม่ถูกต้อง: ", { searchTerm, imageUrl });
                messageResult = "handleSelect.ข้อมูลไม่ถูกต้อง";
            }
            // กำหนด message จาก searchTerm
            let message = {
              type: "text",
              text: searchTerm || "ไม่มีข้อมูลที่สามารถค้นหาได้"  // กำหนดค่า default ถ้า searchTerm ไม่มีค่า
            };
            // จำกัดจำนวนตัวอักษรใน messageResult ไม่เกิน 1000 ตัวอักษร
            if (messageResult.length > 3000) {
              messageResult = messageResult.substring(0, 3000); // ตัดข้อความที่ยาวเกิน 3000 ตัวอักษร
            }
            //const topResult = messageResult[0]; // ใช้ผลการค้นหาครั้งแรก
            //let resultMessage = `${topResult.title}\n${topResult.snippet}`; // ส่วนที่เป็นผลการค้นหา        
            searchResult = {
                type: "search",
                text: messageResult
            };
            
            const contentText = { 
                resultDBF: resultDBF,
                intentResult: intentResult,
                searchResult: searchResult,
                resultOther: resultOther 
            };
            // ส่งข้อมูลกลับไปยังเมนู
            await sendFallbackMenu(replyToken, client, userId, message, contentText);
            //console.log("handleSelect.action:",action , "searchResult.text:", JSON.stringify(searchResult.text,null, 2));
          }                      
          global.userClickStatus[userId] = "no_click"; // รีเซ็ตสถานะหลังส่งข้อความ           
          
          break;
        }
        case "message": {
          // การจัดการกรณีข้อความจากผู้ใช้
          const userMessage = event.message?.text; // ตรวจสอบข้อความจากผู้ใช้
          console.log("handleSelect.User message received:", userMessage);
          if (!userMessage) {
            console.warn("No message found in event data.");
            return;
          }        
          // การจัดการข้อความอื่นๆ สามารถเพิ่มได้ในส่วนนี้
          break;
        }
  
        default: {
          global.userClickStatus[userId] = "unknown_action";
          console.warn("handleSelect.Unknown event type:", event.type);
          break;
        }
      }
    } catch (error) {
      console.error("Error in handleSelectedMenu:", error.message);
    }
  }
// ฟังก์ชันตรวจสอบ URL ก่อนว่าเป็น URL ที่ถูกต้องและสามารถเข้าถึงได้
export async function isValidImageUrl(imageUrl) {
  console.log("isValidImageUrl: " + imageUrl);

  // ตรวจสอบว่าเป็น URL ที่ถูกต้อง
  try {
      // ทำการถอดรหัส URL
      const decodedUrl = decodeURIComponent(imageUrl);
      new URL(decodedUrl); // พยายามแปลง string เป็น URL
  } catch (err) {
      console.log("isValidImageUrl.Invalid URL:", imageUrl);
      return false;  // ถ้าแปลงไม่ได้ แสดงว่าไม่ใช่ URL ที่ถูกต้อง
  }

  // ถ้า URL ถูกต้องแล้ว ให้ตรวจสอบการเข้าถึง URL
  try {
      const decodedUrl = decodeURIComponent(imageUrl);  // ถอดรหัส URL ก่อน
      const response = await axios.get(decodedUrl, { timeout: 5000 });  // 5 วินาที

      // เช็คสถานะการตอบกลับ
      if (response.status >= 200 && response.status < 300) {
          return true;  // URL ใช้งานได้
      } else if (response.status === 404) {
          console.log("Error 404: URL not found:", imageUrl);
          return false;  // ถ้าสถานะเป็น 404 ก็ให้คืนค่า false
      } else {
          return false;  // ถ้า status code ไม่ใช่ 2xx หรือ 404 ก็ถือว่า URL ใช้งานไม่ได้
      }
  } catch (error) {
      console.log("Error opening URL:", imageUrl, error);
      return false;  // ถ้าเกิดข้อผิดพลาดอื่นๆ จะคืนค่า false
  }
}  

// ฟังก์ชันวิเคราะห์ภาพด้วย Google Cloud Vision API

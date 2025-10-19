import axios from 'axios';
import { sendFallbackMenu } from './ansmenu.js'
import { handleUserMessage } from "./users.js";
import { handleGroupMessage } from "./groups.js"; 
import { processMessdataFile } from './opendbf.js'; // นำเข้า opendbf.js
import { validateUrl } from "./googles.js";
import { isValidImageUrl} from './handleselect.js';
import { getRichPreviewMetaTags } from './handletools.js';
export const handleTextMessage = async (event, replyToken, userId, client) => {
  //console.log("handleTextMessage started:", { userId, replyToken, message: event?.message?.text });
  const groupId = event?.source?.groupId || null;  // ประกาศ groupId
  if (!global.intentStatus[userId]) {
    global.intentStatus[userId] = { fulfillmentText: "noIntentResult" };
  }

  let sourceType = null; // ขยาย scope ของ sourceType
  let resultOther = "ไม่มีลิงก์เพิ่มเติม";  // กำหนดค่า default ให้กับ resultOther
  
  let searchResult = {
    type: "text",
    text: "ไม่มีข้อมูลจากการค้นหา",
  };
  //const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,}(\/[^\s]*)?$/;
  const urlPattern = /https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/;
  try {
    if (!event || typeof event !== "object") {
      console.error("Invalid event structure:", event);
      return;
    }
    //console.log("Valid event structure:", event);

    const eventType = event.type || null; // ประเภทของ event
    const source = event.source || null; // แหล่งที่มาของ event
    let message = {
      type: "text",  // กำหนดประเภทเป็นข้อความ
      text: event?.message?.text || null  // ใช้ข้อความจาก event หรือ null หากไม่มี
    };
    //console.log("Received message.text:", message.text);
    let FullintentResult = message.text || null;
    sourceType = source ? source.type : null; // กำหนดค่าของ sourceType      
    if (event?.message?.type !== 'text' || !message) { // ตรวจสอบว่า message มีประเภทเป็น text หรือไม่
      console.error("textMessage.Invalid or unsupported message type", event?.message.text);
      return;
    }
    if (!message.text || message.text.length > 1000) {
      console.error("textMessage.Message text too long:", message.text);
      return;
    }
    
    // การประมวลผลข้อมูล
    const resultDBF = await processMessdataFile(message.text) || "ไม่มีข้อมูลจากไฟล์ DBF";
    // ตรวจสอบ URL ในข้อความ
    if (urlRegex.test(message.text)) {
      //console.log("Valid URL detected:", message.text);
    
      // ทำความสะอาดและถอดรหัส URL
      const defaultUrl = "https://www.google.com";
      const cleanedUrl = validateUrl(message.text, defaultUrl, "search");
    
      try {
        // ตรวจสอบว่า URL เป็นภาพหรือไม่
        const urlMessage = isValidImageUrl(cleanedUrl);
    
        if (urlMessage) {
          //console.log("URL is a valid image:", cleanedUrl);
    
          // ตรวจสอบ Rich Preview
          if (urlPattern.test(cleanedUrl)) {
            //console.log("Valid URL pattern for rich preview:", cleanedUrl);
    
            try {
              const metaTags = await getRichPreviewMetaTags(cleanedUrl);
    
              if (metaTags && metaTags.title && metaTags.description) {
                // ตั้งค่า Rich Preview
                searchResult = {
                  type: "richPreview",
                  title: metaTags.title || "ไม่พบชื่อเรื่อง (Title)",
                  description: metaTags.description || "ไม่มีคำอธิบาย (Description)",
                  image: metaTags.image || "https://i.imgur.com/1aaL9jl.jpeg",
                  video: metaTags.video || null,
                  url: metaTags.url || cleanedUrl,
                };
    
                message = {
                  type: "text",
                  text: cleanedUrl,
                };
              } else {
                console.warn("No rich preview data found for URL:", cleanedUrl);
                searchResult = {
                  type: "text",
                  text: "ไม่พบข้อมูล Rich Preview สำหรับ URL นี้",
                };
              }
            } catch (error) {
              console.error("Error fetching rich preview:", error.message);
              searchResult = {
                type: "text",
                text: "เกิดข้อผิดพลาดในการดึงข้อมูล Rich Preview จาก URL นี้",
              };
            }
          } else {
            console.warn("URL does not match the expected pattern for rich preview:", cleanedUrl);
            searchResult = {
              type: "text",
              text: "URL นี้ไม่รองรับ Rich Preview",
            };
          }
        } else {
          console.log("URL is not an image:", cleanedUrl);
          searchResult = {
            type: "text",
            text: "ลิงก์นี้ไม่ใช่รูปภาพ",
          };
        }
      } catch (error) {
        console.error("Error while processing URL:", error.message);
        searchResult = {
          type: "text",
          text: "เกิดข้อผิดพลาดในการเปิด URL",
        };
      }
    }    
    // หากไม่พบข้อมูลจากการค้นหา
    if (searchResult.text === "ไม่มีข้อมูลจากการค้นหา") {
      searchResult = {
        type: "text",
        text: message?.text || "ไม่มีข้อความใน message",
      };
    }
    if (sourceType === "user") {
        if (!userId) {
            console.error("User ID is missing in source", event?.source);
            return;
        }
        try {
            FullintentResult = await handleUserMessage(replyToken, message.text, userId, client);
        } catch (error) {
            console.error("Error in handleUserMessage:", error);
        }
    } else if (sourceType === "group") {
        const { userId, groupId } = event?.source || {};
        if (!userId || !groupId) {
            console.error("Group or User ID is missing in source", event?.source);
            return;
        }
        try {
            FullintentResult = await handleGroupMessage(replyToken, message.text, userId, groupId, client);
        } catch (error) {
            console.error("Error in handleGroupMessage:", error);
        }
    } else {
        console.error("Unsupported source type", sourceType);
        FullintentResult = { fulfillmentText: "ประเภทแหล่งข้อมูลไม่รองรับ" };
    }

    const intentResult = FullintentResult?.fulfillmentText || message.text || "ไม่มีข้อมูล";
    //console.log("textMessage.FullintentResult: ", FullintentResult);
    //console.log("textMessage.intentResult: ", intentResult);
  
    // รวมค่ากับ contentText
    const contentText = { 
      resultDBF: resultDBF, 
      intentResult: intentResult,
      searchResult: searchResult, //searchResult || "ไม่มีข้อมูลจากการค้นหา", searchResult: prepareContentText(searchResult) || "ไม่มีข้อมูลจากการค้นหา",
      resultOther: resultOther // ใช้ค่าที่กำหนดให้กับ resultOther
    };
        
    // ตรวจสอบค่าที่ต้องการก่อนส่ง
    if (!replyToken || !client || !userId || !contentText) {
      console.error("Missing required parameters for sendFallbackMenu:", { replyToken, client, userId, contentText });
      return;
    }
    
    // ส่งข้อความ
    console.log("textMessage.FlexMenu:", userId, "message.text", message.text);
    sendFallbackMenu(replyToken, client, userId, message, contentText);

  } catch (error) {
    console.error("textMessage.Error:", error.message);
  }
}

/**
 * ดึง Meta Tags สำหรับ Rich Preview
 * @param {string} url - URL ที่ต้องการดึง Meta Tags
 * @returns {Promise<object>} - Object ที่ประกอบด้วย title, description, image และข้อมูลอื่นๆ
 */
/*
export async function getRichPreviewMetaTags(url) {
  //console.log("Processing URL:", url);
  const cleanedUrl = url.replace(/%[^\dA-Fa-f]{0,2}/g, '');
  const decodedUrl = decodeURIComponent(cleanedUrl)
  try {
      const { data: htmlContent } = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(htmlContent);

      const domain = new URL(url).hostname;

      let metaTags = {
          title: $('meta[property="og:title"]').attr('content') || $('title').text(),
          description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
          image: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content'),
          video: $('meta[property="og:video"]').attr('content') || null,
          url: $('meta[property="og:url"]').attr('content') || url,
      };

      if (!metaTags.image) {
          const fallbackImage = $('img').first().attr('src');
          metaTags.image = fallbackImage ? new URL(fallbackImage, url).href : "https://i.imgur.com/1aaL9jl.jpeg";
      }

      if (!metaTags.description) {
          const fallbackDescription = $('p').first().text();
          metaTags.description = fallbackDescription || "ไม่มีคำอธิบาย";
      }

      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
          const videoId = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/i)?.[1];
          if (videoId) {
              metaTags.image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
              metaTags.video = `https://www.youtube.com/embed/${videoId}`;
          }
      }
      if (domain.includes('tiktok.com')) {
        console.log("Processing TikTok URL:", url);
    
        // ดึงข้อมูลจาก htmlContent
        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || "ไม่สามารถดึงข้อมูลชื่อวิดีโอ";
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "ไม่สามารถดึงคำอธิบายวิดีโอ";
        const image = $('meta[property="og:image"]').attr('content') || url || "https://i.imgur.com/1aaL9jl.jpeg";  // กำหนดค่า placeholder ถ้าไม่มีภาพ
    
        // ส่งค่าผลลัพธ์เป็นอ็อบเจ็กต์
        const tiktokMetaTags = {
            title: title,
            description: description,
            image: image,
            url: url // ส่งกลับ URL ด้วย
        };
    
        console.log("Rich Preview metaTags result:", tiktokMetaTags);
    
        return tiktokMetaTags;  // คืนค่าข้อมูลที่ดึงมา
      }
      if (domain.includes('shopee')) {
          metaTags.title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || metaTags.title;
          metaTags.description = $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || metaTags.description;
          metaTags.image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('img').first().attr('src') || metaTags.image;

          if (metaTags.image && !metaTags.image.startsWith('http')) {
              metaTags.image = new URL(metaTags.image, url).href;
          }
      }

      if (!metaTags.video) {
          const fallbackVideo = $('video').first().attr('src');
          if (fallbackVideo) {
              metaTags.video = new URL(fallbackVideo, url).href;
          }
      }

      return metaTags;
  } catch (error) {
      console.error(`[Error in getRichPreviewMetaTags] URL: ${url}, Error: ${error.message}`);
      return {
          title: "ไม่สามารถดึงข้อมูลเว็บไซต์ได้",
          description: "เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บไซต์นี้",
          image: "https://i.imgur.com/1aaL9jl.jpeg",
          url: url,
      };
  }
}
*/
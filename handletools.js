import * as cheerio from 'cheerio';
import axios from 'axios';
import { type } from 'os';
import { validateUrl } from "./googles.js";
export async function getRichPreviewMetaTags(rawUrl) {
    // Validate and clean the URL
    const defaultUrl = "https://www.google.com";
    const searchResultText = "rich preview search";
    const validatedUrl = validateUrl(rawUrl, defaultUrl, searchResultText);
  
    if (validatedUrl === defaultUrl) {
        return {
            title: "URL ไม่ถูกต้อง",
            description: "ไม่สามารถตรวจสอบหรือถอดรหัส URL ได้",
            image: "https://i.imgur.com/jvxwIGq.jpeg",
            url: rawUrl || defaultUrl,
        };
    }
    try {
      const response = await axios.get(validatedUrl, { timeout: 10000 });
      if (response.status < 200 || response.status >= 300) {
          throw new Error(`Invalid HTTP response status: ${response.status}`);
      }
  
      const { data: htmlContent, status } = await axios.get(validatedUrl, { timeout: 10000 });
  
      // Check HTTP status code
      if (status < 200 || status >= 300) {
          throw new Error(`Invalid HTTP response status: ${status}`);
      }
  
      const $ = cheerio.load(htmlContent);
      const domain = new URL(validatedUrl).hostname;
      let metaTags = {
          title: $('meta[property="og:title"]').attr('content') || $('title').text(),
          description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
          image: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content'),
          video: $('meta[property="og:video"]').attr('content') || null,
          url: $('meta[property="og:url"]').attr('content') || validatedUrl,
      };
  
      // Fallbacks for image and description
      if (!metaTags.image) {
          const fallbackImage = $('img').first().attr('src');
          metaTags.image = fallbackImage ? new URL(fallbackImage, validatedUrl).href : "https://i.imgur.com/jvxwIGq.jpeg";
      }
  
      if (!metaTags.description) {
          const fallbackDescription = $('p').first().text()?.trim() || "ไม่มีคำอธิบาย";
          metaTags.description = metaTags.description || fallbackDescription;
      }
  
      // Special cases
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
          const videoId = validatedUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/i)?.[1];
          if (videoId) {
              metaTags.image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
              metaTags.video = `https://www.youtube.com/embed/${videoId}`;
          }
      }
       // Special case for TikTok
      if (domain.includes('tiktok.com')) {
        const videoTitle = $('meta[property="og:title"]').attr('content') || "ไม่สามารถดึงข้อมูลชื่อวิดีโอ";
        const videoDescription = $('meta[property="og:description"]').attr('content') || "ไม่สามารถดึงคำอธิบายวิดีโอ";
        const videoImage = $('meta[property="og:image"]').attr('content') || "https://i.imgur.com/jvxwIGq.jpeg";

        return {
            title: videoTitle,
            description: videoDescription,
            image: videoImage,
            url: validatedUrl,
        };
      }
      if (domain.includes('shopee')) {
          metaTags.title = $('meta[property="og:title"]').attr('content') || metaTags.title;
          metaTags.description = $('meta[property="og:description"]').attr('content') || metaTags.description;
          const fallbackImage = $('img').first().attr('src');
          metaTags.image = $('meta[property="og:image"]').attr('content') || fallbackImage || metaTags.image;
          if (metaTags.image && !metaTags.image.startsWith('http')) {
              metaTags.image = new URL(metaTags.image, validatedUrl).href;
          }
      }
  
      console.debug("Meta Tags Extracted:", metaTags);
      return metaTags;
    } catch (error) {
      console.error(`[Error in getRichPreviewMetaTags] URL: ${validatedUrl}, Error: ${error.message}`);
      
      // เพิ่มการดักจับข้อผิดพลาดจาก HTTP 404
      if (error.response && error.response.status === 404) {
          return {
              title: "ไม่พบหน้าเว็บไซต์",
              description: "ลิงก์ที่ระบุไม่สามารถเข้าถึงได้ (404 Not Found)",
              image: "https://i.imgur.com/jvxwIGq.jpeg",
              url: validatedUrl,
          };
      }
  
      // จัดการข้อผิดพลาดทั่วไปที่ไม่ใช่ 404
      return {
          title: "ไม่สามารถดึงข้อมูลเว็บไซต์ได้",
          description: "เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บไซต์นี้",
          image: "https://i.imgur.com/jvxwIGq.jpeg",
          url: validatedUrl,
      };
    }
  }

// ฟังก์ชันที่ใช้แปลง URL เป็นลิงก์ที่สามารถคลิกได้
export function formatUrlsInTextForFlex(text) {
    try {
        if (!text || typeof text !== "string") {
            return "ไม่มีข้อความ";
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;

        return text.replace(urlRegex, (url) => {
            try {
                const cleanUrl = url.replace(/\s/g, "%20");
                const validUrl = decodeURIComponent(cleanUrl);
                const urlObj = new URL(validUrl);

                return `<a href="${urlObj.href}" target="_blank">${urlObj.href}</a>`;
            } catch (error) {
                console.warn(`Invalid URL found: ${url}`);
                return `ลิงก์ไม่ถูกต้อง: ${url}`;
            }
        });
    } catch (error) {
        console.error("Error in formatUrlsInTextForFlex:", error);
        return "ข้อความไม่ถูกต้อง";
    }
}
// ฟังก์ชันสำหรับการวิเคราะห์ภาพ
export async function analyzeImageWithGoogleVision(base64Image) {
    console.log("Analyzing image (preview):", base64Image.substring(0, 30));
  
    try {
      const client = new ImageAnnotatorClient({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
      // Log credentials initialization
    console.log("Initializing credentials...");
    console.log("Client Email:", clientEmail);
    console.log("Private Key (first 20 characters):", privateKey.substring(0, 20));
      const request = {
        image: {
          content: base64Image,
        },
        features: [
          { type: 'LABEL_DETECTION' },
          { type: 'WEB_DETECTION' },
        ],
      };
      console.log("Client initialized successfully");
      const [result] = await client.annotateImage(request);
      console.log("Image analysis result:", result);
      return result;
    } catch (error) {
      console.error('Error analyzing image:', error.message);
      throw new Error('Image analysis failed');
    }
  }
  
export async function downloadImageAsBase64(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        return base64Image;
    } catch (error) {
        console.error('Error downloading image:', error);
        throw new Error('ดาวน์โหลดภาพไม่สำเร็จ');
    }
}
export function prepareContentText(searchResult) {
    if (!searchResult) return { images: [], youtubeSongs: [], articles: [] };

    return {
        images: Array.isArray(searchResult.images)
        ? searchResult.images.map((item, index) => ({
            title: item?.title || `รูปภาพที่ ${index + 1}`,
            link: item?.link || "ไม่มีลิงก์", // คงไว้ตามเดิม
            ogImage: item?.metatags?.find(tag => tag['og:image'])?.['og:image'] || item?.link || "ไม่มีลิงก์", // ใช้ og:image หากมี
            description: item?.description || "ไม่มีคำอธิบาย",
            snippet: item?.snippet || "ไม่พบคำบรรยายย่อ" // เพิ่มคำบรรยายย่อ
            }))
        : [],
        youtubeSongs: Array.isArray(searchResult.youtubeSongs)
        ? searchResult.youtubeSongs.map((item, index) => ({
            title: item?.title || `เพลง YouTube ที่ ${index + 1}`,
            link: item?.link || "ไม่มีลิงก์",
            description: item?.description || "ไม่มีคำอธิบาย",
            snippet: item?.snippet || "ไม่พบคำบรรยายย่อ"
            }))
        : [],
        articles: Array.isArray(searchResult.articles)
        ? searchResult.articles.map((item, index) => ({
            title: item?.title || `บทความที่ ${index + 1}`,
            link: item?.link || "ไม่มีลิงก์",
            description: item?.description || "ไม่มีคำอธิบาย",
            snippet: item?.snippet || "ไม่พบคำบรรยายย่อ"
            }))
        : []
    };
}  
// ฟังก์ชันจำลองการดึงข้อมูลพิกัดจากผู้ใช้ (ต้องการพัฒนาให้เหมาะสมกับระบบจริง)
export function getUserLocation(userId) {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    resolve({ latitude, longitude });
                },
                (error) => {
                    reject(error.message);
                }
            );
        } else {
            reject("Geolocation not supported");
        }
    });
}
  
import axios from 'axios';
import { createHeader } from './createheader.js';
import { createBody } from './createbodys.js';
import { richPreview } from './createbodys.js';
import { createBodySTK } from './createbodystk.js';
import { createBodySRCH } from './createbodysrch.js';
import { createBodyImage } from './createbodyimage.js';
import { createFooter } from './createmenu.js';
import { formatSearchResultForDisplay } from './googles.js';
//import { getInstagramImageURL } from './googles.js';
import { formatSearchResult } from './googles.js';
//import { determineContentType } from './googles.js';
const usedReplyTokens = new Set(); // เก็บ replyToken ที่ใช้งานไปแล้ว

export async function sendFallbackMenu(replyToken, client, userId, message, contentText) {
    const profile = await client.getProfile(userId);
    const userName = profile.displayName || "ผู้ใช้งาน";
    
    // ดึงค่าจาก contentText
    const resultDBF = contentText?.resultDBF || "ไม่มีข้อมูลจากไฟล์ DBF";
    const intentResult = contentText?.intentResult || "noIntentResult";
    const searchResult = contentText?.searchResult || "ไม่มีข้อมูลจากการค้นหา";
    const resultOther = searchResult?.link || "ไม่มีลิงก์เพิ่มเติม";
    const contentType = contentText?.searchResult?.type || "text";
    let formattedBody = {};
    formattedBody = formatSearchResult(contentText?.searchResult || {});
    //const resultMessage = contentText?.resultMessage || "ไม่พบข้อมูลผลการค้นหา";
    //let formattedBody = formatSearchResultForDisplay(contentText?.searchResult || {});
    //console.log("ansmenu.เริ่มการทำงานของ contentText:", contentText);
    //const searchResult = contentText?.searchResult || "ไม่มีข้อมูลจากการค้นหา";  
    //console.log("ansmenu.contentType:", contentType);  
    //console.log("ansmenu.formattedBody:", formattedBody); 
    let fallbackMenu;
    //console.log("ansmenu.contentText.searchResult.type:",contentText?.searchResult?.type);
    try {
        switch (contentText?.searchResult?.type) {
            case "richPreview":
                fallbackMenu = {
                    type: "flex",
                    altText: "ข้อมูลสำหรับข้อความของคุณ (ข้อความ)",
                    contents: {
                        type: "bubble",
                        size: "giga",
                        header: createHeader(message,userName, intentResult, resultDBF),
                        body: richPreview(searchResult, contentType, formattedBody),
                        footer: createFooter(userId, resultOther, message),
                    },
                };
                break;
            case "search":
                fallbackMenu = {
                    type: "flex",
                    altText: "ข้อมูลการค้นหาของคุณ (ค้นหา)",
                    contents: {
                        type: "bubble",
                        size: "giga",
                        header: createHeader(message, userName, intentResult, resultDBF),
                        body: createBodySRCH(searchResult),
                        footer: createFooter(userId, resultOther, message),
                    },
                };
                break;

            case "text":
                fallbackMenu = {
                    type: "flex",
                    altText: "ข้อมูลสำหรับข้อความของคุณ (ข้อความ)",
                    contents: {
                        type: "bubble",
                        size: "giga",
                        header: createHeader(message,userName, intentResult, resultDBF),
                        body: createBody(searchResult, contentType, formattedBody),
                        footer: createFooter(userId, resultOther, message),
                    },
                };
                break;
                //body: createBody(message, intentResult, resultDBF, searchResult, contentType),
            case "sticker":
                fallbackMenu = {
                    type: "flex",
                    altText: "ข้อมูลสำหรับข้อความของคุณ (สติกเกอร์)",
                    contents: {
                        type: "bubble",
                        size: "giga",
                        header: createHeader(message, userName, intentResult, resultDBF),
                        body: createBodySTK(searchResult, contentType, formattedBody),
                        footer: createFooter(userId, resultOther, message),
                    },
                };
                break;

            case "image":
                const imageUrl = message.originalContentUrl || searchResult.originalContentUrl || "https://i.imgur.com/Dho5t5B.jpg";
                fallbackMenu = {
                    type: "flex",
                    altText: "ข้อมูลของคุณ (รูปภาพ)",
                    contents: {
                        type: "bubble",
                        size: "giga",
                        header: createHeader(message, userName, intentResult, resultDBF),
                        body: createBodyImage(imageUrl, "ข้อความทดสอบ"),
                        footer: createFooter(userId, resultOther, message),
                    },
                };
                break;

            default:
                fallbackMenu = {
                    type: "flex",
                    altText: "ข้อมูลสำหรับข้อความของคุณ (อื่น ๆ)",
                    contents: {
                        type: "bubble",
                        size: "giga",
                        header: createHeader(message, userName, intentResult, resultDBF),
                        body: createBody(message, intentResult, resultDBF, searchResult, contentType),
                        footer: createFooter(userId, resultOther, message),
                    },
                };
                break;
        }
        //console.log("ansMenu.fallbackMenu.Body:", JSON.stringify(fallbackMenu.contents.body, null, 2));
        // ใช้ safeReplyMessage เพื่อส่งข้อความ
        await safeReplyMessage(replyToken, client, fallbackMenu);
    } catch (error) {
        console.error("Error in sendFallbackMenu:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
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
        console.log("ansmenu.checkUrl >> เปิดไม่ได้ url:", imageUrl);
        return false;  // ถ้าเกิดข้อผิดพลาดจะคืนค่า false
    }
}

async function safeReplyMessage(replyToken, client, message) {
    // ตรวจสอบว่า replyToken ถูกใช้งานไปแล้วหรือยัง
    if (usedReplyTokens.has(replyToken)) {
        console.error("ReplyToken has already been used:", replyToken);
        return;
    }

    try {
        // ส่งข้อความและเพิ่ม replyToken ลงใน Set
        await client.replyMessage(replyToken, message);
        usedReplyTokens.add(replyToken);
    } catch (error) {
        console.error("Failed to send reply message:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
        throw error; // โยนข้อผิดพลาดต่อไปเพื่อจัดการเพิ่มเติม
    }
}
/*
สร้าง flex message
const flexMessage = {
    type: "flex",
    altText: "ข้อมูล Flex ของคุณ",
    contents: {
        type: "bubble",
        size: "giga",
        header: createHeader(userName), // ใช้ createHeader ที่สร้างไว้
        body: createBodyImage(searchResult, contentText), // ใช้ createBodyImage สำหรับสร้าง body
        footer: createFooter(userId, resultOther, message, ownerId), // ใช้ createFooter สำหรับสร้าง footer
    }
}; 
//console.log("ansmenu.message", JSON.stringify(message, null, 2));
//console.log("ansmenu.searchResult", JSON.stringify(searchResult, null, 2));
//console.log("ansmenu.message.originalContentUrl", JSON.stringify(message.originalContentUrl, null, 2));
//console.log("ansmenu.searchResult.originalContentUrl", JSON.stringify(searchResult.originalContentUrl, null, 2));
// ตรวจสอบว่า flexMessage มีเนื้อหาที่ถูกต้อง
//console.log("ansmenu.flexMessage createBodyImage contents:", JSON.stringify(flexMessage.contents.body, null, 2));
//console.log("ansmenu.flexMessage createFooter contents:", JSON.stringify(flexMessage.contents.footer, null, 2));
//console.log("ansmenu.flexMessage.body:", JSON.stringify(flexMessage.contents.body, null, 2), imageUrl);

// ฟังก์ชันในการดึง URL ของภาพจาก Wikipedia (หรือ Wikimedia Commons)
export async function getWikipediaImageURL(link) {
    const pageTitle = link.split('/').pop();  // ดึงชื่อหน้าจาก URL เช่น "History_of_Wikipedia"
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=images&format=json`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const pages = data.query.pages;
        const page = Object.values(pages)[0];
        const images = page.images;

        if (images && images.length > 0) {
            // ดึงชื่อภาพจากการตอบกลับ
            const imageName = images[0].title.split(":")[1]; // ชื่อไฟล์ภาพ
            const imageUrl = `https://en.wikipedia.org/wiki/File:${imageName}`;
            return imageUrl;
        }
    } catch (error) {
        console.error("Error fetching Wikipedia image:", error);
    }

    return null; // ถ้าไม่พบภาพให้คืนค่า null
}

function createFooter(userId, resultOther, message) {
    // ตรวจสอบสถานะการคลิกของผู้ใช้
    if (!global.userClickStatus[userId]) {
        global.userClickStatus[userId] = "no_click"; // ถ้าไม่มีการคลิกให้ตั้งค่าเป็น "no_click"
    }

    const status = global.userClickStatus[userId]; // อ่านสถานะของผู้ใช้
    let buttonLabel = "ข้อมูลเพิ่มเติม";
    let buttonColor = "#00BFFF";
    // ตรวจสอบว่าผู้ใช้ไม่ได้คลิก (สถานะไม่ใช่ "clicked_info")
    if (status !== "clicked_info") {
        console.log(`createFooter: userId = ${userId}, userClickStatus = ${status} (ไม่ได้มาจากการคลิก)`);
    }
    // กรณีที่มีการคลิกปุ่ม "ข้อมูลเพิ่มเติม"
    if (status === "clicked_info") {
        buttonLabel = "ข้อมูลเพิ่มเติม (คลิกแล้ว)";
        buttonColor = "#90EE90"; // สีเขียวอ่อน
    }

    // ล็อกสถานะของผู้ใช้เพื่อดูที่มาของการสร้างปุ่ม
    console.log(`createFooter: userId = ${userId}, userClickStatus = ${status}`);
    console.log(`createFooter: label: "${buttonLabel}", color: "${buttonColor}"`);

    // สร้างฟุตเตอร์
    return {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
            {
                type: "button",
                action: {
                    type: "postback",
                    label: buttonLabel,
                    data: `ข้อมูลเพิ่มเติม|${resultOther}|${userId}`
                },
                color: buttonColor,
                style: "primary",
                height: "sm"
            },
            {
                type: "button",
                action: {
                    type: "postback",
                    label: "ค้นหาเพิ่มเติมใน Google",
                    data: `ค้นหาเพิ่มเติมใน Google|${message}|${userId}`
                },
                color: "#FFD700",
                style: "secondary",
                height: "sm"
            }
        ],
        paddingAll: "md",
        paddingTop: "lg",
        paddingBottom: "lg"
    };
}


// URL ของภาพที่ต้องการใช้
                const imageUrl = "https://via.placeholder.com/300x300?text=FlexImage";
                const originalImageUrl = "https://via.placeholder.com/1024x1024?text=OriginalImage";
                const previewImageUrl = "https://via.placeholder.com/240x240?text=Preview";
            
                console.log("Flex Image URL:", imageUrl);
                console.log("Original Image URL:", originalImageUrl);
                console.log("Preview Image URL:", previewImageUrl);
            
                // 1. ข้อความธรรมดา (Text Message)
                const textMessage = {
                    type: "text",
                    text: `URL ที่ใช้แสดงภาพ:...`,
                };
            
                // ส่งข้อความธรรมดาก่อน
                try {
                    console.log("Sending Text Message...");
                    const textResponse = await client.replyMessage(replyToken, textMessage);
                    console.log("Text Message sent successfully:", textResponse);
                } catch (error) {
                    console.error("Failed to send Text Message:", error.response?.data || error.message);
                }
            
                // 2. ข้อความภาพ (Image Message)
                const imageMessage = {
                    type: "image",
                    originalContentUrl: originalImageUrl,
                    previewImageUrl: previewImageUrl
                };
            
                // ส่งข้อความภาพ
                try {
                    console.log("Sending Image Message...");
                    const imageResponse = await client.replyMessage(replyToken, imageMessage);
                    console.log("Image Message sent successfully:", imageResponse);
                } catch (error) {
                    console.error("Failed to send Image Message:", error.response?.data || error.message);
                }
            
                // 3. Flex Message
                const flexMessage = {
                    type: "flex",
                    altText: "This is a flex image message",
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "image",
                                    url: imageUrl,
                                    size: "full"
                                }
                            ]
                        }
                    }
                };
            
                // ส่ง Flex Message
                try {
                    console.log("Sending Flex Message...");
                    const flexResponse = await client.replyMessage(replyToken, flexMessage);
                    console.log("Flex Message sent successfully:", flexResponse);
                } catch (error) {
                    console.error("Failed to send Flex Message:", error.response?.data || error.message);
                }
            
    */
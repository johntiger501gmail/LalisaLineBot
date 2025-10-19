เขียนโค้ดให้มีลำดับการทำงาน
1. ตรวจสอบคุณสมบ้ติ event ของข้อความ message = "ไม่ใช่ฉันใช่ไหม" //index.js
    const client = new line.Client(config);
    let { replyToken, source } = event; 
    let { userId, type: sourceType, groupId } = source;
2. จำแนกการทำงานตาม event.type //swEvents.js
  2.1 event.type = "message"
     2.1.1 message.type = "Text" //textmessages.js
        - นำข้อความค้นหาในฐานข้อมูลระบบด้วยฟังก์ชัน
          const resultDBF = await processMessdataFile(message) || "ไม่มีข้อมูลจากไฟล์ DBF"; //opendbf.js
            - message มีรูปแบบเป็นวันที่ //isDate.js
            - message มีรูปแบบไม่เป็นวันที่ //notDate.js
        - นำข้อความค้นหาด้วย google search API 
          const searchResult = await getGoogleSearchResults(message) || "ไม่มีข้อมูลจากการค้นหา";
        - ตรวจสอบ sourceType = source ? source.type : null;
          - sourceType = "user"
            const FullintentResult = await handleUserMessage(replyToken, message, userId, client);
          - sourceType = "groups"
            const FullintentResult = await handleGroupMessage(replyToken, message, userId, groupId, client);
          - sourceType = "system"
        - let resultOther = "ไม่มีลิงก์เพิ่มเติม";  // กำหนดค่า default ให้กับ resultOther
        - รวมค่าที่ได้มาไว้ใน contentText
            const contentText = { 
            resultDBF: resultDBF, 
            intentResult: intentResult,
            searchResult: searchResult,
            resultOther: resultOther // ใช้ค่าที่กำหนดให้กับ resultOther
            };
     2.1.2 message.type = "image"
     2.1.3 message.type = "photo"
     2.1.4 message.type = "sticker"
     2.1.5 message.type = "audio"
     2.1.6 message.type = "video"
     2.1.7 message.type = "contact"
     2.1.8 message.type = "url"
     2.1.9 message.type = "document"
     2.1.10 message.type = "file"
     2.1.11 message.type = "location"
     2.1.12 message.type = "poll"
  2.2 event.type = "follow"
  2.3 event.type = "postback"
  2.4 event.type = "join"
  2.5 event.type = "unfollow"
  
3. นำผลลัพธ์ที่ได้ส่งไปยัง Flex menu
    sendFallbackMenu(replyToken, client, userId, message, contentText);
4. รับ/แกะ/ถอด พารามิเตอร์ สร้าง Flex menu //ansmenu.js
const profile = await client.getProfile(userId);
const userName = profile.displayName || "ผู้ใช้งาน";
const resultDBF = contentText?.resultDBF || "ไม่มีข้อมูลจากไฟล์ DBF";
const intentResult = contentText?.intentResult || "noIntentResult";
const searchResult = formatSearchResult(contentText?.searchResult || "ไม่มีข้อมูลจากการค้นหา"); 
const resultOther = searchResult?.link || "ไม่มีลิงก์เพิ่มเติม";
- ฟังก์ชันจัดรูปแบบการแสดงผลลัพธ์ที่ได้จาก google search API > formatSearchResult(searchResult)
  - รูปแบบ image
  - รูปแบบ text
  - รูปแบบ video
  - รูปแบบ audio
  - รูปแบบ url(resultOther = searchResult?.link)
5. Flex menu > 
    - สร้าง Flex container แบบแนะนำสำหรับข้อมูล
    - altText: "ข้อมูลสำหรับข้อความของคุณ",
    - header userName
    - body 
        - message
        - resultDBF
        - intentResult
        - searchResult
    - footer
        - `ข้อมูลเพิ่มเติม|${resultOther}`
        - `ค้นหาเพิ่มเติมใน Google|${message}`

getGoogleSearchResults(message)

import axios from 'axios';

// ฟังก์ชันที่ใช้ค้นหาข้อมูลจาก Google
export async function getGoogleSearchResults(query) {
    const apiKey = 'AIzaSyAaIQ_w0DwQi8b-Q9_cAy8pI-cOPB9bMcw';
    const searchEngineId = 'd33f721963d294f01';
    
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${searchEngineId}`;
    
    try {
        const response = await axios.get(url);
        const items = response.data.items || [];
        
        // คืนผลลัพธ์ทั้งหมดตามลำดับที่ได้มา
        return items;
        
    } catch (error) {
        console.error("Error fetching Google Search results:", error.response?.data || error.message);
        return []; // คืนค่า array ว่างเมื่อเกิดข้อผิดพลาด
    }
}

// ฟังก์ชันสำหรับสร้าง Flex Message
export function createFlexMessage(results) {
    const contents = results.slice(0, 5).map((result, index) => ({
        type: "bubble",
        hero: result.pagemap?.cse_image?.[0]?.src
            ? {
                type: "image",
                url: result.pagemap.cse_image[0].src,
                size: "full",
                aspectRatio: "16:9",
                aspectMode: "cover",
            }
            : undefined,
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: result.title,
                    weight: "bold",
                    size: "md",
                    wrap: true,
                },
                {
                    type: "text",
                    text: result.snippet || "ไม่มีคำอธิบาย",
                    size: "sm",
                    wrap: true,
                    margin: "md",
                },
            ],
        },
        footer: {
            type: "box",
            layout: "horizontal",
            contents: [
                {
                    type: "button",
                    action: {
                        type: "uri",
                        label: "ข้อมูลเพิ่มเติม",
                        uri: result.link,
                    },
                    style: "primary",
                },
                {
                    type: "button",
                    action: {
                        type: "uri",
                        label: "ติดต่อเรา",
                        uri: "https://line.me/ti/p/~your_line_id", // ใส่ URL สำหรับการติดต่อ
                    },
                    style: "secondary",
                },
            ],
        },
    }));

    return {
        type: "carousel",
        contents,
    };
}

// ตัวอย่างการใช้งาน
(async () => {
    const query = "AI trends 2024";
    const results = await getGoogleSearchResults(query);
    const flexMessage = createFlexMessage(results);

    console.log(JSON.stringify(flexMessage, null, 2));
})();

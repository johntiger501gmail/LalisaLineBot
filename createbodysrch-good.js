//createBodysrch.js
export function createBodySRCH(message, intentResult, resultDBF, searchResult) {
    const intentText = intentResult || "ไม่พบข้อมูลคำถาม";
    const bodyContents = [
        {
            type: "text",
            text: `ข้อความ: ${
                typeof message === "object" && message.type === "text"
                ? message.text // กรณี type = "text"
                : typeof message === "object" && message.type
                ? message.type === "image" // ตรวจสอบกรณี type = "image"
                    ? "image" // แสดงเป็น "image" หาก type คือ "image"
                    : message.type // หากไม่ใช่ "image" ก็แสดงค่า type อื่นๆ
                : message // กรณี message ไม่ใช่ object เช่น เป็น string หรือ number
            }`,
            weight: "regular",
            size: "sm",
            color: "#4682B4",
            margin: "sm",
            wrap: true,
            align: "start"
        },
        {
            type: "text",
            text: `บอท: ${intentText}`,
            weight: "regular",
            size: "sm",
            color: "#4682B4",
            margin: "sm",
            wrap: true,
            align: "start"
        },
        {
            type: "text",
            text: `ข้อมูลระบบ: ${resultDBF}`,
            weight: "regular",
            size: "sm",
            color: "#4682B4",
            margin: "sm",
            wrap: true,
            align: "start"
        }
    ];
   
    // กรณีที่ searchResult เป็น object และมีคีย์ 'text' เป็น array
    if (searchResult && Array.isArray(searchResult.text)) {
        console.log("crtBody.Found valid searchResult.text array.");
    
        // Map ข้อมูล searchResult.text ให้เป็น searchResultContents ที่จัดรูปแบบ Flex Message
        const searchResultContents = searchResult.text.map(item => {
            // ตรวจสอบว่า item มีค่าและมี properties ที่ต้องการ
            const { title = "ไม่มีชื่อเรื่อง", link = "", snippet = "ไม่มีรายละเอียด", pagemap = {} } = item;
    
            // ตรวจสอบว่า pagemap มีข้อมูล thumbnail หรือไม่
            let thumbnail = pagemap?.thumbnail || null;
            if (thumbnail === null) {
                thumbnail = pagemap?.image || null;
                if (thumbnail === null) {
                    const metatags = pagemap?.metatags ? JSON.parse(pagemap.metatags) : null;
                    if (metatags && metatags['og:image']) {
                        thumbnail = metatags['og:image'];
                    }
                    if (thumbnail === null) {
                        thumbnail = "https://i.imgur.com/fv9DIHe.jpeg"; // ใช้ placeholder
                    }
                }
            }
    
            // ตรวจสอบ link ก่อนตัดข้อความ ถ้าหาก link เป็น string ที่ยาวเกิน
            const truncatedLink = (typeof link === "string" && link.length > 50)
                ? `${link.substring(0, 47)}...`
                : link;
    
            // ล็อกข้อมูลสำคัญ
            console.log("crtBody.Creating box for:", title);
            console.log("crtBody.thumbnail:", thumbnail);
            console.log("crtBody.URL:", truncatedLink);
            console.log("crtBody.Snippet:", snippet);
    
            // สร้างรูปแบบ Flex Message
            return {
                type: "box",
                layout: "vertical",
                margin: "sm",
                contents: [
                    {
                        type: "image",
                        url: thumbnail,
                        size: "full",
                        aspectRatio: "16:9",
                        aspectMode: "cover",
                        action: {
                            type: "uri",
                            uri: (typeof link === "string" && link.length > 0) ? link : "https://i.imgur.com/fv9DIHe.jpeg"
                        }
                    },
                    {
                        type: "text",
                        text: `📌 ${title}`,
                        weight: "bold",
                        size: "sm",
                        margin: "md",
                        wrap: true
                    },
                    {
                        type: "text",
                        text: `🔗 ${truncatedLink}`,
                        size: "xs",
                        color: "#4682B4",
                        wrap: true,
                        action: {
                            type: "uri",
                            uri: (typeof link === "string" && link.length > 0) ? link : "https://i.imgur.com/fv9DIHe.jpeg"
                        }
                    },
                    {
                        type: "text",
                        text: `📝 ${snippet}`,
                        size: "xs",
                        wrap: true
                    }
                ]
            };
        });
    
        // เพิ่มเนื้อหาใน bodyContents
        bodyContents.push(...searchResultContents);
    } else if (typeof searchResult === 'object' && searchResult.text) {
        console.log("createBody.searchResult is Object");
        // กรณี searchResult เป็น Object และมี text
        bodyContents.push({
            type: "text",
            text: `🔍 ${searchResult.text}`,
            weight: "regular",
            size: "sm",
            color: "#4682B4",
            margin: "sm",
            wrap: true,
            align: "start"
        });
    }

    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents
    };
}

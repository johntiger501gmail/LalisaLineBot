export function createBody(message, intentResult, resultDBF, searchResult, contentType, formattedBody) {
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
        // text: `ข้อความ: ${typeof message === "object" ? JSON.stringify(message, null, 2) : message}`,
        // text: `ข้อความ: ${message}`,
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

    /* ตรวจสอบว่า searchResult เป็น object และมี 'type'
    console.log("Debug: contentType", contentType);
    console.log("Debug: searchResult received:", searchResult, "type", searchResult.type);
    */
    
    if (searchResult && typeof searchResult === "object" && searchResult !== null) {
        // ตรวจสอบว่า searchResult มี 'type' และ 'type' เป็นหนึ่งในประเภทที่คาดหวัง
        //console.log("Debug: searchResult.type:", searchResult.type);
        if (searchResult.type) {
            const searchResultType = searchResult.type; // แปลงเป็นตัวพิมพ์เล็กทั้งหมด
            console.log("Debug: searchResultType", searchResultType); //searchResultType
            if (searchResultType === "sticker" || searchResultType === "text" || searchResultType === "image") {
                //console.log("Debug: searchResult.type is valid:", searchResultType);
        
                switch (searchResultType) {
                    case "sticker":
                        console.log("Adding sticker content...");
                        bodyContents.push({
                            type: "text",
                            text: `Sticker - Package ID: ${searchResult.packageId}, Sticker ID: ${searchResult.stickerId}`,
                            weight: "bold",
                            size: "sm",
                            margin: "md",
                            color: "#FF4500"
                        });
                        bodyContents.push({
                            type: "image",
                            url: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${searchResult.stickerId}/ANDROID/sticker.png`,
                            size: "full",
                            aspectRatio: "1:1",
                            aspectMode: "cover",
                            margin: "sm"
                        });
                        /*
                        bodyContents.push({
                            type: "text",
                            text: `Package ID: ${searchResult.packageId}, Sticker ID: ${searchResult.stickerId}`,
                            size: "xs",
                            color: "#4682B4",
                            margin: "xs",
                            wrap: true
                        });                        
                        */
                        break;
    
                    case "text":
                        console.log("Adding text content...");
                        const textColor = searchResult.type === "text" && searchResult.additional ? "#00008B" : "#4682B4"; // น้ำเงินเข้มสำหรับ audio
                        bodyContents.push({
                            type: "text",
                            text: searchResult.text,
                            weight: "regular",
                            size: "sm",
                            color: textColor,
                            margin: "sm",
                            wrap: true
                        });
                        break;
            
                    case "image":
                        console.log("Adding image content...");
                        if (searchResult.url && typeof searchResult.url === "string") {
                            searchResult.url = "https://dummyimage.com/300x300/ffffff/007bff.png&text=Image";
                            console.log("Debug.crtBody: Image URL:", searchResult.url);
                            // เพิ่มภาพ "https://via.placeholder.com/150/00FF00/000000?text=Success"
                            bodyContents.push({
                                type: "image",
                                url: searchResult.url,
                                size: "full",  // ขนาดเต็ม
                                aspectRatio: "1:1",  // อัตราส่วนของภาพ aspectRatio: "16:9"
                                aspectMode: "cover",  // การครอบภาพให้เต็ม
                                margin: "sm"  // การเว้นระยะขอบเล็กน้อย
                            });                    
                            // เพิ่มข้อความ randomMessage (ถ้ามี)
                            if (searchResult.text && typeof searchResult.text === "string") {
                                console.log("Debug.crtBody: Adding random message:", searchResult.text);
                                bodyContents.push({
                                    type: "text",
                                    text: searchResult.text,  // ข้อความ randomMessage
                                    weight: "regular",
                                    size: "sm",
                                    color: "#4682B4",
                                    margin: "sm",
                                    wrap: true,
                                    align: "start"
                                });
                            }
                        } else {
                            console.error("Debug.crtBody: Invalid or missing URL for the image content.");
                            // ใช้ภาพพื้นหลังสีแดงพร้อมข้อความ "Error"
                            const fallbackImageUrl = "https://via.placeholder.com/150/FF0000/FFFFFF?text=Error";

                            bodyContents.push({
                                type: "image",
                                url: fallbackImageUrl,
                                size: "full",
                                aspectRatio: "1:1", // อัตราส่วน 1:1 เหมาะกับ placeholder
                                aspectMode: "cover",
                                margin: "sm"
                            });
                        }
                        break;
                        
                    default:
                        console.log("Debug.crtBody: Unknown content type:", searchResult.type);
                        break;
                }
            } else {
                // ถ้าไม่พบ 'type' หรือ 'type' ไม่เป็น "sticker", "text", "image"
                console.log("Debug.crtBody: Invalid or missing type in searchResult:", searchResult);
            }
        } else {
            console.log("Debug.crtBody: searchResult is missing 'type'", searchResult.type);
        }
    } else {
        // หาก searchResult ไม่ใช่ object หรือไม่พบ 'type'
        console.log("Debug.crtBody: searchResult is not a valid object or missing 'type'");
    }
    

    // กรณีที่ searchResult เป็นข้อมูลอื่น ๆ
    if (Array.isArray(searchResult)) {
        const searchResultContents = searchResult.map(item => {
            const { title, link, snippet, pagemap } = item;

            let thumbnail = pagemap?.thumbnail || null;
            if (thumbnail === null) {
                thumbnail = pagemap?.image || null;
                if (thumbnail === null) {
                    const metatags = pagemap?.metatags ? JSON.parse(pagemap.metatags) : null;
                    if (metatags && metatags['og:image']) {
                        thumbnail = metatags['og:image'];
                    }
                    if (thumbnail === null) {
                        thumbnail = "https://via.placeholder.com/150"; // ใช้ placeholder
                    }
                }
            }
            const truncatedLink = link.length > 30 ? `${link.substring(0, 30)}...` : link;

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
                            uri: link
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
                            uri: link
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

        bodyContents.push(...searchResultContents);
    }

    // เพิ่มข้อมูล formattedBody (ถ้ามี)
    if (formattedBody && formattedBody.contents) {
        bodyContents.push(...formattedBody.contents);
    }

    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents
    };
}
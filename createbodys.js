// createBody.js
export function richPreview(searchResult, contentType, formattedBody) {
    // ฟังก์ชันจัดการข้อความปลอดภัย
    const safeText = (value, defaultText = "") =>
        (typeof value === "string" || typeof value === "number") ? String(value) : defaultText;

    // กำหนดค่าเริ่มต้นที่ใช้ในกรณีที่ไม่พบข้อมูลจาก Rich Preview
    const placeholderThumbnail = "https://i.imgur.com/fv9DIHe.jpeg";
    const defaultSnippet = "ไม่มีข้อมูลเพิ่มเติม";
    const defaultTitle = "ไม่มีหัวข้อ";
    const defaultLink = "https://www.google.com";

    // สร้าง bodyContents
    const bodyContents = [];

    // ล็อกข้อมูลที่ได้รับมาใน searchResult
    //console.log("Received searchResult:", searchResult);

    if (searchResult.type === "richPreview" && typeof searchResult.text !== "string") {
        //console.log("Processing Rich Preview...");

        // ถ้าเป็น Rich Preview
        const { title, description, image, url } = searchResult;

        // ล็อกข้อมูลของ Rich Preview ที่จะใช้
        console.log("Rich Preview Details:", { title, description, image, url });

        // เพิ่มข้อความ Header ที่บอกว่าเป็นผลลัพธ์ Rich Preview
        bodyContents.push({
            type: "text",
            text: `🔎 ผลลัพธ์การค้นหาจาก Rich Preview`,
            weight: "bold",
            size: "md",
            color: "#000000",
            margin: "sm",
            wrap: true,
        });

        // เพิ่มรายละเอียดของ Rich Preview
        bodyContents.push({
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: [
                {
                    type: "image",
                    url: safeText(image, placeholderThumbnail),
                    size: "full",
                    aspectRatio: "16:9",
                    aspectMode: "cover",
                    action: { type: "uri", uri: safeText(url, defaultLink) },
                },
                {
                    type: "text",
                    text: `📌 ${safeText(title, defaultTitle)}`,
                    weight: "bold",
                    size: "sm",
                    margin: "sm",
                    wrap: true,
                },
                {
                    type: "text",
                    text: `🔗 ${safeText(url, defaultLink)}`,
                    size: "xs",
                    color: "#4682B4",
                    wrap: true,
                    action: { type: "uri", uri: safeText(url, defaultLink) },
                },
                {
                    type: "text",
                    text: `📝 ${safeText(description, defaultSnippet)}`,
                    size: "xs",
                    wrap: true,
                    margin: "sm",
                }
            ]
        });
    } else {
        // ถ้าไม่ใช่ Rich Preview คือเป็นข้อความทั่วไป
        console.log("No Rich Preview, displaying general text:", searchResult.text);
        
        bodyContents.push({
            type: "text",
            text: safeText(searchResult.text, "ไม่มีข้อมูลการค้นหาที่รองรับ"),
            weight: "regular",
            size: "sm",
            color: "#FF0000",
            margin: "md",
            wrap: true,
        });
    }

    // ล็อกเนื้อหาที่ถูกสร้างขึ้น
    //console.log("Generated bodyContents:", JSON.stringify(bodyContents, null, 2));

    // ส่งออกโครงสร้าง Body สำหรับ Flex Message
    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
    };
}

export function createBody(searchResult, contentType, formattedBody) {
    // กำหนดข้อความ Intent
    // สร้างเนื้อหา Body
    const bodyContents = [
        
        {
            type: "text",
            text: `🔎 ${searchResult.text}`,
            weight: "regular",
            size: "sm",
            color: "#4682B4",
            margin: "sm",
            wrap: true,
            align: "start",
        }
    ];


    // ส่งออกโครงสร้าง Body สำหรับ Flex Message
    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
    };
}

/*
export function createBody(message, intentResult, resultDBF, searchResult, contentType, formattedBody) {
    const intentText = intentResult || "ไม่พบข้อมูลคำถาม";
    const bodyContents = [
        {
            type: "text",
            text: `ข้อความ: ${
                message && typeof message === "object" && message.type === "text"
                ? message.text
                : message && typeof message === "object" && message.type
                ? message.type === "image" ? "image" : message.type
                : message || "ไม่มีข้อความ"
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

    // ตรวจสอบ searchResult ว่าเป็น object และ text เป็น string ที่ไม่ว่างเปล่า
    if (searchResult && typeof searchResult === "object" && typeof searchResult.text === "string" && searchResult.text.trim() !== "") {
        console.log("createBody.string.contentType:", contentType);
        bodyContents.push({
            type: "text",
            text: `🔎 ${searchResult.text}`,
            size: "sm",
            wrap: true,
            margin: "md",
            color: "#4682B4"
        });
    } else {
        console.log("createBody.searchResult.text is invalid or empty.");
    }

    // เพิ่มข้อมูล formattedBody (ถ้ามีและเป็น array)
    if (formattedBody && Array.isArray(formattedBody.contents)) {
        bodyContents.push(...formattedBody.contents);
    } else if (formattedBody && !Array.isArray(formattedBody.contents)) {
        console.log("createBody.formattedBody.contents is not an array or is missing.");
    }

    // ตรวจสอบ bodyContents ก่อนคืนค่า
    if (bodyContents.length === 0) {
        console.log("createBody: bodyContents is empty.");
        bodyContents.push({
            type: "text",
            text: "ไม่มีข้อมูลสำหรับแสดง",
            size: "sm",
            color: "#FF0000",
            margin: "sm",
            wrap: true,
            align: "center"
        });
    }

    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents
    };
}
*/
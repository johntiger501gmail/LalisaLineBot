import { formatSearchResult } from './googles.js';
export function createFooter(userId, resultOther, message, ownerId, imageUrl) {
    // ตรวจสอบและตั้งค่าเริ่มต้นให้ global.userClickStatus
    global.userClickStatus = global.userClickStatus || {};
    const userStatus = global.userClickStatus[userId] || "no_click";

    // ตรวจสอบว่า userId ที่คลิกเป็นเจ้าของหรือไม่
    const isOwner = userId === ownerId;

    // ตั้งค่าปุ่มสำหรับ "ข้อมูลเพิ่มเติม"
    const buttonInfoConfig = {
        label: userStatus === "clicked_info" ? "ข้อมูลเพิ่มเติม (คลิกแล้ว)" : "ข้อมูลเพิ่มเติม",
        color: userStatus === "clicked_info" ? "#90EE90" : "#00BFFF",
        data: resultOther ? `ข้อมูลเพิ่มเติม|${resultOther}|${userId}` : "invalid_data"  // ถ้า resultOther ไม่มีข้อมูลให้ใช้ "invalid_data"
    };

    // ตรวจสอบ message เป็น object และมี key "type" ที่เป็น "image" ที่ได้จากการแปลงเสียงก่อนสร้างปุ่ม 
    let dataImage;

    if (typeof message === "object" && message !== null) {
        if (message.type === "image") {
            message.text = "image"; // เปลี่ยนข้อความเป็น "image"
        } else if (message.type === "sticker") {
            message.text = "sticker"; // เปลี่ยนข้อความเป็น "sticker"
        }
    }

    // ตรวจสอบค่า imageUrl และ message.type
    if (imageUrl && message.text === "image") {
        dataImage = imageUrl; // ใช้ imageUrl ที่ได้รับมา
    } else if (message.type === "text") {
        dataImage = message.text; // ใช้ข้อความ text จาก message
    } else {
        dataImage = "https://i.imgur.com/Dho5t5B.jpg"; // ใช้ URL สำรอง
    }

    const buttonGoogleConfig = {
        label: userStatus === "clicked_google" ? "ค้นหาเพิ่มเติมใน Google (คลิกแล้ว)" : "ค้นหาเพิ่มเติมใน Google",
        color: userStatus === "clicked_google" ? "#FFDAB9" : "#FFD700",
        data: (userStatus === "no_click" && message.type === "text")
            ? `ค้นหาเพิ่มเติมใน Google|${message.text}|${userId}|${dataImage}`
            : `ค้นหาเพิ่มเติมใน Google|${message.text}|${userId}|invalid_data`
    };

    // ล็อกสถานะและข้อมูลสำหรับตรวจสอบ
    //console.log(`createFooter: message: ${message} userId = ${userId}, userClickStatus = ${userStatus}`);
    //console.log(`createFooter: Info - label: "${buttonInfoConfig.label}", "${buttonInfoConfig.color}", data: "${buttonInfoConfig.data}"`);
    //console.log(`createFooter: Google - label: "${buttonGoogleConfig.label}", data: "${buttonGoogleConfig.data}"`);
    console.log(`createFooter.Google.data: "${buttonGoogleConfig.data}"`);
    // สร้างฟุตเตอร์
    const footer = {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
            {
                type: "button",
                action: {
                    type: "postback",
                    label: buttonInfoConfig.label,
                    data: buttonInfoConfig.data // ส่ง data เป็น string
                },
                color: buttonInfoConfig.color,
                style: "primary",
                height: "sm"
            },
            {
                type: "button",
                action: {
                    type: "postback",
                    label: buttonGoogleConfig.label,
                    data: buttonGoogleConfig.data // ส่ง data เป็น string
                },
                color: buttonGoogleConfig.color,
                style: "secondary",
                height: "sm"
            }
        ],
        paddingAll: "md",
        paddingTop: "lg",
        paddingBottom: "lg"
    };

    // รีเซ็ตสถานะหลังการสร้างฟุตเตอร์
    global.userClickStatus[userId] = "no_click";

    return footer;
}

/*
// ฟังก์ชันช่วยสำหรับสร้าง Flex Message
export function createFooter(userId, resultOther, message, ownerId, imageUrl) {
    // ตรวจสอบและตั้งค่าเริ่มต้นให้ global.userClickStatus
    global.userClickStatus = global.userClickStatus || {};
    const userStatus = global.userClickStatus[userId] || "no_click";

    // ตรวจสอบว่า userId ที่คลิกเป็นเจ้าของหรือไม่
    const isOwner = userId === ownerId;

    // ตั้งค่าปุ่มสำหรับ "ข้อมูลเพิ่มเติม"
    const buttonInfoConfig = {
        label: userStatus === "clicked_info" ? "ข้อมูลเพิ่มเติม (คลิกแล้ว)" : "ข้อมูลเพิ่มเติม",
        color: userStatus === "clicked_info" ? "#90EE90" : "#00BFFF",
        data: resultOther ? `ข้อมูลเพิ่มเติม|${resultOther}|${userId}` : "invalid_data"  // ถ้า resultOther ไม่มีข้อมูลให้ใช้ "invalid_data"
    };

    // ตรวจสอบ message เป็น object และมี key "type" ที่เป็น "image" ที่ได้จากการแปลงเสียงก่อนสร้างปุ่ม 
    let dataImage = "https://i.imgur.com/Dho5t5B.jpg"; // กำหนดค่า default
//console.log("createFooter.message.type:", message.type, "message:", JSON.stringify(message));

// ตรวจสอบประเภทของ message
if (typeof message === "object" && message !== null) {
    // กรณี message เป็น image
    if (message.type === "image") {
        message = "image";  // เปลี่ยน message เป็น "image"
        if (imageUrl && message === "image") {
            dataImage = imageUrl; // ถ้ามี imageUrl ให้ใช้
        } else {
            dataImage = "https://i.imgur.com/Dho5t5B.jpg"; // ถ้าไม่มี imageUrl ใช้ URL สำรอง
        }
    } else if (message.type === "sticker") { // กรณี message เป็น sticker
        dataImage = "sticker";  // เปลี่ยน message เป็น "sticker"
        //dataImage = "https://example.com/default-sticker.png";  // ใช้ URL ของสติ๊กเกอร์เริ่มต้น
    } else { // กรณี message เป็น search
        dataImage = message.text; // ตัดช่องว่างที่หน้าและหลัง
    } 
}
    // สร้าง buttonGoogleConfig หรือค่าอื่นๆ ที่จะส่งต่อ
    const buttonGoogleConfig = {
        label: userStatus === "clicked_google" ? "ค้นหาเพิ่มเติมใน Google (คลิกแล้ว)" : "ค้นหาเพิ่มเติมใน Google",
        color: userStatus === "clicked_google" ? "#FFDAB9" : "#FFD700",
        data: (userStatus === "no_click" && typeof message === 'object' && message.text)
            ? `ค้นหาเพิ่มเติมใน Google|${message.text}|${userId}|${dataImage}`
            : `ค้นหาเพิ่มเติมใน Google|${message.text}|${userId}|"invalid_data"`
    };
    
    // ล็อกสถานะและข้อมูลสำหรับตรวจสอบ
    //console.log(`createFooter: message: ${message} userId = ${userId}, userClickStatus = ${userStatus}`);
    //console.log(`createFooter: Info - label: "${buttonInfoConfig.label}", "${buttonInfoConfig.color}", data: "${buttonInfoConfig.data}"`);
    //console.log(`createFooter: Google - label: "${buttonGoogleConfig.label}", data: "${buttonGoogleConfig.data}"`);
    console.log(`createFooter.Google.data: ${buttonGoogleConfig.data}`);
    // สร้างฟุตเตอร์
    const footer = {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
            {
                type: "button",
                action: {
                    type: "postback",
                    label: buttonInfoConfig.label,
                    data: buttonInfoConfig.data // ส่ง data เป็น string
                },
                color: buttonInfoConfig.color,
                style: "primary",
                height: "sm"
            },
            {
                type: "button",
                action: {
                    type: "postback",
                    label: buttonGoogleConfig.label,
                    data: buttonGoogleConfig.data // ส่ง data เป็น string
                },
                color: buttonGoogleConfig.color,
                style: "secondary",
                height: "sm"
            }
        ],
        paddingAll: "md",
        paddingTop: "lg",
        paddingBottom: "lg"
    };

    // รีเซ็ตสถานะหลังการสร้างฟุตเตอร์
    global.userClickStatus[userId] = "no_click";

    return footer;
}
*/
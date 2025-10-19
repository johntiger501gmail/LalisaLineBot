// groups.js
import { checkIntents } from './server.js'; // นำเข้า checkIntents จาก server.js
import { sendFallbackMenu } from './ansmenu.js'
async function handleGroupMessage(replyToken, message, userId, groupId, client) {
    const profile = await client.getProfile(userId); // ดึงข้อมูลโปรไฟล์ของผู้ใช้
    const userName = profile.displayName;

    if (typeof message === "object" && message.text) {
        try {
            message = String(message.text).trim(); // แปลง message.text เป็น string และตัดช่องว่าง
        } catch (error) {
            console.error("Error processing message:", error);
            message = "[Error processing message]";
        }
    }

    // สร้าง key เฉพาะสำหรับ groupId และ userId
    const key = `${groupId}:${userId}`;

    // ตรวจสอบและสร้างสถานะเริ่มต้น
    if (!global.groupStatus) global.groupStatus = {};
    if (!global.intentStatus) global.intentStatus = {};
    if (!global.groupStatus[key]) global.groupStatus[key] = {};
    if (!global.intentStatus[key]) {
        global.intentStatus[key] = {
            activeIntent: null,
            isComplete: false,
            contextNames: {},
            fulfillmentText: null,
        };
    }

    let currentGroupStatus = global.groupStatus[key];
    let currentIntentStatus = global.intentStatus[key];
    let contentText;
    let resultOther;
    
    // ตรวจสอบ intent ที่กำลังดำเนินการ
    if (currentIntentStatus.activeIntent && !currentIntentStatus.isComplete) {
        console.log(`Groups: ${message} ${userName}, Intent ${currentIntentStatus.activeIntent} กำลังดำเนินการ`);
        
        try {
            currentIntentStatus = await checkIntents(replyToken, message, userName, userId, client, groupId);
            global.intentStatus[key] = currentIntentStatus;
            console.log(`Groups: Intent ดำเนินการ: ${currentIntentStatus.activeIntent}, context: ${currentIntentStatus.fulfillmentText}`);
        } catch (error) {
            console.error("Groups: Error ในการตรวจสอบ Intent:", error);
        }

        if (currentIntentStatus.isComplete) {
            console.log(`Groups: Intent ${currentIntentStatus.activeIntent} เสร็จสิ้น`);
        }
        return;
    }

    // หากไม่พบคำหลัก ให้เข้าสู่กระบวนการ intent ใหม่
    //console.log(`Groups:ไม่พบคำหลัก ${message}, เข้าสู่ Intent ใหม่`);
    const result = await checkIntents(replyToken, message, userName, userId, client, groupId);
    //console.log("Groups: checkIntents result:", JSON.stringify(result, null, 2));
    global.intentStatus[key] = result;
    console.log(`Groups: Final status for ${key}: ${JSON.stringify(global.intentStatus[key].fulfillmentText)}`); //
    return global.intentStatus[key];
    if (currentIntentStatus) {
        console.log(`Index. ${message} ${userName} Intent: ${currentIntentStatus.activeIntent} ${currentIntentStatus.contextNames}, isComplete: ${currentIntentStatus.isComplete}`);
    }
    console.log(`Groups: Final status for ${key}: ${JSON.stringify(currentIntentStatus)}`);
}

// ใช้ export แบบ ES6
export { handleGroupMessage };
function sanitizeMessage(message) {
    // ลบอักขระพิเศษ เช่น สัญลักษณ์ที่ไม่จำเป็นออกจากข้อความ
    return message.replace(/[^a-zA-Z0-9ก-ฮ\s]/g, '');
}

/*// ตั้งค่ากลับเป็นค่าเริ่มต้นในกรณีที่มีข้อผิดพลาด
        global.intentStatus[groupId] = {
            activeIntent: null,
            isComplete: false,
            contextNames: {},
            fulfillmentText: null,
        };*/
// users.js
import { checkIntents } from './server.js'; // นำเข้า checkIntents จาก server.js
import { sendFallbackMenu } from './ansmenu.js'
// ฟังก์ชันที่ใช้จัดการข้อความจากผู้ใช้
async function handleUserMessage(replyToken, message, userId, client) {
    const profile = await client.getProfile(userId);
    const groupId = profile.groupId ? profile.groupId : null;
    const userName = profile.displayName;

    // ตรวจสอบ message และแปลงเป็น string
    if (typeof message === "object" && message.text) {
        try {
            message = String(message.text).trim();
        } catch (error) {
            console.error("Error processing message:", error);
            message = "[Error processing message]";
        }
    }

    // สร้าง key เฉพาะสำหรับ userId และ groupId
    const key = groupId ? `${groupId}:${userId}` : userId;

    // ตรวจสอบและสร้างสถานะเริ่มต้นใน global
    if (!global.userStatus) global.userStatus = {};
    if (!global.intentStatus) global.intentStatus = {};
    if (!global.userStatus[key]) global.userStatus[key] = {};
    if (!global.intentStatus[key]) {
        global.intentStatus[key] = {
            activeIntent: null,
            isComplete: false,
            contextNames: {},
            fulfillmentText: null,
        };
    }

    let currentUserStatus = global.userStatus[key];
    let currentIntentStatus = global.intentStatus[key];
    let contentText;

    // ตรวจสอบ intent ที่กำลังดำเนินการ
    if (currentIntentStatus.activeIntent && !currentIntentStatus.isComplete) {
        console.log(`Users: Active intent "${currentIntentStatus.activeIntent}" is in progress.`);

        try {
            currentIntentStatus = await checkIntents(replyToken, message, userName, userId, client, groupId);
            global.intentStatus[key] = currentIntentStatus;
            console.log(`Users: Intent updated for ${key}: ${JSON.stringify(global.intentStatus[key])}`);
        } catch (error) {
            console.error("Users: Error during intent processing:", error);
        }

        // ตรวจสอบสถานะการทำงานของ intent
        if (currentIntentStatus && currentIntentStatus.isComplete) {
            console.log(`Users: Intent "${currentIntentStatus.activeIntent}" completed for ${key}.`);
        }
        return;
    }

    // ถ้าไม่พบคำหลักและไม่มี active intent ให้เริ่ม intent ใหม่
    //console.log(`Users: No active intent or keyword found. Starting new intent for ${key}.`);
    try {
        const result = await checkIntents(replyToken, message, userName, userId, client, groupId);
        //console.log("Users: checkIntents result:", JSON.stringify(result, null, 2));
        global.intentStatus[key] = result;
        console.log(`Users: Final status for ${key}: ${JSON.stringify(global.intentStatus[key].fulfillmentText)}`); //
        return global.intentStatus[key];
    } catch (error) {
        // หากมีการตอบสนองที่ status 400 จาก Dialogflow
        if (error.response && error.response.status === 400) {
            console.error('Bad Request (400) error details:', error.response.data);
        }

        console.error("Users: Error starting new intent:", error);

        // ตอบกลับข้อความหากเกิดข้อผิดพลาด
        await client.replyMessage(replyToken, {
            type: 'text',
            text: `Server.@${userName} ขอโทษค่ะ เกิดข้อผิดพลาด. กรุณาลองใหม่อีกครั้ง.`,
        });

        // โยนข้อผิดพลาดกลับไปเพื่อให้สามารถตรวจสอบได้ต่อ
        throw error;
    }
    
    // ถ้า intent เสร็จสิ้น
    if (currentIntentStatus && currentIntentStatus.isComplete) {
        console.log(`Users: Intent "${currentIntentStatus.activeIntent}" completed for ${key}.`);
        return;
    }    
}
// ใช้ export แบบ ES6
export { handleUserMessage };

// server.js
import { SessionsClient } from "@google-cloud/dialogflow";
import * as line from '@line/bot-sdk';
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { checkIntentsFromDialogflow } from './checkIntents.js';
import { sendFallbackMenu } from './ansmenu.js'
dotenv.config();

// Ensure global variables are initialized
global.intentStatus = global.intentStatus || {};
global.userStatus = global.userStatus || {};
global.userMenuStatus = global.userMenuStatus || {};
const projectId = process.env.GOOGLE_PROJECT_ID;

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_SECRET,
});

// ฟังก์ชันหลักที่เรียกใช้ Dialogflow เพื่อตรวจสอบ Intent
export async function checkIntents(replyToken, message, userName, userId, client, groupId = null) {
  const key = groupId || userId;
  if (!key) {
    throw new Error("Key (groupId or userId) is missing.");
  }

  if (!global.intentStatus[key]) {
    global.intentStatus[key] = {}; // ตั้งค่าเริ่มต้น
  }

  // กำหนดค่าเริ่มต้นสำหรับ global variables
  global.activeIntent = global.intentStatus[key].activeIntent || null;
  global.isComplete = global.intentStatus[key].isComplete || false;
  global.outputContexts = global.intentStatus[key].outputContexts || {};
  global.contextNames = global.intentStatus[key].contextNames || {};
  global.fulfillmentText = global.intentStatus[key].fulfillmentText || null;
  // ตรวจสอบ sessionPath และสร้างใหม่หากยังไม่มีหรือหมดอายุ
  if (!global.sessionPath[userId] || !global.sessionPath[userId].startsWith("projects/")) {
    const sessionId = uuidv4();  // สร้าง sessionId ใหม่
    global.sessionPath[userId] = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global/agent/sessions/${sessionId}`;
    //console.log(`Session path created for user ${userId}: ${global.sessionPath[userId]}`);
  } else {
    //console.log(`Using existing session path for user ${userId}: ${global.sessionPath[userId]}`);
  }

  // เรียกใช้ฟังก์ชัน checkIntentsFromDialogflow และเก็บผลลัพธ์ใน global.intentResult
  try {
    global.intentResult = await checkIntentsFromDialogflow(message, userId, client);

    // ตรวจสอบ intent และนำมาเก็บไว้ใน global.activeIntent
    const intent = global.intentResult?.intent?.displayName || 'No intent found';
    global.activeIntent = intent;
    global.fulfillmentText = global.intentResult?.fulfillmentText || 'No response text';

    // ตรวจสอบ outputContexts และบันทึกชื่อ context
    const outputContextsNames = global.intentResult?.outputContexts || [];
    global.outputContexts = outputContextsNames.map(context => context.name);
    global.contextNames = global.outputContexts.map(context => context.split('/').pop());

    // บันทึกสถานะ Intent และ Context
    global.intentStatus[key] = {
      activeIntent: intent,
      fulfillmentText: global.fulfillmentText,
      isComplete: global.intentResult?.diagnosticInfo?.fields?.end_conversation?.boolValue || false,
      outputContexts: global.outputContexts,
      contextNames: global.contextNames
    };
    //console.log(`Sv.intentStatus[key]: ${global.intentStatus[key]} userStatus: ${global.userStatus[key]}`);
    //console.log(`Sv.intentStatus: ${global.intentStatus} userStatus: ${global.userStatus}`);
    // สร้างข้อความตอบกลับ
    const responseText = groupId
      ? `@${userName} ${global.fulfillmentText} จาก: ${userName} ในกลุ่ม: ${groupId}`
      : `@${userName} ${global.fulfillmentText}`;
    return global.intentStatus[key]; 
  } catch (error) {
    console.error("Error while checking intents:", error.message);
    const errorMessage = error.message || "Unknown error";  // กำหนดค่า errorMessage
    try {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `@${userName}, ขอโทษค่ะ เกิดข้อผิดพลาด: ${errorMessage}. กรุณาลองใหม่อีกครั้ง.`,
      });
    } catch (replyError) {
      console.error("Error while sending reply:", replyError.message);
    }
    return { 
      error: true, 
      message: errorMessage 
    };  // คืนค่าอ็อบเจ็กต์เพื่อแจ้งว่ามีข้อผิดพลาด
  }
}

// ฟังก์ชัน clearIntentStatus
function clearIntentStatus(userId, groupId) {
  if (!global.intentStatus) {
      console.warn('Sv.clearWarning: global.intentStatus is undefined. Nothing to clear.');
      return;
  }

  if (!userId && !groupId) {
      console.warn('Sv.clearIntentStatus: Both userId and groupId are undefined. Nothing to clear.');
      return;
  }

  // ลบสถานะของ Group
  const groupKey = `group:${groupId}`;
  if (groupId && global.intentStatus[groupKey]) {
      console.log(`Sv.Clearing group status for groupId: ${groupId}`);
      delete global.intentStatus[groupKey];
  } else if (groupId) {
      //console.warn(`Sv.clearNo status found for groupId: ${groupId}`);
  }

  // ลบสถานะของ User
  const userKey = `user:${userId}`;
  if (userId && global.intentStatus[userKey]) {
      console.log(`Sv.Clearing user status for userId: ${userId}`);
      delete global.intentStatus[userKey];
  } else if (userId) {
      //console.warn(`Sv.clearNo status found for userId: ${userId}`);
  }

  console.log('Sv.clearCurrent intentStatus after clear:', global.intentStatus);
}

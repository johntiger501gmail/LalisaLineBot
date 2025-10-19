//import { Client } from "@line/bot-sdk";
import { SessionsClient } from "@google-cloud/dialogflow";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();
const projectId = process.env.GOOGLE_PROJECT_ID;
const sessionClient = new SessionsClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  projectId: projectId,
});
// ฟังก์ชันที่ใช้ส่งคำขอไปยัง Dialogflow
export async function checkIntentsFromDialogflow(message, userId, client) {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) throw new Error('Dialogflow project ID is not defined.');

  // ตรวจสอบว่า sessionPath สำหรับ userId มีอยู่แล้วหรือไม่
  if (!global.sessionPath) global.sessionPath = {}; // ตรวจสอบว่ามีการกำหนดค่าเริ่มต้นสำหรับ global.sessionPath หรือยัง

  // ตรวจสอบหรือรีเซ็ต sessionPath
  if (!global.sessionPath[userId] || typeof global.sessionPath[userId] !== 'string' || !global.sessionPath[userId].startsWith('projects/')) {
    const sessionId = uuidv4();
    global.sessionPath[userId] = `projects/${projectId}/locations/global/agent/sessions/${sessionId}`;
    console.log(`Sv.chk.New sessionPath created for user ${userId}: ${global.sessionPath[userId]}`);
  }

  // เตรียมข้อมูลคำขอสำหรับ Dialogflow
  const request = {
    session: global.sessionPath[userId],
    queryInput: {
      text: {
        text: message,
        languageCode: 'th',
      },
    },
  };

  // ส่งคำขอไปยัง Dialogflow
  try {
    const [response] = await sessionClient.detectIntent(request);

    const queryResult = response.queryResult;
    const intent = queryResult.intent?.displayName || 'No intent found';
    const isComplete = queryResult.diagnosticInfo?.fields['end_conversation']?.boolValue || false;
    const fulfillmentText = queryResult.fulfillmentText || 'No response text';
    const outputContexts = queryResult.outputContexts || [];

    // บันทึกสถานะของ intent แยกตาม userId
    global.intentStatus[userId] = {
      activeIntent: intent,
      fulfillmentText,
      outputContexts: outputContexts.map(context => context.name),
      isComplete,
      contextNames: outputContexts.map(context => context.name.split('/').pop()),
    };

    // ส่งคืนผลลัพธ์ (ไม่ตอบกลับผู้ใช้โดยตรง)
    return {
      intent,
      fulfillmentText,
      outputContexts,
      isComplete,
    };
    
  } catch (error) {
    console.error("Error during Dialogflow request:", error);
    // หากเกิดข้อผิดพลาด ลบ session เพื่อป้องกันความผิดพลาดในครั้งถัดไป
    delete global.sessionPath[userId];
    delete global.intentStatus[userId];
    throw error;
  }
}

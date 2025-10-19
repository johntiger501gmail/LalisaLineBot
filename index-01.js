import express from "express";
import dotenv from "dotenv";
import net from "net";  // เพิ่มการใช้งาน net module
import bodyParser from "body-parser";
import * as line from "@line/bot-sdk";
import { processMessdataFile } from "./opendbf.js"; // นำเข้า opendbf.js
import { handleSwitchEventTypes } from "./swEvents.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);

// Bot-specific configurations
const botName = "ซาลาเปา";
const botUserId = process.env.BOT_USER_ID;

// Initialize global variables
global.userMenuStatus = global.userMenuStatus || {};
global.intentStatus = {};
global.userStatus = {};
global.groupStatus = {};
global.sessionPath = {};
global.appData = {
  intentProperties: {
    fulfillmentText: {},
    activeIntent: {},
    intentResult: {},
    replyMessage: {},
    outputContexts: {},
    contextNames: {},
    lifespanCount: {},
    isComplete: {}
  },
  usersProfile: {
    replyToken: {},
    message: {},
    sourceType: {},
    userId: {},
    userName: {},
    groupId: {}
  }
};
const startServer = async () => {  
  console.log("index.Starting server...");

  // Webhook route (POST) สำหรับการจัดการ LINE Bot Events
  app.post("/webhook", async (req, res) => {
    console.log("index.POST /webhook: Received a request");
    const events = req.body.events;

    if (!events || !Array.isArray(events)) {
      console.error("index.POST /webhook: Invalid request body");
      return res.status(400).send("Bad Request");
    }

    try {
      events.forEach(event => {
        console.log("index.Processing event:", event);

        let { replyToken, source } = event;
        let { userId, type: sourceType, groupId } = source;
        let message;

        if (event.type === "postback") {
          let postbackData = event.postback.data;
          let [action, postbackMessage] = postbackData.split("|");

          console.log("index.Postback action:", action);
          console.log("index.Postback message:", postbackMessage);

          message = postbackMessage;
        } else if (event.type === "message") {
          message = event.message.text;
          console.log("index.Message received:", message);
        } else {
          console.log("index.Unhandled event type:", event.type);
          message = null;
        }

        if (!message && !event.type) {
          console.log("index.No message found in event:", event.type);
          return;
        }

        let mentions = null;
        if (message && typeof message.text === "string") {
          mentions = message.text.match(/@([^\s]+)/g);
          console.log("index.Mentions detected:", mentions);
        }

        if (mentions) {
          if (!mentions.includes(`@${botName}`) && !mentions.includes("@All")) {
            console.log("index.Not related to bot:", message.text);
            return null;
          }
        }

        console.log("index.Calling handleSwitchEventTypes...");
        handleSwitchEventTypes(event, replyToken, userId, client, botUserId);

        if (!global.userStatus[userId]) {
          global.userStatus[userId] = { sourceType };
          console.log("index.User status initialized for:", userId);
        }
        if (groupId && !global.userStatus[groupId]) {
          global.userStatus[groupId] = { sourceType };
          console.log("index.Group status initialized for:", groupId);
        }
      });
      console.log("index.POST /webhook: All events processed");
      res.status(200).end();
    } catch (error) {
      console.error("index.Error handling webhook:", error);
      res.status(500).send("Internal Server Error");
    }

  });

  // Webhook route (GET) สำหรับการดึงข้อมูล summary.dbf
  app.get("/webhook", async (req, res) => {
    console.log("index.GET /webhook: Received a request");
    try {
      const message = {}; 
      console.log("index.Calling processMessdataFile...");
      const record = await processMessdataFile(message); 
      if (record) {
        console.log("index.Record found:", record);
        res.send(`Latest record: RECORDID=${record.RECORDID}, SENDTIME=${record.RECDATE}`);
      } else {
        console.log("index.No record found");
        res.status(404).send("No record found.");
      }
    } catch (error) {
      console.error("index.Error processing summary.dbf:", error);
      res.status(500).send("Error processing summary.dbf: " + error.message);
    }
  });
  // ใช้พอร์ตจากสิ่งแวดล้อมหรือใช้พอร์ต 10000 ถ้าไม่ได้กำหนด
  const port = process.env.PORT || 10000;  // ใช้ค่าจาก PORT ในสิ่งแวดล้อม หรือ 10000 ถ้าไม่มีการกำหนด
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    } else {
      console.error('Error starting server:', err);
    }
  });
  
}
// Start the server function
startServer();
// ฟังก์ชันในการเช็คว่า port ว่างหรือไม่
function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();  // ป้องกันไม่ให้รันจนเกินไป
    server.on('error', () => reject());  // ถ้าเกิด error คือพอร์ตไม่ว่าง
    server.listen(port, () => resolve());  // ถ้าเปิดพอร์ตได้สำเร็จ คือพอร์ตว่าง
  });
}
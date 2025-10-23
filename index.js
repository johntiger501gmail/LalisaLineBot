import express from "express";
import path from 'path';
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fs from 'fs/promises';
import * as line from "@line/bot-sdk";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { processMessdataFile } from "./opendbf.js";
import { handleEventTypes } from "./handleEvent.js";
import { google } from "googleapis";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imagesDir = path.join(__dirname, 'images');

app.use('/images', express.static(imagesDir));
app.use(bodyParser.json());

const credentials = JSON.parse(await fs.readFile('lalisahistory-ebb204bd9a41.json', 'utf8'));
const { client_id, client_secret, redirect_uris } = credentials.installed;
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const port = 80;
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);
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
// ------------------- Google Drive -------------------
async function initDrive() {
    try {
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        
        // ทดสอบเชื่อมต่อ
        const res = await drive.files.list({ pageSize: 5 });
        console.log('Drive files:', res.data.files);

        return drive; // ส่ง drive object กลับเพื่อใช้ใน opendbf.js
    } catch (err) {
        console.error('Drive auth error:', err);
        return null;
    }
}
// สร้าง drive instance ทันที
const drive = await initDrive();

// ------------------- Webhook POST -------------------
// Webhook (POST)
// Webhook route (POST) สำหรับการจัดการ LINE Bot Events
app.post("/webhook", async (req, res) => {
    //console.log("index.POST /webhook: Received a request", req.body);
    const events = req.body.events; // ประกาศก่อนใช้งาน
    //console.log("index.POST /webhook: events array:", events);

    if (!events || !Array.isArray(events)) {
      console.error("index.POST /webhook: Invalid request body");
      return res.status(400).send("Bad Request");
    }

    try {
       for (const event of events) {
        console.log("index.POST /webhook: Processing event:", event.type);

        let { replyToken, source } = event;
        let { userId, type: sourceType, groupId } = source;
        let message;
        
        if (event.type === "postback") {
          let postbackData = event.postback.data;
          let [action, postbackMessage] = postbackData.split("|");

          //console.log("index.Postback action:", action);
          console.log("index.Postback message:", postbackMessage);

          message = postbackMessage;
        } else if (event.type === "message") {
          message = event.message.text;
          console.log("index.event.type === Message:", event.type);
        } else {
          console.log("index.event.type.Not === message :", event.type);
          message = null;
        }

        if (!message && !event.type) {
          console.log("index.No message found in event:", event.type);
          return;
        }

        let mentions = null;
        if (message && typeof message.text === "string") {
          mentions = message.text.match(/@([^\s]+)/g);
          console.log("index.Mentions detected(String):", mentions);
        }

        if (mentions) {
          if (!mentions.includes(`@${botName}`) && !mentions.includes("@All")) {
            console.log("index.mentions.Not related to bot:", message.text);
            return null;
          }
        }
        //console.log("index.Calling handleSwitchEventTypes...handleEvent.js!?!");
        await handleEventTypes(event, replyToken, userId, client, botUserId);
        console.log("index.POST/webhook:", event.type, "replyToken", replyToken);
        if (!global.userStatus[userId]) {
          global.userStatus[userId] = { sourceType };
          console.log("index.User Status initialized for userId:", userId);
        }
        if (groupId && !global.userStatus[groupId]) {
          global.userStatus[groupId] = { sourceType };
          console.log("index.Group Status initialized for groupId:", groupId);
        }
      };
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
// ------------------- Start server -------------------
app.listen(port, () => {
    console.log(`ซาลาเปา:Server is running on port ${port}`);
});
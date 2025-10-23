import express from "express";
import path from 'path';
import dotenv from "dotenv";
import bodyParser from "body-parser";
import * as line from "@line/bot-sdk";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { processMessdataFile } from "./opendbf.js"; // นำเข้า opendbf.js
import { handleEventTypes } from "./handleEvent.js";
import fs from 'fs/promises';
import { google } from "googleapis";

//import net from "net";  // เพิ่มการใช้งาน net module
dotenv.config();
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = 'lalisahistory-ebb204bd9a41.json';
const TOKEN_PATH = 'token.json';

// โหลด credentials
const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
// โหลด token จากไฟล์ (ต้องสร้างบนเครื่อง local ก่อน)
const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
oAuth2Client.setCredentials(token);

// สร้าง URL สำหรับยืนยันตัวตน
const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
console.log('Authorize this app by visiting this URL:', authUrl);

// รับ code จาก URL
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter the code from that page here: ', async (code) => {
    rl.close();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);
});
//เพิ่ม /images
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const imagesDir = path.join(__dirname, 'images');
app.use('/images', express.static(imagesDir));
//สิ้นสุด /images
const port = 80; // ใช้พอร์ต 80 สำหรับการเรียกใช้โดยไม่ต้องระบุพอร์ตใน URL

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

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`ซาลาเปา:Server is running on port ${port}`);
});

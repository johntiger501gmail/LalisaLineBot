import fs from "fs";

const json = JSON.parse(fs.readFileSync("./lalisahistory-ebb204bd9a41.json", "utf8"));
const privateKey = json.private_key;
const base64Key = Buffer.from(privateKey, "utf8").toString("base64");

console.log("✅ Copy this and put it in your .env file as GOOGLE_PRIVATE_KEY_BASE64:\n");
console.log(base64Key);

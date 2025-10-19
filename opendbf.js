// Opendbf.js
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { google } from 'googleapis';
import { DBFFile } from 'dbffile';
import fs from 'fs/promises';
import fsSync from 'fs'; // สำหรับ createWriteStream
import path from 'path';
import { isDatehandle } from './isdate.js';
import { notDatehandle } from './notdate.js';
import { isValidDate, parseDate, formatDate, formatDateTime, formatNumber} from './formatdata.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// โหลดข้อมูล credentials
const credentials = JSON.parse(await fs.readFile('client_secret.json', 'utf8'));
const { client_id, client_secret, redirect_uris } = credentials.installed;
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const FOLDER_ID = '1aW9fEwz0gZ3H0wcBVflUjPE-z69UwwN4';
const TOKEN_PATH = path.join(__dirname, 'token.json');

// ตั้งค่า OAuth2 Client
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// ตรวจสอบโทเค็น
if (fsSync.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
}
// ฟังก์ชันนี้จะรับแค่ message เท่านั้น
export async function processMessdataFile(message) {
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    // ตรวจสอบว่า message เป็นข้อความหรือไม่ (เช็ค type)
    if (typeof message !== 'string') {
        console.log('opendbf: message ไม่ใช่ข้อความ', message);
        return null; // หากไม่ใช่ข้อความให้หยุดการทำงาน
    }
    //console.log(`opendbf:processMessdataFile: กำลังตรวจสอบข้อความ "${message}"`);
    //if (!message) { throw new Error('Message is required.'); }
    try {// 1. ค้นหาไฟล์ใน Google Drive
        const result = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and name='summary.dbf'`, // ระบุชื่อไฟล์ที่ต้องการ
            fields: 'files(id, name)',
        });
        
        // 2. ตรวจสอบว่าเจอไฟล์ที่ตรงกับชื่อ "summary.dbf" หรือไม่
        const summaryFile = result.data.files.find(file => file.name === 'summary.dbf');
        if (!summaryFile) {
            console.log('opendbf: ไม่พบไฟล์ "summary.dbf" ในโฟลเดอร์เป้าหมาย');
            return null;  // ถ้าไม่พบไฟล์ ก็ไม่ต้องทำอะไร
        }
        
        // 3. ดาวน์โหลดไฟล์ที่ชื่อว่า "summary.dbf" เท่านั้น
        //console.log(`พบไฟล์ "summary.dbf" (ID: ${summaryFile.id}) กำลังดาวน์โหลด...`);
        const { data: fileStream } = await drive.files.get({
            fileId: summaryFile.id,
            alt: 'media'
        }, { responseType: 'stream' });
        
        // 4. สร้างเส้นทางสำหรับไฟล์ที่ดาวน์โหลด
        const tempFilePath = path.join(__dirname, 'temp_summary.dbf');
        const fileStreamWriter = fsSync.createWriteStream(tempFilePath);
        
        // เชื่อมโยง Stream ส่งข้อผิดพลาดกลับไปยัง Promise
        fileStream.pipe(fileStreamWriter)
            .on('error', (err) => {
                console.error('opendbf:เกิดข้อผิดพลาดระหว่างการเชื่อมโยง Stream:', err.message);
                throw err;
            });
        
        // รอให้การเขียนไฟล์เสร็จสมบูรณ์
        await new Promise((resolve, reject) => {
            fileStreamWriter.on('finish', resolve);
            fileStreamWriter.on('error', reject);
        });
        
        // ตรวจสอบไฟล์หลังการเขียน
        if (!fsSync.existsSync(tempFilePath)) {
            throw new Error('opendbf:ไฟล์ temp_summary.dbf ไม่ได้ถูกสร้าง');
        }
        const stats = fsSync.statSync(tempFilePath);
        if (stats.size === 0) {
            //console.log('opendbf:ไฟล์ "summary.dbf" เป็นไฟล์ว่างเปล่า การทำงานจะสิ้นสุดลง');
            return null;
        }
        //console.log('opendbf:ไฟล์ "summary.dbf" ถูกดาวน์โหลดและไม่ว่างเปล่า');
        //console.log("opendbf:ไฟล์ที่ดาวน์โหลดมีข้อมูล:", fileStream);
        // อ่านไฟล์ DBF และทำการแก้ไขชื่อฟิลด์ 
        const dbf = await DBFFile.open(tempFilePath);
        const records = await dbf.readRecords();
        if (records.length === 0) {
            console.error('opendbf: ไม่มีเรคอร์ดในไฟล์ DBF');
            return null;
        }
        //console.log('opendbf:message', message);//แสดงกันให้ประจักษ์
        if (!isValidDate(message)) {
            // ถ้าไม่สามารถแปลง message เป็นวันที่ได้
            //console.log('opendbf:notDatehandle ไม่ใช่วันที่, เรียกใช้ notDatehandle');
            const result = notDatehandle(message, records);
            console.log('opendbf:notDatehandle', result);
            return result;
        } else {
            // ถ้า message เป็นวันที่ที่ถูกต้อง
            //console.log('opendbf:isDatehandle เป็นวันที่, เรียกใช้ isDatehandle');
            const result = isDatehandle(message, records);
            console.log('opendbf:isDatehandle', result);
            return result;
        }
        
    // ตรวจสอบว่าเจอเรคคอร์ดที่มีค่า Max.RECDATE หรือไม่
    } catch (error) {console.error('opendbf:Error processing DBF file:', error.message);
        return null;}
}
/*

else if (results === null || Object.keys(results).length === 0) {
                    // เมื่อไม่พบคำหลักให้บอทไม่ตอบอะไรเลย
                    return null; // คืนค่า null เมื่อไม่มีข้อมูลหรือไม่พบคำ
                } else {
                    // กรณีอื่นๆ เช่น ค่าไม่ตรงกับประเภทที่คาดหวัง
                    return formattedValue; // คืนค่าอื่นๆ หากไม่ได้อยู่ในกรณีที่กล่าวถึง
                }    


 ชชชชชช
if (typeof results === 'object' && results !== null) {
                if (Object.keys(results).length === 1) { // ตรวจสอบว่ามีฟิลด์เพียงฟิลด์เดียว
                    let singleFieldKey = Object.keys(results)[0]; // ชื่อฟิลด์เดียว
                    let singleFieldValue = results[singleFieldKey]; // ค่าในฟิลด์เดียว
            
                    // กำหนดข้อความรูปแบบใหม่
                    return `${JSON.stringify(singleFieldValue)}`;
                } else {
                    // เปลี่ยนชื่อฟิลด์ทั้งหมดใน results เป็นตัวพิมพ์เล็ก
                    let lowerCaseResults = {};
                    for (let key in results) {
                        if (Object.hasOwnProperty.call(results, key)) {
                            lowerCaseResults[key.toLowerCase()] = results[key];
                        }
                    }
                    // คืนค่าผลลัพธ์ในรูป JSON พร้อมจัดรูปแบบ
                    return JSON.stringify(lowerCaseResults, null, 4);
                }
            } else if (results === null || Object.keys(results).length === 0) {
                // เมื่อไม่พบคำหลักให้บอทไม่ตอบอะไรเลย
                return null; // คืนค่า null เมื่อไม่มีข้อมูลหรือไม่พบคำ
            } else {
                return formattedValue; // คืนค่าอื่นๆ หากไม่ได้อยู่ในกรณีที่กล่าวถึง
            }        



//console.log("opendbf: matchedFields:", matchedFields); // แสดงฟิลด์ที่จับคู่ได้
let foundKeyword = ''; // ผลลัพธ์ที่จะส่งกลับ
// การรวบรวมข้อมูลจากฟิลด์ที่ตรงกับ keyword
if (matchedFields.length > 0) {
    const results = matchedFields.reduce((acc, field) => {
        const result = maxRecdateRecord[field];
        let formattedValue;

        // ตรวจสอบว่า result เป็น Date หรือไม่
        if (result instanceof Date) {formattedValue = formatDate(result);}  // แปลง Date เป็นรูปแบบวันที่ที่ต้องการ
        else if (typeof result === 'number') {formattedValue = formatNumber(result);} // ตรวจสอบว่า result เป็น number หรือไม่ แปลงตัวเลขเป็นรูปแบบที่ต้องการ
        else if (typeof result === 'string') {formattedValue = result;} // ตรวจสอบว่า result เป็น string หรือไม่ คืนค่า string ตรงๆ
        else if (typeof result === 'object' && result !== null) {formattedValue = JSON.stringify(result);} // ถ้า result เป็น object อื่นๆ เช่น JSON หรือ Object แปลง Object เป็น JSON string
        else {formattedValue = String(result);} //จัดการกรณีอื่นๆ
        //acc[field] = formattedValue; // สะสมค่าผลลัพธ์ใน acc โดยให้ใช้ชื่อฟิลด์เป็น key และค่าเป็น formattedValue
        //return acc; // กลับค่าที่สะสมไปในแต่ละขั้นตอน
        return acc;
    }, {}); // เริ่มต้น acc เป็นอ็อบเจ็กต์ว่าง
    return results; // ส่งผลลัพธ์ที่สะสมทั้งหมด
}            
    else {
    console.log('opendbf: ไม่พบข้อความ:', message);
    return null;
}
             */
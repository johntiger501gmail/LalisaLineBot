import fetch from 'node-fetch';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

// ตั้งค่าข้อมูล
const modelPath = 'openai/whisper-large-v3-turbo';  // โมเดลที่ใช้งาน
const tempAudioPath = 'E:/github/gitreprender/temp_audio.wav'; // เส้นทางไฟล์ .wav ชั่วคราว
const tempM4aPath = 'E:/github/gitreprender/temp_audio.m4a';
const apiKey = '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';  // API Key ของ Hugging Face

// ตรวจสอบหรือสร้างโฟลเดอร์ที่ใช้จัดเก็บไฟล์ชั่วคราว
const directoryPath = path.dirname(tempAudioPath);
if (!fs.existsSync(directoryPath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

// ฟังก์ชัน handleAudioMessage
export async function handleAudioMessage(event, replyToken, client) {
  try {
    const messageId = event.message.id;
    const message = await client.getMessageContent(messageId);
    if (!message) throw new Error('ไม่พบข้อมูลเสียงจาก LINE API');

    // บันทึกไฟล์ .m4a
    const fileStream = fs.createWriteStream(tempM4aPath);
    message.pipe(fileStream);

    fileStream.on('error', (err) => {
      console.error('handleAudio.เกิดข้อผิดพลาดขณะสร้างไฟล์:', err);
    });

    return new Promise((resolve, reject) => {
      fileStream.on('finish', async () => {
        //console.log('handleAudio.ไฟล์ .m4a ถูกสร้างแล้ว');

        try {
          // แปลง .m4a เป็น .wav
          await convertToWav(tempM4aPath, tempAudioPath);        

          // แปลงเสียงเป็นข้อความและคืนค่าผลลัพธ์
          const resultText = await convertSpeechToText(replyToken, client);
          if (resultText) {
            //console.log('handleAudio.แปลงไฟล์ เสียง เสร็จสิ้น', resultText);
      
            // ส่ง object พร้อมข้อมูลที่เกี่ยวข้อง
            resolve({
              text: resultText,
              type: "text", // สมมติว่าเป็นข้อความที่ได้จากการแปลงเสียง
              additional: "ข้อมูลเพิ่มเติม (เช่นเวลาแปลงไฟล์)",
            });
          } else {
            console.error('ไม่สามารถแปลงเสียงเป็นข้อความได้');
            resolve({
              text: 'ไม่สามารถแปลงเสียงได้',
              type: "error",
              additional: "ไม่มีข้อมูลเพิ่มเติม",
            });
          }
        } catch (error) {
          console.error('handleAudio.เกิดข้อผิดพลาดในการแปลงเสียง:', error);
          reject('เกิดข้อผิดพลาดในการแปลงเสียง');
        } finally {
          // ลบไฟล์ชั่วคราว
          fs.unlinkSync(tempM4aPath);
        }
      });
    });
  } catch (error) {
    console.error('handleAudio.เกิดข้อผิดพลาดในการจัดการข้อความเสียง:', error);
    throw error;  // แจ้งข้อผิดพลาดให้รู้
  }
}

// แปลงไฟล์ .m4a เป็น .wav
function convertToWav(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    // ตรวจสอบว่าไฟล์อินพุตมีอยู่หรือไม่
    if (!fs.existsSync(inputFile)) {
      reject(new Error(`ไฟล์อินพุตไม่มีอยู่: ${inputFile}`));
      return;
    }

    // ใช้ path.resolve และแปลง \ เป็น / เพื่อให้สามารถใช้กับระบบ Unix และ Windows
    const resolvedInputFile = path.resolve(inputFile).replace(/\\/g, '/');
    const resolvedOutputFile = path.resolve(outputFile).replace(/\\/g, '/');

    // ใช้ ffmpeg พร้อมระบุ file:
    ffmpeg(resolvedInputFile)
    .output(resolvedOutputFile)
    .on('start', (commandLine) => {
      //console.log('handleAudio.ffmpeg command line:'); // , commandLine แสดงคำสั่ง ffmpeg ที่ถูกเรียกใช้งาน
    })
    .on('end', () => {
      console.log('handleAudio.การแปลงไฟล์เสร็จสิ้น:', resolvedOutputFile);//
      resolve(outputFile);
    })
    .on('error', (err) => {
      console.error('handleAudio.เกิดข้อผิดพลาดในการแปลงไฟล์:', err.message);
      reject(err);
    })
    .run();
  });
}

// ฟังก์ชันแปลงเสียงเป็นข้อความ
async function convertSpeechToText(replyToken, client) {
  try {
    if (!fs.existsSync(tempAudioPath)) {
      throw new Error('handleAudio.ไฟล์เสียงชั่วคราวไม่มีอยู่');
    }

    const audioBuffer = fs.readFileSync(tempAudioPath);

    const response = await fetch(`https://api-inference.huggingface.co/models/${modelPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: audioBuffer.toString('base64'),
      }),
    });

    const result = await response.json();
    return result.text; // คืนข้อความที่แปลงมา
  } catch (error) {
    console.error('handleAudio.เกิดข้อผิดพลาด:', error);
  }
}

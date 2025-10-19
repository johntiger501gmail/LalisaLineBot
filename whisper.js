import fetch from 'node-fetch';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

// ตั้งค่าข้อมูล
const modelPath = 'openai/whisper-large-v3-turbo';  // โมเดลที่ใช้งาน
const inputAudioPath = 'E:/github/dialogflow/_7135261.m4a'; // เส้นทางไฟล์ .m4a
const tempAudioPath = 'E:/github/dialogflow/_7135261.wav'; // เส้นทางไฟล์ .wav ชั่วคราว
const apiKey = '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';  // API Key ของ Hugging Face

// แปลงไฟล์ .m4a เป็น .wav
function convertToWav(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .output(outputFile)
      .on('end', () => resolve(outputFile))
      .on('error', (err) => reject(err))
      .run();
  });
}

// ฟังก์ชันแปลงเสียงเป็นข้อความด้วย Whisper จาก Hugging Face
async function convertSpeechToText() {
  try {
    // แปลงไฟล์ .m4a เป็น .wav
    await convertToWav(inputAudioPath, tempAudioPath);
    console.log('ไฟล์เสียงแปลงเป็น .wav เรียบร้อยแล้ว');

    // อ่านไฟล์ .wav
    const audioBuffer = fs.readFileSync(tempAudioPath);

    // ส่งคำขอไปยัง Hugging Face API เพื่อแปลงเสียงเป็นข้อความ
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: audioBuffer.toString('base64'),
      })
    });

    const result = await response.json();
    if (response.ok) {
      console.log('ข้อความจากเสียง:', result.text);
    } else {
      console.error('เกิดข้อผิดพลาดในการแปลงเสียง:', result);
    }

    // ลบไฟล์ .wav ชั่วคราว
    fs.unlinkSync(tempAudioPath);
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
}

convertSpeechToText();

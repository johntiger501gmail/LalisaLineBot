// notDatehandle.js
// ฟังก์ชันหลักสำหรับหาค่า RECDATE สูงสุดและจัดการผลลัพธ์
import { isValidDate, parseDate, formatDate, formatDateTime, formatNumber} from './formatdata.js';
export function notDatehandle(message, records) {
    try {
        // ตรวจสอบ records และ message
        if (!Array.isArray(records) || records.length === 0) {
            console.warn("notDate: Records ต้องเป็นอาร์เรย์และต้องไม่ว่าง");
            return null;
        }
        if (!message) {
            console.warn("notDate: ไม่มีข้อความค้นหา (message)");
            return null;
        }
        // หาค่า RECDATE ที่มากที่สุด
        const maxRecdateRecord = records.reduce((maxRecord, currentRecord) => {
            const currentRecdate = new Date(currentRecord.RECDATE || currentRecord.recdate);
            const maxRecdate = maxRecord ? new Date(maxRecord.RECDATE || maxRecord.recdate) : null;

            return (!maxRecdate || currentRecdate > maxRecdate) ? currentRecord : maxRecord;
        }, null);

        if (!maxRecdateRecord || !maxRecdateRecord.RECDATE) {
            console.warn("notDate: ไม่พบเรคคอร์ดที่มีค่า RECDATE");
            return null;
        }
        // ค้นหา keyword ในฟิลด์
        const fieldNames = Object.keys(maxRecdateRecord);
        const normalizedMessage = message.trim().toUpperCase();
        const matchedFields = fieldNames.filter(field =>
            field.trim().toUpperCase().includes(normalizedMessage)
        );
        if (matchedFields.length === 0) {
            console.warn("notDate: ไม่พบฟิลด์ที่ตรงกับข้อความค้นหา");
            return null;
        }
        const results = matchedFields.reduce((acc, field) => {
            const value = maxRecdateRecord[field];
            let formattedValue;
            // แปลงค่าตามประเภทข้อมูล
            if (value instanceof Date) {
                formattedValue = formatDate(value);
            } else if (typeof value === 'number') {
                formattedValue = formatNumber(value);
            } else if (typeof value === 'string') {
                formattedValue = value;
            } else {
                formattedValue = String(value);
            }
            acc[field] = formattedValue;
            return acc;
        }, {});
        
        if (Object.keys(results).length === 1) {
            const singleFieldKey = Object.keys(results)[0];
            return `${results[singleFieldKey]}`; // แสดงค่าของฟิลด์เดียวโดยตรงและเพิ่ม \n
        } else {
            const resultString = Object.entries(results)
                .map(([key, value]) => `${key.toLowerCase()}: ${value}`) // แปลงคู่ key-value เป็นข้อความ
                .join('\n'); // คั่นแต่ละฟิลด์ด้วย \n
            return resultString; // ส่งคืนข้อความทั้งหมดที่มี \n คั่นระหว่างฟิลด์
        }        
    } catch (error) {
        console.error("notDate: เกิดข้อผิดพลาดในฟังก์ชัน notDatehandle", error);
        return null;
    }
}

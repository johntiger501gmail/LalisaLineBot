// isDatehandle.js
// ฟังก์ชันหลักสำหรับตรวจสอบเรคคอร์ดที่ตรงกับวันที่
import { isValidDate, parseDate, formatDate, formatDateTime, formatNumber} from './formatdata.js';
export function isDatehandle(message, records) {
    try {
        // ตรวจสอบให้แน่ใจว่า message เป็นวันที่ที่ถูกต้อง
        const dateMessage = parseDate(message);
        if (isNaN(dateMessage)) {
            console.error(`isDate: ข้อความ "${message}" ไม่สามารถแปลงเป็นวันที่ได้`);
            return `isDate:ไม่สามารถแปลง "${message}" เป็นวันที่ได้`;
        }

        // กรองเรคคอร์ดทั้งหมดในไฟล์เป้าหมายที่ตรงกับวันที่ message
        const filteredRecords = records.filter(record => {
            const recdateStr = record.RECDATE || record.recdate;
            //console.log(`opendbf: กำลังเปรียบเทียบ: Message (${message}) กับ Record (${recdateStr})`);

            const recdate = parseDate(recdateStr);
            if (isNaN(recdate)) {
                console.warn(`isDate: ไม่สามารถแปลง RECDATE (${recdateStr}) เป็นวันที่ได้`);
                return false;
            }

            const formattedRecDate = formatDate(recdate);
            const formattedDateMessage = formatDate(dateMessage);

            //console.log(`isDate:Message (${formattedDateMessage}) VS Record (${formattedRecDate})`);
            if (typeof formattedRecDate === 'object') {
                // แปลง object (Date) ให้เป็น JSON string (ถ้ามี) และเอาเครื่องหมายคำพูดออก
                let jsonString = JSON.stringify(formattedRecDate, null, 4).toLowerCase(); 
                return jsonString;
            } else {
                // เปรียบเทียบวันที่ในรูปแบบ string
                return formattedRecDate.toLowerCase() === formattedDateMessage.toLowerCase();
            }
            
        });

        //console.log('isDate:filteredRecords:', JSON.stringify(filteredRecords, null, 4));

        // ส่วนที่คุณถามถึงในโค้ด:
        if (filteredRecords.length > 0) {
            const fieldsToShow = ['RECORDID', 'RECDATE', 'TIMESTAMP', 'QUANTITY', 'AMOUNT', 'EMPLOYEE', 'CUPOND', 'COMPANY', 'CASH', 'MEMBER', 'ENTERTAIN', 'CARD', 'TRANSFER', 'CREDIT'];
        
            const filteredFields = filteredRecords.map(record => {
                let filteredRecord = {};
                fieldsToShow.forEach(field => {
                    if (record[field]) {
                        // ใช้ฟังก์ชัน formatDate, formatDateTime, formatNumber
                        if (field === 'RECDATE') {
                            filteredRecord[field.toLowerCase()] = formatDate(record[field]); // ชื่อฟิลด์เป็นตัวพิมพ์เล็ก
                        } else if (field === 'TIMESTAMP') {
                            filteredRecord[field.toLowerCase()] = formatDateTime(record[field]); // ชื่อฟิลด์เป็นตัวพิมพ์เล็ก
                        } else if (typeof record[field] === 'number') {
                            filteredRecord[field.toLowerCase()] = formatNumber(record[field]); // ชื่อฟิลด์เป็นตัวพิมพ์เล็ก
                        } else {
                            filteredRecord[field.toLowerCase()] = record[field]; // ชื่อฟิลด์เป็นตัวพิมพ์เล็ก
                        }
                    }
                });
                return filteredRecord; // ต้องคืนค่าของ filteredRecord หลังจากแปลงข้อมูล
            });
        
            // การตรวจสอบว่า filteredFields เป็น Object หรือไม่
            if (Array.isArray(filteredFields)) {
                try {
                    // สร้างข้อความที่มีการคั่นแต่ละเรคคอร์ดด้วย \n
                    const formattedResult = filteredFields.map(record => {
                        return Object.entries(record)
                            .map(([key, value]) => `${key}: ${value}`) // แปลงแต่ละคู่ key-value เป็นข้อความ
                            .join('\n'); // คั่นแต่ละฟิลด์ในเรคคอร์ดด้วย \n
                    }).join('\n\n'); // คั่นแต่ละเรคคอร์ดด้วย \n\n
                    
                    return formattedResult; // ส่งคืนผลลัพธ์ที่ฟอร์แมตแล้ว
                } catch (error) {
                    console.error("Error formatting Array:", error);
                    return 'Error formatting Array';
                }
            } else {
                return `ไม่พบเรคคอร์ดที่มีวันที่ตรงกับ ${message} ในข้อมูลที่ให้มา`;
            }
        }
         else {
            console.warn('isDate:ไม่พบเรคคอร์ดที่ตรงกับวันที่ message');
            return `ไม่พบเรคคอร์ดที่มีวันที่ตรงกับ ${message} ในข้อมูลที่ให้มา`;
        }
    } catch (e) {
        console.error('isDate:เกิดข้อผิดพลาดใน isDatehandle', e);
        return `เกิดข้อผิดพลาด: ${e.message}`;
    }
}
/*
jsonString = jsonString
                    .replace(/[\{\}\[\]]/g, '') // ลบ { }, [ ]
                    .replace(/\"/g, '')         // ลบเครื่องหมายคำพูด
                    .trim();                    // ลบช่องว่างส่วนเกิน
jsonString = jsonString
                    .replace(/[\{\}\[\]]/g, '')     // ลบ { }, [ ]
                    .replace(/\b(\d{1,3})(?=(\d{3})+(?!\d))/g, '$1,')
                    .replace(/\"/g, '')             // ลบเครื่องหมายคำพูด
                    .replace(/:/g, ': ')            // เติมช่องว่างหลังเครื่องหมาย :
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',') // เพิ่มเครื่องหมาย , ในตัวเลขที่มีหลัก 3 ตัวขึ้นไป
                    .replace(/\b(\d{4})\b/g, '$1')  // ยกเว้นปีที่ไม่ต้องใส่เครื่องหมาย ,
                    .replace(/,\n/g, ', ')          // ป้องกันการขึ้นบรรทัดใหม่หลังเครื่องหมาย ,
                    .replace(/,(?=\S)/g, ',\n')      // เปลี่ยน , เป็น , พร้อมกับขึ้นบรรทัดใหม่หากไม่ติดกับช่องว่าง
                    */
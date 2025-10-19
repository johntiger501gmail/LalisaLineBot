// formatdata.js
// ฟังก์ชันแปลง Date เป็นรูปแบบ DD/MM/YYYY สำหรับ RECDATE
export function parseDate(dateStr) {
    try {
        if (dateStr instanceof Date) {
            return dateStr;
        }

        if (typeof dateStr !== 'string') {
            throw new Error(`ค่าวันที่ไม่ใช่ string หรือ Date: ${dateStr}`);
        }

        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }

        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }
    } catch (error) {
        console.error("parseDate: Error parsing date:", error.message);
        throw error;
    }

    throw new Error(`รูปแบบวันที่ไม่ถูกต้อง: ${dateStr}`);
}

// ฟังก์ชันช่วยในการตรวจสอบว่าเป็นวันที่หรือไม่
export function isValidDate(dateStr) {
    if (typeof dateStr !== 'string') {
        return false; // ไม่ใช่ string ไม่ใช่วันที่ที่ถูกต้อง
    }

    // รองรับรูปแบบ dd/mm/yyyy
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // เดือนใน JavaScript เริ่มจาก 0
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);
        return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
    }

    // รองรับรูปแบบ yyyy-mm-dd
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/;
    if (isoMatch.test(dateStr)) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    }

    return false; // ถ้าไม่ตรงกับรูปแบบที่รองรับ
}

// ฟังก์ชันแปลง Date เป็นรูปแบบ DD/MM/YYYY
export function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date); // แปลงเป็น Date ก่อน
    }
    if (isNaN(date.getTime())) {
        throw new Error(`ไม่สามารถแปลงเป็นวันที่ได้: ${date}`);
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}


// ฟังก์ชันแปลง Date เป็นรูปแบบ DD/MM/YYYY HH:mm:ss สำหรับ TIMESTAMP
export function formatDateTime(date) {
    const formattedDate = formatDate(date);
    const time = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return `${time}`;
    //return `${formattedDate} ${time}`;
}

// ฟังก์ชันแปลงตัวเลขให้เป็นรูปแบบที่ต้องการ
export function formatNumber(result) {
    // ตรวจสอบจำนวนทศนิยม
    const decimalPlaces = result % 1 === 0 ? 0 : (result.toString().split('.')[1] || '').length;

    // กำหนดให้ maximumFractionDigits ขึ้นอยู่กับจำนวนทศนิยม
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: decimalPlaces, 
        maximumFractionDigits: 2 
    }).format(result);
}
function sanitizeMessage(message) {
    // ลบอักขระพิเศษ เช่น สัญลักษณ์ที่ไม่จำเป็นออกจากข้อความ
    return message.replace(/[^a-zA-Z0-9ก-ฮ\s]/g, '');
}
// ฟังก์ชันช่วยจัดรูปแบบค่าที่ได้จากฟิลด์
export function formatResult(value) {
    if (value instanceof Date) {
        return value.toISOString().split('T')[0]; // แปลง Date เป็น yyyy-mm-dd
    } else if (typeof value === 'number') {
        return value.toLocaleString(); // แปลงตัวเลขเป็นรูปแบบท้องถิ่น
    } else if (typeof value === 'string') {
        return value.trim(); // คืนค่า string หลังตัดช่องว่าง
    } else if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value); // แปลง Object เป็น JSON string
    }
    return String(value); // แปลงเป็น string สำหรับประเภทอื่น
}

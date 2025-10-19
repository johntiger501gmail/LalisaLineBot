// ฟังก์ชันสำหรับสร้าง body ของ Flex message
export function createBodyImage(imageUrl, displayText) {
    // กำหนด URL สำรองและข้อความสำรอง
    
    const defaultText = "ไม่มีข้อความเพิ่มเติม"; // ข้อความสำรอง
  
    // ใช้ imageUrl หรือ defaultImageUrl ถ้าไม่ได้รับค่า
    const finalImageUrl = imageUrl || defaultImageUrl;
    // ใช้ displayText หรือ defaultText ถ้าไม่ได้รับค่า
    const finalText = displayText || defaultText;
  
    return {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "image",
          url: imageUrl, // URL ของภาพที่ใช้
          size: "full",
          aspectRatio: "1:1",
          aspectMode: "cover",
          margin: "sm"
        },
        {
          type: "text",
          text: finalText, // ข้อความที่จะแสดง
          weight: "regular",
          size: "sm",
          color: "#4682B4",
          margin: "sm",
          wrap: true,
          align: "start"
        }
      ]
    };
  }  
/*
// ฟังก์ชันตรวจสอบ URL

  
    // ตรวจสอบว่า searchResult มี URL หรือไม่
    if (searchResult?.originalContentUrl) {
      imageUrl = searchResult.originalContentUrl;
    } else if (contentText?.searchResult?.originalContentUrl) {
      // ตรวจสอบว่า contentText มี URL หรือไม่
      imageUrl = contentText.searchResult.originalContentUrl;
    }
    console.log("Debug.crtBodyImage: ตรวจสอบ:", imageUrl);
    // ตรวจสอบ URL ก่อน
    const urlCheckResult = await checkUrl(imageUrl);
    if (!urlCheckResult) {
      imageUrl = defaultImageUrl;  // ใช้ URL สำรอง
      console.log("Debug.crtBodyImage: URL ไม่เปิด, ใช้ภาพจำลอง", imageUrl);
    }
  
    // ตรวจสอบข้อความที่เกี่ยวข้อง
    if (searchResult?.text) {
      displayText = searchResult.text;
      console.log("Debug.crtBodyImage: Using searchResult.text:", displayText);
    } else if (contentText?.text) {
      displayText = contentText.text;
      console.log("Debug.crtBodyImage: Using contentText.text:", displayText);
    }
    */
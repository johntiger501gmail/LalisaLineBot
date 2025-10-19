// createBodySTK.js
export function createBodySTK(searchResult, contentType, formattedBody) {
    // ตรวจสอบว่า searchResult มีข้อมูล packageId และ stickerId หรือไม่
    if (!searchResult || !searchResult.packageId || !searchResult.stickerId) {
        return {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: "ข้อมูลสติ๊กเกอร์ไม่ถูกต้องหรือไม่ครบถ้วน",
                    weight: "bold",
                    size: "sm",
                    color: "#FF0000",
                    margin: "md",
                    wrap: true
                }
            ]
        };
    }

    // สร้างเนื้อหา Body สำหรับการแสดงสติ๊กเกอร์
    console.log("createBodySTK.Sticker", searchResult.packageId, searchResult.stickerId);
    const bodyContents = [
        {
            type: "text",
            text: `นี่คือข้อมูลสติ๊กเกอร์ที่คุณส่งมา`,
            weight: "bold",
            size: "sm",
            color: "#4682B4",
            margin: "md",
            wrap: true,
        },
        {
            type: "text",
            text: `Sticker - Package ID: ${searchResult.packageId}, Sticker ID: ${searchResult.stickerId}`,
            weight: "regular",
            size: "sm",
            color: "#FF4500",
            margin: "sm",
            wrap: true,
        },
        {
            type: "image",
            url: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${searchResult.stickerId}/ANDROID/sticker.png`,
            size: "full", // สามารถปรับขนาดเป็น "mega" หรือ "small" ตามที่ต้องการ
            aspectRatio: "1:1",
            aspectMode: "cover",
            margin: "sm",
        },
    ];

    // คืนค่าโครงสร้าง Body
    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
    };
}

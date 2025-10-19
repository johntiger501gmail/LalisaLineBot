export async function handleReplyMessage(event, replyToken, client, botUserId) {
    try {
      const replyingUserId = event.source.userId; // ผู้ที่ตอบกลับข้อความ
      const repliedUserId = event.message.repliedMessage.userId; // ผู้ที่ถูกตอบกลับ (ข้อความต้นทาง)
      const repliedText = event.message.repliedMessage.text; // ข้อความต้นทางที่ถูกตอบกลับ
  
      // ตรวจสอบว่าเป็นการตอบกลับข้อความจากบอทเองหรือไม่
      if (repliedUserId === botUserId) {
        // ตรวจสอบข้อความที่ตอบกลับว่าเป็นข้อความที่ไม่ต้องการให้บอทตอบ
        const botMentionPattern = new RegExp(`@${botUserId}|${botName}`, "i"); // เช็คชื่อบอท
        const specialCharacterPattern = /[\u{1F600}-\u{1F64F}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}\u{25AA}\u{1F004}\u{1F004}\u{1F50D}]/gu; // ค้นหาสัญลักษณ์พิเศษ
  
        // ตรวจสอบว่าเป็นข้อความที่มีการพิมพ์ชื่อบอทหรือสัญลักษณ์พิเศษหรือไม่
        if (botMentionPattern.test(repliedText) || specialCharacterPattern.test(repliedText)) {
          // ถ้าเป็นข้อความที่ไม่เกี่ยวข้องกับบอท ไม่ต้องตอบกลับ
          console.log("handleReplyMessage: User replied with an irrelevant message, skipping reply.");
          return;
        }
  
        const replyText = `คุณได้ตอบกลับข้อความของบอทว่า "${repliedText}"`;
        console.log("handleReplyMessage: User replied to bot message:", repliedText);
  
        // ส่งข้อความตอบกลับ
        await client.replyMessage(replyToken, {
          type: "text",
          text: replyText,
        });
      } else {
        console.log(
          "handleReplyMessage: User did not reply to bot. Skipping response."
        );
        return; // ไม่ต้องตอบกลับ
      }
    } catch (error) {
      console.error("handleReplyMessage: Error processing reply message", error);
  
      // แจ้งปัญหากลับไปยังผู้ใช้
      await client.replyMessage(replyToken, {
        type: "text",
        text: "เกิดข้อผิดพลาดในการประมวลผลข้อความตอบกลับ",
      });
    }
  }
  
  
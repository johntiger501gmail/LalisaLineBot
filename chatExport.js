// ประกาศ array เก็บ metadata
export const chatHistory = [];

export function printChatHistory() {
  console.log("===== CHAT HISTORY =====");
  chatHistory
    .sort((a, b) => a.timestamp - b.timestamp) // เรียง timeline
    .forEach(event => {
      const time = new Date(event.timestamp).toLocaleString();
      const content = event.filePath || event.textContent || "-";
      console.log(`[${time}] ${event.userName} (${event.userId}) type: ${eventTypeReadable(event.messageType)} content: ${content}`);
    });
  console.log("========================");
}

function eventTypeReadable(type) {
  switch(type) {
    case "text": return "ข้อความ";
    case "image": return "รูปภาพ";
    case "audio": return "เสียง";
    case "video": return "วีดีโอ";
    case "sticker": return "สติ๊กเกอร์";
    case "location": return "โลเคชัน";
    default: return type || "-";
  }
}
import fs from 'fs';

export function exportChatHistoryJSON(filename = "chatHistory.json") {
  fs.writeFileSync(filename, JSON.stringify(chatHistory, null, 2), "utf-8");
  console.log("Exported chat history to", filename);
}
export function exportChatHistoryCSV(filename = "chatHistory.csv") {
  const header = ["timestamp","userId","userName","messageType","content"];
  const rows = chatHistory
    .sort((a,b) => a.timestamp - b.timestamp)
    .map(e => [
      new Date(e.timestamp).toISOString(),
      e.userId,
      e.userName,
      e.messageType,
      e.filePath || e.textContent || ""
    ].map(s => `"${s}"`).join(","));
  const csvContent = [header.join(","), ...rows].join("\n");
  fs.writeFileSync(filename, csvContent, "utf-8");
  console.log("Exported chat history to", filename);
}

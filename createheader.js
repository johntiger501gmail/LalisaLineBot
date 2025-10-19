export function createHeader(message, userName, intentResult, resultDBF) {
    const intentText = intentResult || "ไม่พบข้อมูลคำถาม";
    return {
        type: "box",
        layout: "vertical",
        contents: [
            {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: userName,
                        weight: "regular",
                        size: "sm",
                        color: "#FFFFFF",
                        align: "center",
                        wrap: true
                    }
                ],
                backgroundColor: "#333333",
                paddingAll: "md"
            },
            {
                type: "box",
                layout: "vertical",
                contents: [
                    // ก้อนที่สอง
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `ข้อความ: ${
                                    typeof message === "object" && message.type === "text"
                                    ? message.text
                                    : typeof message === "object" && message.type
                                    ? message.type === "image" ? "image" : message.type
                                    : message
                                }`,
                                weight: "regular",
                                size: "sm",
                                color: "#4682B4",
                                wrap: true
                            }
                        ]
                    },
                    // ก้อนที่สาม
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `บอท: ${intentText}`,
                                weight: "regular",
                                size: "sm",
                                color: "#4682B4",
                                wrap: true
                            }
                        ]
                    },
                    // ก้อนที่สี่
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `ข้อมูลระบบ: ${resultDBF}`,
                                weight: "regular",
                                size: "sm",
                                color: "#4682B4",
                                wrap: true
                            }
                        ]
                    }
                ]
            }
            
        ]
    };
}
/*
export function createHeader(message,userName) {
    return {
        type: "box",
        layout: "horizontal",
        contents: [
            {
                type: "text",
                text: userName,
                weight: "regular",
                size: "sm",
                color: "#FFFFFF",
                align: "center"
            }
        ],
        backgroundColor: "#333333",
        paddingAll: "md"
    };
}

*/
// createBodysrch.js
import { validateUrl } from "./googles.js";
export function createBodySRCH(searchResult) {
    //console.log("searchResult.text", searchResult);

    const placeholderThumbnail = "https://i.imgur.com/fv9DIHe.jpeg";
    const defaultSnippet = "ไม่มีข้อมูลเพิ่มเติม";
    const defaultTitle = "ไม่มีหัวข้อ";
    const defaultLink = "https://www.google.com";

    // ฟังก์ชันจัดการข้อความปลอดภัย
    const safeText = (value, defaultText = "") =>
        (typeof value === "string" || typeof value === "number") ? String(value) : defaultText;

    // ฟังก์ชันจัดการการดึงข้อมูลจากอ็อบเจกต์
    const safeObject = (value, defaultText = "") =>
        (value && (typeof value === "string" || typeof value === "number" || typeof value === "object")) ? value : defaultText;

    const bodyContents = [
        {
            type: "text",
            text: `🔎 ${safeText(searchResult.type, "ผลลัพธ์การค้นหา")}`,
            weight: "bold",
            size: "md",
            color: "#000000",
            margin: "sm",
            wrap: true,
        }
    ];
    
    if (searchResult && Array.isArray(searchResult.text)) {
        const validResults = searchResult.text.filter(item => {
            const link = validateUrl(item.link, null, searchResult.text);
            return link && link.startsWith("http");
        });
    
        validResults.forEach(item => {
            const { title, link, snippet, pagemap } = item;
            const validTitle = safeText(title, defaultTitle);
            const validSnippet = safeText(snippet, defaultSnippet);
            const validLink = validateUrl(link, defaultLink, searchResult.text);
            const validThumbnail = validateUrl(
                pagemap?.thumbnail || pagemap?.image || placeholderThumbnail,
                placeholderThumbnail,
                searchResult.text
            );
            
            bodyContents.push({
                type: "box",
                layout: "vertical",
                margin: "md",
                contents: [
                    {
                        type: "image",
                        url: validThumbnail,
                        size: "full",
                        aspectRatio: "16:9",
                        aspectMode: "cover",
                        action: { type: "uri", uri: validLink },
                    },
                    {
                        type: "text",
                        text: `📌 ${safeObject(validTitle)}`, // Using safeObject here
                        weight: "bold",
                        size: "sm",
                        margin: "sm",
                        wrap: true,
                    },
                    {
                        type: "text",
                        text: `🔗 ${safeObject(validLink)}`, // Using safeObject here
                        size: "xs",
                        color: "#4682B4",
                        wrap: true,
                        action: { type: "uri", uri: validLink },
                    },
                    {
                        type: "text",
                        text: `📝 ${safeObject(validSnippet)}`, // Using safeObject here
                        size: "xs",
                        wrap: true,
                        margin: "sm",
                    }
                ]
            });
        });
    } else if (typeof searchResult.text === "string") {
        console.log("searchResult.text is a string:", searchResult.text);
        bodyContents.push({
            type: "text",
            text: searchResult.text || "ไม่มีผลลัพธ์การค้นหา",
            weight: "regular",
            size: "sm",
            color: "#FF0000",
            margin: "md",
            wrap: true,
        });
    } else {
        console.log("searchResult.text is not a valid array or string.");
        bodyContents.push({
            type: "text",
            text: "ไม่มีผลลัพธ์การค้นหา",
            weight: "regular",
            size: "sm",
            color: "#FF0000",
            margin: "md",
            wrap: true,
        });
    }
    
    //console.log("Final bodyContents:", bodyContents);  // ล็อก bodyContents เพื่อดูว่าข้อมูลทั้งหมดถูกเพิ่มเข้าไปหรือไม่

    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
    };
}

/*
// createBodysrch.js
export function createBodySRCH(searchResult) {
    //console.log("searchResult.text", searchResult);

    const placeholderThumbnail = "https://i.imgur.com/fv9DIHe.jpeg";
    const defaultSnippet = "ไม่มีข้อมูลเพิ่มเติม";
    const defaultTitle = "ไม่มีหัวข้อ";
    const defaultLink = "https://www.google.com";

    // ฟังก์ชันจัดการข้อความปลอดภัย
    const safeText = (value, defaultText = "") =>
        (typeof value === "string" || typeof value === "number") ? String(value) : defaultText;

    // ฟังก์ชันจัดการการดึงข้อมูลจากอ็อบเจกต์
    const safeObject = (value, defaultText = "") =>
        (value && (typeof value === "string" || typeof value === "number" || typeof value === "object")) ? value : defaultText;

    const bodyContents = [
        {
            type: "text",
            text: `🔎 ${safeText(searchResult.type, "ผลลัพธ์การค้นหา")}`,
            weight: "bold",
            size: "md",
            color: "#000000",
            margin: "sm",
            wrap: true,
        }
    ];
    
    if (searchResult && Array.isArray(searchResult.text)) {
        const validResults = searchResult.text.filter(item => {
            const link = validateUrl(item.link, null, searchResult.text);
            return link && link.startsWith("http");
        });
    
        validResults.forEach(item => {
            const { title, link, snippet, pagemap } = item;
            const validTitle = safeText(title, defaultTitle);
            const validSnippet = safeText(snippet, defaultSnippet);
            const validLink = validateUrl(link, defaultLink, searchResult.text);
            const validThumbnail = validateUrl(
                pagemap?.thumbnail || pagemap?.image || placeholderThumbnail,
                placeholderThumbnail,
                searchResult.text
            );
            
            bodyContents.push({
                type: "box",
                layout: "vertical",
                margin: "md",
                contents: [
                    {
                        type: "image",
                        url: validThumbnail,
                        size: "full",
                        aspectRatio: "16:9",
                        aspectMode: "cover",
                        action: { type: "uri", uri: validLink },
                    },
                    {
                        type: "text",
                        text: `📌 ${safeObject(validTitle)}`, // Using safeObject here
                        weight: "bold",
                        size: "sm",
                        margin: "sm",
                        wrap: true,
                    },
                    {
                        type: "text",
                        text: `🔗 ${safeObject(validLink)}`, // Using safeObject here
                        size: "xs",
                        color: "#4682B4",
                        wrap: true,
                        action: { type: "uri", uri: validLink },
                    },
                    {
                        type: "text",
                        text: `📝 ${safeObject(validSnippet)}`, // Using safeObject here
                        size: "xs",
                        wrap: true,
                        margin: "sm",
                    }
                ]
            });
        });
    } else if (typeof searchResult.text === "string") {
        console.log("searchResult.text is a string:", searchResult.text);
        bodyContents.push({
            type: "text",
            text: searchResult.text || "ไม่มีผลลัพธ์การค้นหา",
            weight: "regular",
            size: "sm",
            color: "#FF0000",
            margin: "md",
            wrap: true,
        });
    } else {
        console.log("searchResult.text is not a valid array or string.");
        bodyContents.push({
            type: "text",
            text: "ไม่มีผลลัพธ์การค้นหา",
            weight: "regular",
            size: "sm",
            color: "#FF0000",
            margin: "md",
            wrap: true,
        });
    }
    
    //console.log("Final bodyContents:", bodyContents);  // ล็อก bodyContents เพื่อดูว่าข้อมูลทั้งหมดถูกเพิ่มเข้าไปหรือไม่

    return {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
    };
}

// ฟังก์ชันถอดรหัส URL
const validateUrl = (url, defaultUrl, searchResultText) => {
    if (typeof url !== "string") {
        console.error("Invalid URL type:", typeof url);
        return defaultUrl;
    }

    try {
        // Clean invalid percent-encoded characters
        const cleanedUrl = url.replace(/%[^\dA-Fa-f]{0,2}/g, '');
        //console.log("Original URL:", url);
        //console.log("Cleaned URL:", cleanedUrl);

        try {
            const decodedUrl = decodeURIComponent(cleanedUrl);
            return decodedUrl; // Return the decoded URL
        } catch (decodeError) {
            console.error("URL decoding failed:", decodeError, "Original URL:", cleanedUrl);
            return `https://www.google.com/search?q=${encodeURIComponent(searchResultText || 'search')}`;
        }
    } catch (e) {
        console.error("Unexpected error during URL validation:", e);
        return defaultUrl;
    }
};



*/
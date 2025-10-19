import axios from 'axios';

// สร้าง instance ของ axios พร้อม timeout
const axiosInstance = axios.create({ timeout: 10000 }); // 10 วินาที

export async function getGoogleSearchResults(query) {
    const apiKeys = [
        'AIzaSyBLK4UqhyGxDaXAiZs2Gr8pIKv7_yi8wb8', // API Key ตัวแรก
        'AIzaSyCA4rOI37_g3cgFPBEo0RHUqH9RuIyhH88'  // API Key ตัวที่สอง
    ];
    const searchEngineId = 'd33f721963d294f01';
    let currentApiKeyIndex = 0;

    while (currentApiKeyIndex < apiKeys.length) {
        const apiKey = apiKeys[currentApiKeyIndex];
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${searchEngineId}`;

        try {
            const response = await axiosInstance.get(url);
            const items = response.data.items || [];

            if (items.length === 0) {
                return null; // ไม่มีผลลัพธ์
            }

            // จัดการผลลัพธ์
            return items.map((item) => {
                const pagemap = item.pagemap || {};
                const thumbnail = pagemap.cse_thumbnail ? pagemap.cse_thumbnail[0]?.src : "https://i.imgur.com/fv9DIHe.jpeg";
                return {
                    title: item.title.substring(0, 100),
                    link: item.link,
                    snippet: item.snippet.substring(0, 300),
                    pagemap: {
                        thumbnail,
                        description: pagemap.metatags ? pagemap.metatags[0]?.description : item.snippet,
                    },
                };
            });
        } catch (error) {
            const errorResponse = error.response?.data || {};
            const errorMessage = errorResponse.error?.message || error.message;

            if (errorResponse.error?.code === 429 || errorMessage.includes('Quota exceeded')) {
                console.warn(`Quota exceeded for API Key: ${apiKey}`);
                currentApiKeyIndex += 1; // ใช้ API Key ตัวถัดไป
            } else {
                console.error("Error fetching Google Search results:", errorMessage);
                return [{
                    error: 'เกิดข้อผิดพลาดในการค้นหา',
                    suggestion: 'คลิกลิงก์เพื่อดูข้อมูลเพิ่มเติม',
                    link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                }];
            }
        }
    }

    return [{
        error: 'ไม่สามารถค้นหาข้อมูลได้',
        suggestion: 'ลองใหม่ในภายหลัง',
        link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    }];
}

export async function checkUrl(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { timeout: 5000 });  // 5 วินาที
        // ตรวจสอบว่า status code 2xx คือ success
        if (response.status >= 200 && response.status < 300) {
            return true;  // URL ใช้งานได้
        } else {
            return false;  // ถ้า status code ไม่ใช่ 2xx ก็ถือว่า URL ใช้งานไม่ได้
        }
    } catch (error) {
        // ไม่พิมพ์ข้อความข้อผิดพลาดในกรณีที่เกิดข้อผิดพลาด
        console.log("ansmenu.checkUrl >> เปิดไม่ได้ url:", imageUrl);
        return false;  // ถ้าเกิดข้อผิดพลาดจะคืนค่า false
    }
}

export const validateUrl = (url, defaultUrl = "https://www.google.com", searchResultText = "search", maxLength = 1000) => {
    if (typeof url !== "string" || url.trim() === "") {
        console.error("Invalid URL type or empty string:", typeof url, url);
        return defaultUrl;
    }
  
    try {
        // Clean invalid percent-encoded characters
        const cleanedUrl = url.replace(/%[^\dA-Fa-f]{0,2}/g, '');
        const decodedUrl = decodeURIComponent(cleanedUrl);
  
        // Check if the decoded URL is valid
        const parsedUrl = new URL(decodedUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            console.warn("Unsupported URL protocol:", parsedUrl.protocol);
            return defaultUrl;
        }

        // If the decoded URL exceeds the maxLength, truncate it
        if (decodedUrl.length > maxLength) {
            return decodedUrl.substring(0, maxLength);
        }
  
        return decodedUrl; // Valid and decoded URL
    } catch (error) {
        console.error("Error validating or decoding URL:", error, "Original URL:", url);
        return `https://www.google.com/search?q=${encodeURIComponent(searchResultText)}`;
    }
};

export function formatSearchResult(searchResult) {
    if (!Array.isArray(searchResult)) {
        // ถ้า searchResult ไม่ใช่ Array ให้ส่งคืนค่าผลลัพธ์เป็น Array ว่าง
        //console.log("Googles.searchResult is not an array:", searchResult);
        return [];
    }

    return searchResult.map(item => {
        // ตรวจสอบว่า item เป็น undefined หรือ null หรือไม่
        if (!item) {
            console.log("Item is undefined or null:", item);
            return {
                title: 'No Title',
                link: '',
                snippet: 'No snippet available',
                pagemap: {
                    thumbnail: null,
                    event: null,
                    metatags: null,
                    image: null,
                    video: null,  // เพิ่มข้อมูลของ video
                    articleTitle: null,  // เพิ่มข้อมูลของ articleTitle
                    description: 'No description available',
                    snippet: 'No snippet available'
                }
            };
        }

        //console.log("Item found:", item);

        // ใช้ optional chaining เพื่อให้ปลอดภัยเมื่อไม่พบ pagemap
        const pagemap = item.pagemap || {};  // ถ้าไม่มี pagemap ก็จะเป็น object ว่าง
        //console.log("Pagemap:", pagemap);

        // ตรวจสอบข้อมูลต่างๆ ใน pagemap
        const thumbnail = pagemap.cse_thumbnail ? pagemap.cse_thumbnail[0]?.src : null;  // thumbnail ที่มาจาก cse_thumbnail
        const event = pagemap.Event ? pagemap.Event[0]?.name : null;  // event จาก Event
        const metatags = pagemap.metatags ? pagemap.metatags[0] : null;  // metatags ถ้ามี
        const image = pagemap.cse_image ? pagemap.cse_image[0]?.src : null;  // image จาก cse_image
        const video = pagemap.cse_video ? pagemap.cse_video[0]?.src : null;  // video จาก cse_video
        const articleTitle = pagemap.article ? pagemap.article[0]?.title : null;  // articleTitle จาก article
        /*
        console.log("Thumbnail:", thumbnail);
        console.log("Event:", event);
        console.log("Metatags:", metatags);
        console.log("Image:", image);
        console.log("Video:", video);
        console.log("Article Title:", articleTitle);
        */
        // การดึง og:image จาก metatags หากมี
        const ogImage = metatags ? metatags['og:image'] : null;

        return {
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            pagemap: {
                thumbnail: thumbnail || ogImage || null,  // ใช้ thumbnail หรือ og:image จาก metatags
                event: event || null,          // ใช้ null ถ้าไม่มี event
                metatags: metatags || null,    // ใช้ metatags ถ้ามี
                image: image || null,          // ใช้ image ถ้ามี
                video: video || null,          // ใช้ video ถ้ามี
                articleTitle: articleTitle || null,  // ใช้ articleTitle ถ้ามี
                description: item.description || 'No description available',  // ใช้ description จาก item
                snippet: item.snippet || 'No snippet available'  // ใช้ snippet ถ้าไม่มี
            }
        };
    });
}

// ฟังก์ชันการจัดการการแสดงผลจากการดึงข้อมูล HTML
export function formatSearchResultForDisplay(searchResult) {
    if (!searchResult) {
        return { contents: [] }; // ถ้าไม่มีข้อมูล ให้คืนค่าเริ่มต้น
    }
    const contents = [];

    // ตรวจสอบว่า searchResult เป็น sticker หรือไม่
    if (searchResult.type === 'sticker') {
        console.log("formatForDisplay.sticker.searchResult:", searchResult);
        contents.push({
            type: "sticker",
            packageId: searchResult.packageId,
            stickerId: searchResult.stickerId
        });
    }
    // ตรวจสอบว่า searchResult เป็นสตริงหรือไม่ ก่อนจะใช้ .includes()
    else if (typeof searchResult === 'string') {
        console.log("formatForDisplay.string.searchResult.text:", searchResult);
        // ดึงข้อมูลรูปภาพจาก HTML (ถ้ามี)
        const imageRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imageRegex.exec(searchResult)) !== null) {
            const imageUrl = match[1];
            console.log("Extracted Image URL:", imageUrl);
            contents.push({
                type: "image",
                url: imageUrl,
                size: "full",
                aspectRatio: "1:1",
                aspectMode: "cover"
            });
        }

        // ดึงข้อความธรรมดาจาก HTML (ตัด HTML tags ออก)
        const plainText = searchResult.replace(/<[^>]*>/g, '').trim();
        if (plainText) {
            console.log("formatForDisplay.plainText:", plainText);
            contents.push({
                type: "text",
                text: plainText,
                wrap: true,
                size: "sm",
                margin: "md"
            });
        }
    }

    // ตรวจสอบถ้าไม่มี contents ใดๆ
    if (contents.length === 0) {
        console.log("formatForDisplay.searchResult.text:");
        contents.push({
            type: "text",
            text: `🔍 ${searchResult.text}...ข้อมูลเพิ่มเติม`,
            color: "#FF0000",
            wrap: true,
            size: "sm",
            margin: "md"
        });
    }

    return { contents };
}

/*

// ฟังก์ชันที่ใช้ค้นหาข้อมูลจาก Google
export async function getGoogleSearchResults(query) {
    const apiKeys = [
        'AIzaSyAaIQ_w0DwQi8b-Q9_cAy8pI-cOPB9bMcw', // API Key ตัวแรก
        'AIzaSyCA4rOI37_g3cgFPBEo0RHUqH9RuIyhH88'  // API Key ตัวที่สอง
    ];
    const searchEngineId = 'd33f721963d294f01';
    const placeholderThumbnail = "https://i.imgur.com/fv9DIHe.jpeg"; // Placeholder URL

    let currentApiKeyIndex = 0;

    while (currentApiKeyIndex < apiKeys.length) {
        const apiKey = apiKeys[currentApiKeyIndex];
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${searchEngineId}`;

        try {
            const response = await axios.get(url);
            const items = response.data.items || [];

            if (items.length === 0) {
                return null; // ไม่มีผลลัพธ์จากการค้นหา
            }

            const resultsWithPagemap = items.map((item) => {
                const pagemap = item.pagemap || {};
                const thumbnail = truncateAndValidateUrl(
                    pagemap.cse_thumbnail?.[0]?.src,
                    placeholderThumbnail
                );
                const link = truncateAndValidateUrl(item.link, "https://www.google.com");
            
                const isWiki = item.link?.includes("wiki");
                const description = isWiki
                    ? `${item.snippet ?? ''} (จากเว็บไซต์ในตระกูล wiki)`
                    : item.description ?? item.snippet ?? "ไม่มีข้อมูล";
            
                return {
                    title: item.title || "ไม่มีชื่อเรื่อง",
                    link: link,
                    snippet: item.snippet || "ไม่มีรายละเอียด",
                    pagemap: {
                        thumbnail: thumbnail,
                        event: pagemap.Event?.[0]?.name || null,
                        metatags: pagemap.metatags ? JSON.stringify(pagemap.metatags[0]) : null,
                        image: pagemap.cse_image?.[0]?.src || null,
                        video: pagemap.VideoObject?.[0]?.url || null,
                        articleTitle: pagemap.Article?.[0]?.headline || null,
                        description: description
                    },
                };
            });
            

            return resultsWithPagemap;

        } catch (error) {
            const errorResponse = error.response?.data || {};
            const errorMessage = errorResponse.error?.message || error.message;

            if (errorResponse.error?.code === 429 || errorMessage.includes('Quota exceeded')) {
                console.warn(`Google API Quota exceeded for API Key: ${apiKey}`);
                currentApiKeyIndex += 1;
            } else {
                console.error("Error fetching Google Search results:", errorResponse);
                return [{
                    error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล',
                    suggestion: 'กรุณาคลิกลิงค์เพื่อดูข้อมูลเพิ่มเติม',
                    query: query,
                    link: `https://www.google.com/search?q=${encodeURIComponent(query)}`
                }];
            }
        }
    }

    return [{
        error: 'เกิดข้อผิดพลาดทั้งหมดในการค้นหา',
        suggestion: 'กรุณาลองใหม่ภายหลัง',
        query: query,
        link: `https://www.google.com/search?q=${encodeURIComponent(query)}`
    }];
}
export function formatSearchResultForDisplay(searchResult) {
    if (!searchResult) {
        return { contents: [] }; // ถ้าไม่มีข้อมูล ให้คืนค่าเริ่มต้น
    }
    const contents = [];

    // ตรวจสอบว่า searchResult เป็น sticker หรือไม่
    if (searchResult.type === 'sticker') {
        console.log("formatForDisplay.sticker.searchResult:", searchResult);
        contents.push({
            type: "sticker",
            packageId: searchResult.packageId,
            stickerId: searchResult.stickerId
        });
    }
    // ตรวจสอบว่า searchResult เป็นสตริงหรือไม่ ก่อนจะใช้ .includes()
    else if (typeof searchResult === 'string') {
        console.log("formatForDisplay.string.searchResult.text:", searchResult);
        // ดึงข้อมูลรูปภาพจาก HTML (ถ้ามี)
        const imageRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imageRegex.exec(searchResult)) !== null) {
            const imageUrl = match[1];
            console.log("Extracted Image URL:", imageUrl);
            contents.push({
                type: "image",
                url: imageUrl,
                size: "full",
                aspectRatio: "1:1",
                aspectMode: "cover"
            });
        }

        // ดึงข้อความธรรมดาจาก HTML (ตัด HTML tags ออก)
        const plainText = searchResult.replace(/<[^>]*>/g, '').trim();
        if (plainText) {
            console.log("formatForDisplay.plainText:", plainText);
            contents.push({
                type: "text",
                text: plainText,
                wrap: true,
                size: "sm",
                margin: "md"
            });
        }
    }

    // ตรวจสอบถ้าไม่มี contents ใดๆ
    if (contents.length === 0) {
        console.log("formatForDisplay.searchResult.text:");
        contents.push({
            type: "text",
            text: `🔍 ${searchResult.text}...ข้อมูลเพิ่มเติม`,
            color: "#FF0000",
            wrap: true,
            size: "sm",
            margin: "md"
        });
    }

    return { contents };
}
export function formatSearchResult(searchResult) {
    // ตรวจสอบว่า searchResult เป็น object ที่มีคีย์ 'text' ซึ่งเป็น array หรือไม่
    if (searchResult && searchResult.text && Array.isArray(searchResult.text)) {
        searchResult = searchResult.text; // ใช้ข้อมูลใน 'text' แทน
    } else if (!Array.isArray(searchResult)) {
        console.warn("formatSearchResult: searchResult is not an array:", searchResult);
        return [{
            error: "Input is not a valid array",
            rawInput: JSON.stringify(searchResult, null, 2) // แปลง input ที่ผิดพลาดเป็น string
        }];
    }

    // ฟังก์ชันช่วยตรวจสอบ URL
    const isValidUrl = (url) => {
        try {
            return typeof url === 'string' && new URL(url) ? true : false;
        } catch {
            return false;
        }
    };

    // ฟังก์ชันช่วยย่อข้อความ
    const truncateText = (text, maxLength) =>
        typeof text === 'string' && text.length > maxLength
            ? `${text.slice(0, maxLength - 3)}...`
            : text;

    // ฟังก์ชันช่วยตรวจสอบและแปลงค่าที่ไม่ใช่ string ให้เป็นข้อความ
    const safeText = (value, defaultText = "No information available") =>
        typeof value === 'string' ? value : JSON.stringify(value, null, 2);

    return searchResult.map(item => {
        if (!item) {
            console.warn("Skipping undefined or null item:", item);
            return {
                title: 'No Title',
                link: 'https://www.google.com',
                snippet: 'No snippet available',
                pagemap: {
                    thumbnail: "https://i.imgur.com/fv9DIHe.jpeg", // Placeholder URL
                    event: null,
                    metatags: null,
                    image: null,
                    video: null,
                    articleTitle: null,
                    description: 'No description available',
                    snippet: 'No snippet available'
                }
            };
        }

        const pagemap = item.pagemap || {};
        const thumbnail = pagemap.cse_thumbnail ? pagemap.cse_thumbnail[0]?.src : null;
        const validLink = isValidUrl(item.link) ? item.link : "https://www.google.com";
        const validThumbnail = isValidUrl(thumbnail) ? thumbnail : "https://i.imgur.com/fv9DIHe.jpeg";

        return {
            title: truncateText(safeText(item.title, "No Title"), 100),
            link: validLink,
            snippet: truncateText(safeText(item.snippet, "No snippet available"), 300),
            pagemap: {
                thumbnail: validThumbnail,
                event: safeText(pagemap.Event ? pagemap.Event[0]?.name : null, "No event information"),
                metatags: safeText(pagemap.metatags ? pagemap.metatags[0] : null, "No metatags available"),
                image: isValidUrl(pagemap.cse_image ? pagemap.cse_image[0]?.src : null)
                    ? pagemap.cse_image[0]?.src
                    : null,
                video: isValidUrl(pagemap.cse_video ? pagemap.cse_video[0]?.src : null)
                    ? pagemap.cse_video[0]?.src
                    : null,
                articleTitle: safeText(pagemap.article ? pagemap.article[0]?.title : null, "No article title"),
                description: truncateText(safeText(item.description, "No description available"), 300),
                snippet: truncateText(safeText(item.snippet, "No snippet available"), 300)
            }
        };
    });
}

export async function getInstagramImageURL(link) {
    try {
        // เพิ่ม header 'User-Agent' ที่เหมาะสม
        const response = await fetch(link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            // ตรวจสอบ status code ถ้าไม่ใช่ 200
            throw new Error(`HTTPError: Request failed with status code ${response.status}`);
        }

        const html = await response.text();

        // ใช้ regex เพื่อจับคู่ URL ของภาพ thumbnail
        const imageMatch = html.match(/"display_url":"(https:\/\/[^"]+)"/);
        if (imageMatch && imageMatch[1]) {
            // ส่งคืน URL ของภาพ thumbnail
            return imageMatch[1]; 
        } else {
            console.error("Image URL not found in Instagram HTML.");
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
    }

    return null; // ถ้าไม่พบภาพหรือมีข้อผิดพลาด
}

export function determineContentType(contentText) {
    // ตรวจสอบว่า contentText เป็น object หรือไม่
    console.log("determineContentType.contentText:", contentText);  // ดูว่ามีข้อมูลอะไรบ้าง

    // ตรวจสอบว่า contentText มี searchResult และ searchResult.type
    if (contentText && typeof contentText === "object") {

        // ตรวจสอบว่า contentText มี searchResult และ searchResult.type
        if (contentText.searchResult && contentText.searchResult.type) {
            // ถ้า contentText มี searchResult.type ให้คืนค่า "sticker" หรือประเภทอื่น ๆ
            return { type: contentText.searchResult.type }; // คืนค่าเป็น object ที่มี key `type`
        }

        // ถ้ามี 'type' ใน contentText โดยตรง (เช่น type ที่บรรจุใน message หรือข้อมูลอื่นๆ)
        if (contentText.type) {
            return { type: contentText.type }; // คืนค่า type โดยตรง
        }

        // ตรวจสอบว่า contentText มี searchResult หรือไม่
        if (contentText.searchResult) {
            const { images, youtubeSongs, articles } = contentText.searchResult || {};
            
            // ตรวจสอบว่ามีข้อมูลใน images, youtubeSongs, หรือ articles
            if (images && images.length > 0) {
                return { type: "image" }; // ถ้ามีรูปภาพ ให้ส่งกลับเป็น "image"
            } else if (youtubeSongs && youtubeSongs.length > 0) {
                return { type: "youtube" }; // ถ้ามีเพลงจาก YouTube ให้ส่งกลับเป็น "youtube"
            } else if (articles && articles.length > 0) {
                return { type: "article" }; // ถ้ามีบทความ ให้ส่งกลับเป็น "article"
            }

            return { type: "searchResults" }; // หากมี searchResult แต่ไม่มีข้อมูลเฉพาะเจาะจง
        }
    }

    // หากไม่มีข้อมูลที่ระบุประเภท (เช่น ไม่มี searchResult หรือ type)
    return { type: "text" }; // ถ้าทุกกรณีไม่ตรง จะตั้งค่าเป็น "text"
}
*/
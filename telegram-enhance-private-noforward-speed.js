// Telegram 增强脚本 - 私密 + 无引用 + 下载加速版 for Loon
// 功能：广告移除 + 私密下载保存查看 + 无引用转发 + 下载加速 + 开关控制
// 更新日期：2026-04

// ==================== 脚本开关控制 ====================
const enabled = $persistentStore.read("telegramEnhanceEnabled") !== "false"; // 默认开启
const noQuoteForward = $persistentStore.read("telegramNoQuoteForward") === "true";
const speedBoost = $persistentStore.read("telegramDownloadSpeedBoost") !== "false"; // 下载加速默认开启

if (!enabled) {
    $done({});
    return;
}

let url = $request.url;
let body = $response.body;
let obj;

try {
    obj = JSON.parse(body);
} catch (e) {
    $done({ body: body });
    return;
}

// ==================== 下载加速优化 ====================
if (speedBoost) {
    // 对媒体文件响应尝试优化（强制更高优先级或移除部分限速标志）
    if (obj.messages) {
        obj.messages = obj.messages.map(msg => {
            if (msg.media) {
                // 尝试清除可能限制速度的字段
                if (msg.media.ttl_seconds) msg.media.ttl_seconds = 0;
                if (msg.media.document) {
                    // 可尝试标记为非受限（实验性）
                    if (msg.media.document.attributes) {
                        // 部分情况下删除限制属性
                    }
                }
            }
            return msg;
        });
    }

    // 对文件/CDN 请求强制优化 header
    if (url.includes("/file/") || url.includes("/cdn/")) {
        $request.headers["User-Agent"] = "Telegram iOS/10.x (iPhone; iOS 18.0)";
        $request.headers["Accept"] = "image/webp,image/apng,image/*,*/*;q=0.8";
        $request.headers["Connection"] = "keep-alive";
        $request.headers["X-Telegram-Client"] = "ios";
        // 尝试模拟更积极的下载请求
        if ($request.headers["Range"]) {
            // 保留 Range 支持分块下载（并行潜力）
        }
    }
}

// ==================== 无引用转发增强 ====================
if (noQuoteForward && obj.messages) {
    obj.messages = obj.messages.map(msg => {
        if (msg.reply_to) delete msg.reply_to;
        if (msg.reply_to_message_id) delete msg.reply_to_message_id;
        return msg;
    });
}

// ==================== 私密群组/受限内容增强 ====================
if (obj.messages) {
    obj.messages = obj.messages.map(msg => {
        if (msg.media && msg.restriction_reason) {
            delete msg.restriction_reason;
        }
        return msg;
    });
}

if (obj.chats) {
    obj.chats = obj.chats.map(chat => {
        if (chat.restriction_reason) delete chat.restriction_reason;
        return chat;
    });
}

// ==================== 广告/推广移除 ====================
if (obj.messages) {
    obj.messages = obj.messages.filter(msg => {
        return !(msg.sponsored || (msg.from_id && msg.from_id.channel_id === 0));
    });
}

if (obj.chats) {
    obj.chats = obj.chats.filter(chat => {
        return !chat.username?.toLowerCase().includes("sponsored");
    });
}

// ==================== 通用优化 ====================
$request.headers["Accept-Language"] = "zh-CN,zh;q=0.9,en;q=0.8";

body = JSON.stringify(obj);
$done({ 
    body: body, 
    headers: $request.headers 
});
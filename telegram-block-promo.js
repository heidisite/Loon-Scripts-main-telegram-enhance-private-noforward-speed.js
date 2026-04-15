// Telegram 屏蔽推广消息脚本 for Loon
// 功能：移除 Sponsored Messages、频道推荐、推广横幅等
// 更新日期：2026-04
// 作者：Heitemi + Grok

let url = $request.url;
let body = $response.body;
let obj;

try {
    obj = JSON.parse(body);
} catch (e) {
    $done({ body: body });
    return;
}

// ==================== 屏蔽推广消息核心逻辑 ====================
// 处理消息列表中的 sponsored / 推广内容
if (obj.messages && Array.isArray(obj.messages)) {
    obj.messages = obj.messages.filter(msg => {
        // 过滤 sponsored 消息
        if (msg.sponsored) {
            console.log('🚫 屏蔽 Sponsored Message');
            return false;
        }
        
        // 过滤来自某些推广频道的消息（channel_id 为 0 或特定特征）
        if (msg.from_id && (msg.from_id.channel_id === 0 || msg.from_id.channel_id === null)) {
            console.log('🚫 屏蔽推广频道消息');
            return false;
        }
        
        // 过滤标题或内容包含推广关键词的消息（可选加强）
        if (msg.message && /推广|赞助|sponsored|推荐频道/i.test(msg.message)) {
            console.log('🚫 屏蔽关键词推广消息');
            return false;
        }
        
        return true;
    });
}

// 处理聊天列表中的推荐/推广频道
if (obj.chats && Array.isArray(obj.chats)) {
    obj.chats = obj.chats.filter(chat => {
        const username = (chat.username || '').toLowerCase();
        const title = (chat.title || '').toLowerCase();
        
        // 屏蔽明显推广特征的聊天
        if (username.includes('sponsored') || 
            username.includes('promo') || 
            title.includes('推荐') || 
            title.includes('推广') ||
            chat.restriction_reason) {  // 部分推广会有限制标记
            console.log('🚫 屏蔽推广聊天: ' + (chat.title || chat.username));
            return false;
        }
        return true;
    });
}

// 处理 updates 中的类似推广（某些更新包里会出现）
if (obj.updates && Array.isArray(obj.updates)) {
    obj.updates = obj.updates.filter(update => {
        if (update.message && update.message.sponsored) {
            return false;
        }
        return true;
    });
}

// 额外清理：移除可能的推荐横幅或辅助字段
if (obj.helpers) delete obj.helpers;
if (obj.promo) delete obj.promo;

// ==================== 日志提示（可选） ====================
if ($response.status === 200) {
    console.log('✅ Telegram 推广屏蔽脚本已执行');
}

body = JSON.stringify(obj);
$done({ 
    body: body 
    // headers 可以不修改，除非需要
});
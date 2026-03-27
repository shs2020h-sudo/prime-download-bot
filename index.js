const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// 1️⃣ استقبال اللينك
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text;

    if (url.startsWith('http')) {
        bot.sendMessage(chatId, "⏳ جاري فحص الرابط واستخراج الجودات...");
        
        // 2️⃣ و 3️⃣ استخراج المعلومات والجودات بصيغة JSON
        // استخدمنا --cookies-from-file عشان يتخطى حظر فيسبوك وإنستجرام
        exec(`yt-dlp -j --cookies cookies.txt ${url}`, (error, stdout, stderr) => {
            if (error) {
                return bot.sendMessage(chatId, "❌ عذراً، الرابط غير مدعوم أو فيه مشكلة.");
            }

            const info = JSON.parse(stdout);
            const title = info.title;
            
            // تصفية الجودات (عرض الفيديو فقط كمثال)
            const formats = info.formats
                .filter(f => f.vcodec !== 'none' && f.resolution) // جودات فيها فيديو
                .slice(-5); // آخر 5 جودات (الأعلى غالباً)

            const keyboard = formats.map(f => [{
                text: `🎥 ${f.resolution} (${f.ext})`,
                callback_data: `dl|${f.format_id}|${url}`
            }]);

            // إضافة خيار تحميل صوت فقط
            keyboard.push([{ text: "🎧 تحميل صوت (MP3)", callback_data: `audio|best|${url}` }]);

            bot.sendMessage(chatId, `🎬 *${title}*\n\nاختار الجودة المطلوبة:`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        });
    }
});

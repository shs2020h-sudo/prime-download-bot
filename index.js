const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// إنشاء مجلد مؤقت للتحميلات إذا لم يكن موجوداً
const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

// 1️⃣ خطوة: استقبال الرابط وعرض الخيارات
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text;

    if (url && url.startsWith('http')) {
        bot.sendMessage(chatId, "⏳ جاري فحص الرابط واستخراج الجودات المتاحة...");

        // جلب معلومات الفيديو بدون تحميل (-j تعني JSON)
        exec(`yt-dlp -j --cookies cookies.txt "${url}"`, (error, stdout) => {
            if (error) {
                return bot.sendMessage(chatId, "❌ خطأ: الرابط غير مدعوم أو المحتوى خاص.");
            }

            try {
                const info = JSON.parse(stdout);
                const title = info.title;
                
                // تصفية التنسيقات (فيديو + صوت) واختيار أفضل 5 جودات
                const formats = info.formats
                    .filter(f => f.vcodec !== 'none' && f.acodec !== 'none') 
                    .slice(-5);

                const keyboard = formats.map(f => [{
                    text: `🎥 ${f.resolution || f.format_note} (${f.ext})`,
                    callback_data: `dl|${f.format_id}|${url}`
                }]);

                // إضافة خيار الصوت فقط
                keyboard.push([{ text: "🎧 تحميل صوت (MP3)", callback_data: `audio|best|${url}` }]);

                bot.sendMessage(chatId, `🎬 *${title}*\n\nإختر النوع والجودة:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, "❌ حدث خطأ أثناء معالجة البيانات.");
            }
        });
    }
});

// 2️⃣ خطوة: معالجة ضغطة الزر والتحميل (Callback Query)
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const [type, formatId, url] = query.data.split('|');
    const fileName = `file_${Date.now()}.%(ext)s`;
    const filePath = path.join(downloadDir, fileName);

    bot.answerCallbackQuery(query.id, { text: "🚀 بدأ التحميل، انتظر قليلاً..." });
    const statusMsg = await bot.sendMessage(chatId, "📥 جاري تحميل الملف ومعالجته...");

    let command = '';
    if (type === 'dl') {
        // تحميل فيديو بجودة محددة
        command = `yt-dlp -f ${formatId} --cookies cookies.txt -o "${path.join(downloadDir, 'video_' + Date.now() + '.%(ext)s')}" "${url}"`;
    } else {
        // تحميل صوت فقط وتحويله لـ mp3 باستخدام ffmpeg
        command = `yt-dlp -x --audio-format mp3 --cookies cookies.txt -o "${path.join(downloadDir, 'audio_' + Date.now() + '.%(ext)s')}" "${url}"`;
    }

    // تنفيذ أمر التحميل
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return bot.editMessageText("❌ فشل التحميل. قد يكون حجم الملف كبيراً جداً.", {
                chat_id: chatId,
                message_id: statusMsg.message_id
            });
        }

        // البحث عن الملف الذي تم تحميله في المجلد
        const files = fs.readdirSync(downloadDir);
        const downloadedFile = files.find(f => f.includes(String(Date.now()).substring(0, 5)));

        if (downloadedFile) {
            const finalPath = path.join(downloadDir, downloadedFile);
            
            bot.editMessageText("✅ تم التحميل! جاري الرفع إلى تيليجرام...", {
                chat_id: chatId,
                message_id: statusMsg.message_id
            });

            // 3️⃣ خطوة: إرسال الملف للمستخدم
            if (type === 'dl') {
                bot.sendVideo(chatId, finalPath).then(() => cleanup(finalPath));
            } else {
                bot.sendAudio(chatId, finalPath).then(() => cleanup(finalPath));
            }
        }
    });
});

// وظيفة لمسح الملفات بعد الإرسال لتوفير المساحة
function cleanup(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Error deleting file:", e);
    }
}

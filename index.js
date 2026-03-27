const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

// User-Agent لخداع المنصات وكأننا متصفح موبايل حقيقي
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36";

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text;

    if (url && url.startsWith('http')) {
        const statusMsg = await bot.sendMessage(chatId, "⏳ جاري فحص الرابط (يوتيوب/إنستا/فيس/تيك توك)...");

        // أمر الفحص مع إضافة User-Agent وكوكيز
        const checkCmd = `yt-dlp -j --no-warnings --cookies cookies.txt --user-agent "${UA}" --socket-timeout 25 "${url}"`;

        exec(checkCmd, (error, stdout) => {
            if (error) {
                console.error("Check Error:", error);
                return bot.editMessageText("❌ فشل الفحص: الرابط محمي أو السيرفر محظور من المنصة. (تأكد من تحديث cookies.txt)", {
                    chat_id: chatId, message_id: statusMsg.message_id
                });
            }

            try {
                const info = JSON.parse(stdout);
                
                // تصفية الجودات المتاحة (فيديو + صوت مدمجين لتقليل الضغط)
                const formats = info.formats
                    .filter(f => (f.ext === 'mp4' || f.ext === 'm4a') && f.vcodec !== 'none')
                    .slice(-3);

                const keyboard = formats.map(f => [{
                    text: `🎥 فيديو (${f.resolution || f.format_note})`,
                    callback_data: `dl|${f.format_id}|${url}`
                }]);

                keyboard.push([{ text: "🎧 صوت MP3", callback_data: `audio|best|${url}` }]);

                bot.editMessageText(`✅ تم العثور على: *${info.title.substring(0, 45)}...*\nالمنصة: *${info.extractor_key}*\nإختر الجودة:`, {
                    chat_id: chatId, message_id: statusMsg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, "❌ خطأ في معالجة بيانات الرابط.");
            }
        });
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const [type, formatId, url] = query.data.split('|');
    const timestamp = Date.now();
    const output = path.join(downloadDir, `${timestamp}.%(ext)s`);

    bot.answerCallbackQuery(query.id);
    const downloadMsg = await bot.sendMessage(chatId, "📥 جاري التحميل والدمج من السيرفر الأصلي...");

    // أمر التحميل مع دمج الصوت التلقائي ليوتيوب
    let cmd = (type === 'dl') 
        ? `yt-dlp -f "${formatId}+bestaudio/best" --merge-output-format mp4 --cookies cookies.txt --user-agent "${UA}" -o "${output}" "${url}"`
        : `yt-dlp -x --audio-format mp3 --cookies cookies.txt --user-agent "${UA}" -o "${output}" "${url}"`;

    exec(cmd, (err) => {
        if (err) {
            return bot.editMessageText("❌ فشل التحميل. (قد يكون الملف > 50MB أو السيرفر محظور).", {
                chat_id: chatId, message_id: downloadMsg.message_id
            });
        }

        const files = fs.readdirSync(downloadDir);
        const downloadedFile = files.find(f => f.startsWith(String(timestamp)));

        if (downloadedFile) {
            const finalPath = path.join(downloadDir, downloadedFile);
            bot.editMessageText("📤 جاري الرفع لتليجرام... لحظات.", {
                chat_id: chatId, message_id: downloadMsg.message_id
            });

            const send = (type === 'dl') ? bot.sendVideo(chatId, finalPath) : bot.sendAudio(chatId, finalPath);

            send.then(() => {
                bot.deleteMessage(chatId, downloadMsg.message_id);
                if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
            }).catch(() => {
                bot.sendMessage(chatId, "❌ الملف مساحته كبيرة جداً (تليجرام يرفض الملفات فوق 50MB للبوتات).");
                if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
            });
        }
    });
});

function cleanup(filePath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

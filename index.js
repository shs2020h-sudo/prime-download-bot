const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text;

    if (url && url.startsWith('http')) {
        const statusMsg = await bot.sendMessage(chatId, "🔍 جاري فحص الرابط وفلترة الجودات...");

        // فحص الرابط مع استخدام الكوكيز ومهلة زمنية
        const checkCmd = `yt-dlp -j --no-warnings --cookies cookies.txt --socket-timeout 20 "${url}"`;

        exec(checkCmd, (error, stdout) => {
            if (error) {
                return bot.editMessageText("❌ فشل الفحص: الرابط محمي أو السيرفر محظور. جرب تيك توك للتأكد.", {
                    chat_id: chatId, message_id: statusMsg.message_id
                });
            }

            try {
                const info = JSON.parse(stdout);
                
                // فلترة أفضل 3 جودات MP4 (فيديو وصوت مدمجين) لتقليل الضغط
                const formats = info.formats
                    .filter(f => f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none')
                    .slice(-3);

                const keyboard = formats.map(f => [{
                    text: `🎥 فيديو (${f.resolution || f.format_note})`,
                    callback_data: `dl|${f.format_id}|${url}`
                }]);

                keyboard.push([{ text: "🎧 صوت MP3", callback_data: `audio|best|${url}` }]);

                bot.editMessageText(`✅ تم العثور على: *${info.title.substring(0, 40)}...*\nإختر النوع:`, {
                    chat_id: chatId, message_id: statusMsg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, "❌ خطأ في تحليل بيانات الرابط.");
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
    const downloadMsg = await bot.sendMessage(chatId, "📥 جاري السحب من السيرفر (ريلز/ستوري/فيديو)...");

    let cmd = (type === 'dl') 
        ? `yt-dlp -f "${formatId}" --cookies cookies.txt -o "${output}" "${url}"`
        : `yt-dlp -x --audio-format mp3 --cookies cookies.txt -o "${output}" "${url}"`;

    exec(cmd, (err) => {
        if (err) {
            return bot.editMessageText("❌ فشل التحميل. الحجم > 50MB أو السيرفر محظور.", {
                chat_id: chatId, message_id: downloadMsg.message_id
            });
        }

        const finalFile = fs.readdirSync(downloadDir).find(f => f.startsWith(String(timestamp)));
        if (finalFile) {
            const finalPath = path.join(downloadDir, finalFile);
            bot.editMessageText("📤 بيترفع دلوقتي لتليجرام...", {
                chat_id: chatId, message_id: downloadMsg.message_id
            });

            const send = (type === 'dl') ? bot.sendVideo(chatId, finalPath) : bot.sendAudio(chatId, finalPath);

            send.then(() => {
                bot.deleteMessage(chatId, downloadMsg.message_id);
                if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
            }).catch(() => {
                bot.sendMessage(chatId, "❌ حجم الملف أكبر من المسموح به (50MB).");
                if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
            });
        }
    });
});

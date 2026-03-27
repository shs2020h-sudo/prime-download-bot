const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

// 1️⃣ استقبال الرابط (يوتيوب، فيسبوك، إنستجرام، تيك توك، تويتر)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text;

    if (url && url.startsWith('http')) {
        bot.sendMessage(chatId, "🔍 جاري فحص الرابط (ستوري / ريلز / فيديو)...");

        // أمر yt-dlp لجلب البيانات مع دعم الكوكيز وتجاهل الأخطاء البسيطة
        const checkCmd = `yt-dlp -j --no-warnings --cookies cookies.txt "${url}"`;

        exec(checkCmd, (error, stdout) => {
            if (error) {
                return bot.sendMessage(chatId, "❌ فشل الوصول للمحتوى. تأكد أن الرابط عام (Public) وأن ملف cookies.txt مفعل.");
            }

            try {
                const info = JSON.parse(stdout);
                const title = info.title || "Video";
                
                // تصفية الجودات: نختار أفضل جودة MP4 أو جودات مدمجة
                let formats = info.formats
                    .filter(f => (f.vcodec !== 'none' && f.acodec !== 'none') || f.ext === 'mp4' || f.protocol === 'https')
                    .slice(-3); // نختار أهم 3 جودات لتسهيل الاختيار على الموبايل

                const keyboard = formats.map(f => [{
                    text: `🎥 ${f.resolution || f.format_note || 'Download'} (${f.ext})`,
                    callback_data: `dl|${f.format_id}|${url}`
                }]);

                // خيار الصوت لليوتيوب وتيك توك
                keyboard.push([{ text: "🎧 تحميل صوت (MP3)", callback_data: `audio|best|${url}` }]);

                bot.sendMessage(chatId, `✅ تم العثور على: *${title}*\nمن منصة: *${info.extractor_key}*\n\nإختر النوع:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, "❌ حدث خطأ في تحليل بيانات الرابط.");
            }
        });
    }
});

// 2️⃣ المعالجة والتحميل الفعلي
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const [type, formatId, url] = query.data.split('|');
    const timestamp = Date.now();
    const outputTemplate = path.join(downloadDir, `${timestamp}.%(ext)s`);

    bot.answerCallbackQuery(query.id, { text: "🚀 جاري التحميل والدمج..." });
    const statusMsg = await bot.sendMessage(chatId, "📥 جاري السحب من السيرفرات... لحظات.");

    let command = '';
    if (type === 'dl') {
        // الحل الشامل لدمج الصوت والفيديو في يوتيوب وتويتر
        command = `yt-dlp -f "${formatId}+bestaudio/best" --merge-output-format mp4 --cookies cookies.txt --no-warnings -o "${outputTemplate}" "${url}"`;
    } else {
        command = `yt-dlp -x --audio-format mp3 --cookies cookies.txt -o "${outputTemplate}" "${url}"`;
    }

    exec(command, (error) => {
        if (error) {
            return bot.editMessageText("❌ عذراً، تعذر التحميل. قد يكون الملف محمي أو حجمه يتخطى 50MB.", {
                chat_id: chatId, message_id: statusMsg.message_id
            });
        }

        const files = fs.readdirSync(downloadDir);
        const downloadedFile = files.find(f => f.startsWith(String(timestamp)));

        if (downloadedFile) {
            const finalPath = path.join(downloadDir, downloadedFile);
            bot.editMessageText("📤 اكتمل التحميل! جاري الرفع لتليجرام...", {
                chat_id: chatId, message_id: statusMsg.message_id
            });

            const sendOptions = { caption: "تم التحميل بنجاح ✅" };

            const action = (type === 'dl') 
                ? bot.sendVideo(chatId, finalPath, sendOptions) 
                : bot.sendAudio(chatId, finalPath, sendOptions);

            action.then(() => cleanup(finalPath))
                  .catch(() => bot.sendMessage(chatId, "❌ الملف جاهز على السيرفر لكنه كبير جداً على الرفع المباشر (أكبر من 50MB)."));
        }
    });
});

function cleanup(filePath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

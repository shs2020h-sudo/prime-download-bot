const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (text.includes("tiktok.com")) {
    bot.sendMessage(chatId, "⏳ جاري تحميل الفيديو...");

    const fileName = `video_${Date.now()}.mp4`;

    exec(`yt-dlp -o ${fileName} ${text}`, (err) => {
      if (err) {
        bot.sendMessage(chatId, "❌ حصل خطأ");
        return;
      }

      bot.sendVideo(chatId, fileName).then(() => {
        fs.unlinkSync(fileName); // يمسح الفيديو بعد الإرسال
      });
    });

  } else {
    bot.sendMessage(chatId,

const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const token = process.env.BOT_TOKEN; // مهم
const bot = new TelegramBot(token, { polling: true });

// رسالة البداية
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "ابعت لينك الفيديو وانا احملهولك 🔥");
});

// استقبال الرسائل
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (!url || !url.includes("http")) {
    return bot.sendMessage(chatId, "❌ ابعت لينك صحيح");
  }

  bot.sendMessage(chatId, "⏳ جاري تحميل الفيديو...");

  const file = `video_${Date.now()}.mp4`;

  exec(`yt-dlp -o ${file} ${url}`, (err) => {
    if (err) {
      return bot.sendMessage(chatId, "❌ حصل خطأ في التحميل");
    }

    bot.sendVideo(chatId, file).then(() => {
      fs.unlinkSync(file); // حذف بعد الإرسال
    });
  });
});

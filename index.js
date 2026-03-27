const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("BOT STARTED");

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (!url || !url.includes("http")) {
    return bot.sendMessage(chatId, "ابعت لينك بس 👇");
  }

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const file = `video_${Date.now()}.mp4`;

  exec(`yt-dlp -f best -o "${file}" "${url}"`, (err) => {
    if (err) {
      console.log(err);
      return bot.sendMessage(chatId, "❌ حصل خطأ");
    }

    bot.sendVideo(chatId, file)
      .then(() => fs.unlinkSync(file))
      .catch(() => bot.sendMessage(chatId, "❌ الفيديو كبير"));
  });
});

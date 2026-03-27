const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// حل 409
bot.deleteWebHook({ drop_pending_updates: true }).then(() => {
  bot.startPolling();
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (!url || !url.includes("http")) {
    return bot.sendMessage(chatId, "ابعت لينك بس");
  }

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const file = `video_${Date.now()}.mp4`;

  exec(`yt-dlp -o "${file}" "${url}"`, (err) => {
    if (err) {
      return bot.sendMessage(chatId, "❌ التحميل فشل");
    }

    bot.sendVideo(chatId, file)
      .then(() => fs.unlinkSync(file))
      .catch(() => bot.sendMessage(chatId, "❌ الفيديو كبير"));
  });
});

const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN);

// 🔥 تنظيف أي جلسة قديمة
bot.deleteWebHook().then(() => {
  bot.startPolling();
});

console.log("BOT STARTED");

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (!url || !url.includes("http")) {
    return bot.sendMessage(chatId, "ابعت لينك فيديو بس 👇");
  }

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const fixedUrl = url.replace("vm.tiktok.com", "www.tiktok.com");
  const file = `video_${Date.now()}.mp4`;

  exec(`yt-dlp -f "bv*+ba/best" --no-playlist -o "${file}" "${fixedUrl}"`, (err, stdout, stderr) => {
    if (err) {
      console.log(stderr);
      return bot.sendMessage(chatId, "❌ فشل التحميل");
    }

    bot.sendVideo(chatId, file)
      .then(() => fs.unlinkSync(file))
      .catch(() => bot.sendMessage(chatId, "❌ الفيديو كبير"));
  });
});

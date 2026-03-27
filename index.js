const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN);

// 🔥 حل مشكلة 409 نهائي
bot.deleteWebHook({ drop_pending_updates: true }).then(() => {
  bot.startPolling({
    params: { timeout: 10 }
  });
});

console.log("BOT STARTED");

// استقبال أي رسالة
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (!url || !url.includes("http")) {
    return bot.sendMessage(chatId, "ابعت لينك فيديو بس 👇");
  }

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  // تصليح لينكات تيك توك
  let fixedUrl = url
    .replace("vm.tiktok.com", "www.tiktok.com")
    .replace("vt.tiktok.com", "www.tiktok.com");

  const file = `video_${Date.now()}.mp4`;

  // تحميل من كل المنصات
  exec(`yt-dlp -f "bv*+ba/best" --no-playlist -o "${file}" "${fixedUrl}"`, (err, stdout, stderr) => {

    if (err) {
      console.log(stderr);
      return bot.sendMessage(chatId, "❌ حصل خطأ في التحميل");
    }

    bot.sendVideo(chatId, file)
      .then(() => {
        fs.unlinkSync(file);
      })
      .catch(() => {
        bot.sendMessage(chatId, "❌ الفيديو كبير أو حصل خطأ");
      });
  });
});

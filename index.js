const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || !text.startsWith("http")) {
    return bot.sendMessage(chatId, "ابعت لينك صحيح 😅");
  }

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const file = `video_${Date.now()}.mp4`;

  const command = `yt-dlp -f "best[height<=720]" --merge-output-format mp4 "${text}" -o "${file}"`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.log(stderr);
      return bot.sendMessage(chatId, "❌ حصل خطأ في التحميل");
    }

    try {
      const stats = fs.statSync(file);

      // لو الفيديو كبير
      if (stats.size > 49 * 1024 * 1024) {
        await bot.sendMessage(chatId, "⚠️ الفيديو كبير... هبعت صوت بس");

        const audioFile = file.replace(".mp4", ".mp3");

        exec(`yt-dlp -x --audio-format mp3 "${text}" -o "${audioFile}"`, async () => {
          await bot.sendAudio(chatId, audioFile);
          fs.unlinkSync(audioFile);
        });

        fs.unlinkSync(file);
        return;
      }

      await bot.sendVideo(chatId, file);
      fs.unlinkSync(file);

    } catch (err) {
      console.log(err);
      bot.sendMessage(chatId, "❌ حصل خطأ بعد التحميل");
    }
  });
});

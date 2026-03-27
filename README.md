const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const token = "8468827766:AAFpR_Boe3AHOv1-GTQcpfokRtX8YX84dD8";
const bot = new TelegramBot(token, { polling: true });

// رسالة البداية
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔥 ابعت لينك الفيديو وأنا هحملهولك\n🎬 أو اختار MP3");
});

// استقبال اللينك
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (!url || !url.includes("http")) {
    return bot.sendMessage(chatId, "❌ ابعت لينك صحيح");
  }

  bot.sendMessage(chatId, "⏳ جاري تحليل الفيديو...");

  try {
    exec(`yt-dlp --get-title "${url}"`, (err, stdout) => {
      if (err) {
        return bot.sendMessage(chatId, "❌ مش قادر أقرأ الفيديو");
      }

      const title = stdout.trim();

      bot.sendMessage(chatId, `🎬 ${title}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🎬 HD", callback_data: `video|hd|${url}` },
              { text: "📱 SD", callback_data: `video|sd|${url}` }
            ],
            [
              { text: "🎧 MP3", callback_data: `audio|mp3|${url}` }
            ]
          ]
        }
      });
    });

  } catch {
    bot.sendMessage(chatId, "❌ حصل خطأ");
  }
});

// التعامل مع الأزرار
bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const [type, quality, url] = q.data.split("|");

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const fileName = `file_${Date.now()}`;
  const videoPath = path.join(__dirname, fileName + ".mp4");
  const audioPath = path.join(__dirname, fileName + ".mp3");

  try {
    if (type === "video") {
      let format = "best";

      if (quality === "sd") {
        format = "best[height<=720]";
      }

      exec(`yt-dlp -f "${format}" -o "${videoPath}" "${url}"`, async (err) => {
        if (err) {
          return bot.sendMessage(chatId, "❌ فشل التحميل");
        }

        await bot.sendVideo(chatId, videoPath);
        fs.unlinkSync(videoPath);
      });

    } else if (type === "audio") {

      exec(`yt-dlp -x --audio-format mp3 -o "${audioPath}" "${url}"`, async (err) => {
        if (err) {
          return bot.sendMessage(chatId, "❌ فشل التحميل");
        }

        await bot.sendAudio(chatId, audioPath);
        fs.unlinkSync(audioPath);
      });
    }

  } catch {
    bot.sendMessage(chatId, "❌ حصل خطأ");
  }
});

console.log("🔥 Bot is running...");

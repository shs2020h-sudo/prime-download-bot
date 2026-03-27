const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let userData = {};

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (text.includes("http")) {
    userData[chatId] = { url: text };

    bot.sendMessage(chatId, "اختار نوع التحميل 👇", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎥 فيديو", callback_data: "video" }],
          [{ text: "🎧 صوت", callback_data: "audio" }],
        ],
      },
    });
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!userData[chatId]) return;

  const url = userData[chatId].url;

  // اختيار صوت
  if (data === "audio") {
    bot.sendMessage(chatId, "⏳ جاري تحميل الصوت...");

    exec(`yt-dlp -x --audio-format mp3 "${url}" -o "audio.%(ext)s"`, (err) => {
      if (err) return bot.sendMessage(chatId, "❌ حصل خطأ");

      bot.sendAudio(chatId, fs.createReadStream("audio.mp3")).then(() => {
        fs.unlinkSync("audio.mp3");
      });
    });
  }

  // اختيار فيديو -> نجيب الجودات
  if (data === "video") {
    exec(`yt-dlp -F "${url}"`, (err, stdout) => {
      if (err) return bot.sendMessage(chatId, "❌ مش قادر يجيب الجودات");

      let qualities = [];

      stdout.split("\n").forEach((line) => {
        if (line.includes("mp4") && line.includes("x")) {
          const parts = line.trim().split(/\s+/);
          qualities.push(parts[0]);
        }
      });

      qualities = qualities.slice(0, 3); // نعرض 3 بس

      let buttons = qualities.map((q) => [
        { text: `🎬 ${q}`, callback_data: "q_" + q },
      ]);

      bot.sendMessage(chatId, "اختار الجودة 👇", {
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    });
  }

  // تحميل بالجودة المختارة
  if (data.startsWith("q_")) {
    const quality = data.split("_")[1];

    bot.sendMessage(chatId, "⏳ جاري التحميل...");

    exec(
      `yt-dlp -f ${quality}+bestaudio "${url}" -o "video.mp4"`,
      (err) => {
        if (err) return bot.sendMessage(chatId, "❌ فشل التحميل");

        bot.sendVideo(chatId, fs.createReadStream("video.mp4")).then(() => {
          fs.unlinkSync("video.mp4");
        });
      }
    );
  }
});

const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// حل مشكلة 409
bot.deleteWebHook({ drop_pending_updates: true }).then(() => {
  bot.startPolling();
});

let userState = {};

console.log("BOT STARTED");

// استقبال اللينك
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (text.includes("http")) {
    userState[chatId] = { url: text };

    return bot.sendMessage(chatId, "اختار 👇", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎥 فيديو", callback_data: "video" },
            { text: "🎧 صوت", callback_data: "audio" }
          ]
        ]
      }
    });
  }
});

// الأزرار
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!userState[chatId]) return;

  // اختيار النوع
  if (data === "video" || data === "audio") {
    userState[chatId].type = data;

    if (data === "video") {
      return bot.sendMessage(chatId, "اختار الجودة 👇", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔥 720p", callback_data: "720" }],
            [{ text: "⚖️ 480p", callback_data: "480" }],
            [{ text: "📉 360p", callback_data: "360" }]
          ]
        }
      });
    } else {
      return download(chatId);
    }
  }

  // اختيار الجودة
  if (["720", "480", "360"].includes(data)) {
    userState[chatId].quality = data;
    return download(chatId);
  }
});

// التحميل
function download(chatId) {
  const { url, type, quality } = userState[chatId];

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const file = `video_${Date.now()}.mp4`;

  let command;

  // 💣 TikTok بدون علامة مائية
  if (url.includes("tiktok.com") && type === "video") {
    command = `yt-dlp -f "bestvideo[height<=${quality}]+bestaudio/best" --merge-output-format mp4 --no-playlist -o "${file}" "${url}"`;
  }

  // فيديو عادي
  else if (type === "video") {
    command = `yt-dlp -f "bestvideo[height<=${quality}]+bestaudio/best" -o "temp.mp4" "${url}" && ffmpeg -i temp.mp4 -vcodec libx264 -crf 28 "${file}"`;
  }

  // صوت
  else {
    command = `yt-dlp -x --audio-format mp3 -o "${file}" "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.log(err);
      return bot.sendMessage(chatId, "❌ حصل خطأ");
    }

    if (type === "video") {
      bot.sendVideo(chatId, file).then(() => cleanup(file));
    } else {
      bot.sendAudio(chatId, file).then(() => cleanup(file));
    }
  });
}

// تنظيف
function cleanup(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
  if (fs.existsSync("temp.mp4")) fs.unlinkSync("temp.mp4");
}

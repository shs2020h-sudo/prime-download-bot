const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("Bot is running...");

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  try {
    let videoUrl = null;

    // TikTok
    if (text.includes("tiktok.com")) {
      const res = await axios.get(`https://tikwm.com/api/?url=${text}`);
      videoUrl = res.data.data.play;
    }

    // YouTube
    else if (text.includes("youtube.com") || text.includes("youtu.be")) {
      const res = await axios.get(`https://api.vevioz.com/api/button/mp4?url=${text}`);
      videoUrl = text; // fallback (لينك مباشر لو API فشل)
    }

    // Facebook
    else if (text.includes("facebook.com")) {
      const res = await axios.get(`https://api.fdown.net/download?url=${text}`);
      videoUrl = text;
    }

    // Twitter / X
    else if (text.includes("twitter.com") || text.includes("x.com")) {
      const res = await axios.get(`https://twitsave.com/info?url=${text}`);
      videoUrl = text;
    }

    if (videoUrl) {
      await bot.sendVideo(chatId, videoUrl, {
        caption: "🔥 تم التحميل"
      });
    } else {
      bot.sendMessage(chatId, "❌ اللينك مش مدعوم");
    }

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, "❌ حصل خطأ أثناء التحميل");
  }
});

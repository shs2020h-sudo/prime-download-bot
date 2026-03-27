const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (text.includes("tiktok.com")) {
    bot.sendMessage(chatId, "جاري تحميل الفيديو... ⏳");
  } else {
    bot.sendMessage(chatId, "ابعت لينك تيك توك بس 👇");
  }
});

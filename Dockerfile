FROM node:18-slim

# تثبيت الأدوات الأساسية مع التحديث
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# تثبيت yt-dlp وتحديثه لأخر نسخة
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# تحديث yt-dlp عند كل تشغيل للسيرفر لملاحقة حماية يوتيوب
RUN yt-dlp -U

CMD ["node", "index.js"]

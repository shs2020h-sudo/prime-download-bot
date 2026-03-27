# استخدم نسخة Node.js مستقرة
FROM node:18-slim

# تثبيت الأدوات الأساسية: python3 و ffmpeg و curl
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# تثبيت أحدث نسخة من yt-dlp وتجهيزها للعمل
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# تحديد مجلد العمل
WORKDIR /app

# نسخ ملفات المشروع تثبيت المكتبات
COPY package*.json ./
RUN npm install

# نسخ باقي ملفات المشروع (تأكد إن cookies.txt موجود معاهم)
COPY . .

# تشغيل البوت
CMD ["node", "index.js"]

FROM node:18-slim
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg curl
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# سطر سحري لتحديث المحرك عند كل تشغيل
RUN yt-dlp -U
CMD ["node", "index.js"]

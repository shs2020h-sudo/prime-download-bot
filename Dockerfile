FROM node:18

RUN apt-get update && apt-get install -y python3 ffmpeg curl
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "index.js"]

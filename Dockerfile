FROM node:18

RUN apt update && apt install -y ffmpeg curl python3
RUN curl -L https://yt-dlp.org/downloads/latest/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY . .

RUN npm install

CMD ["npm", "start"]

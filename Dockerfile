FROM node:18

RUN apt update && apt install -y ffmpeg python3-pip
RUN pip3 install yt-dlp

WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "index.js"]

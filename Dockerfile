FROM node:18

RUN apt update && apt install -y ffmpeg python3 python3-pip

# الحل هنا 👇
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "index.js"]

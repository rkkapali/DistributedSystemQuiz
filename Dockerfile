FROM node:18 
WORKDIR /usr/src/app 
COPY package*.json ./ 
RUN npm install amqplib mysql2 dotenv
COPY etl.js . 
CMD ["node", "etl.js"] 

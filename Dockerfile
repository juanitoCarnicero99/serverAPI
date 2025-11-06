FROM node:18-alpine

# Instalar dependencias necesarias para compilar bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Instalar y reconstruir bcrypt para Alpine Linux
RUN npm install --production && npm rebuild bcrypt --build-from-source

COPY . .

EXPOSE $PORT

CMD ["node", "index.js"]

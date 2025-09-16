# Use Node 18 LTS
FROM node:18-alpine

WORKDIR /app

# Install deps (cache package files first)
COPY package*.json ./
# If you want reproducible installs use npm ci
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 8000

# Adjust to your start script (index.js or npm start)
CMD ["node", "dist/index.js"]


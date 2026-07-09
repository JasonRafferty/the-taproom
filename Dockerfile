FROM node:22-alpine AS app
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npm run build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start"]

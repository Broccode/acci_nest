FROM oven/bun:1.0-alpine

WORKDIR /app

COPY src/backend/package*.json ./

RUN bun install

COPY src/backend .

EXPOSE 3001

CMD ["bun", "run", "start:dev"] 
FROM oven/bun:1.0-alpine

WORKDIR /app

COPY src/frontend/package*.json ./

RUN bun install

COPY src/frontend .

EXPOSE 3000

CMD ["bun", "run", "start"] 
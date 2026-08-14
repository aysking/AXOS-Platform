import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "axos-api",
    environment: process.env.NODE_ENV ?? "development",
  };
});

const port = Number(process.env.API_PORT ?? 3000);

try {
  await app.listen({
    port,
    host: "0.0.0.0",
  });

  console.log(`AXOS API running on http://localhost:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
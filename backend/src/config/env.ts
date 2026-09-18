export const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 33060),
    user: process.env.DB_USER ?? "app_user",
    password: process.env.DB_PASSWORD ?? "app_password",
    database: process.env.DB_NAME ?? "app_db",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "local-dev-secret",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  },
};

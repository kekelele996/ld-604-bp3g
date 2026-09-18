export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "local-dev-secret",
  /**
   * DB_DRIVER:
   * - prisma  生产：MySQL 8（Docker Compose 默认）
   * - memory  本地评审/测试：内存事务网关，行为与 MySQL 条件更新一致
   */
  dbDriver: (process.env.DB_DRIVER ?? "memory") as "prisma" | "memory",
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? "app_db",
    user: process.env.DB_USER ?? "app_user",
    password: process.env.DB_PASSWORD ?? "app_password",
    get url(): string {
      return (
        process.env.DATABASE_URL ??
        `mysql://${this.user}:${encodeURIComponent(this.password)}@${this.host}:${this.port}/${this.name}`
      );
    }
  },
  rateLimit: {
    /** 每窗口最大请求数 */
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
    /** 窗口毫秒数 */
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
  }
};

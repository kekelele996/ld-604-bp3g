import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { getDataGateway } from "./database/gatewayFactory";
import { seedDatabase } from "./seed";
import { authMiddleware } from "./middlewares/authMiddleware";
import { auditLogMiddleware } from "./middlewares/auditLogMiddleware";
import { requestLoggerMiddleware } from "./middlewares/requestLoggerMiddleware";
import { rateLimitMiddleware } from "./middlewares/rateLimitMiddleware";
import { errorHandlerMiddleware } from "./middlewares/errorHandlerMiddleware";
import authRoutes from "./routes/AuthRoutes";
import gridAssetRoutes from "./routes/GridAssetRoutes";
import faultReportRoutes from "./routes/FaultReportRoutes";
import repairTicketRoutes from "./routes/RepairTicketRoutes";
import crewRoutes from "./routes/CrewRoutes";
import sparePartUsageRoutes from "./routes/SparePartUsageRoutes";

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(requestLoggerMiddleware);
  app.use(rateLimitMiddleware);

  // 健康检查不需要鉴权；同时上报持久化驱动，便于编排判断
  app.get("/health", async (_req, res) => {
    res.json({ status: "ok", service: "grid-repair", dbDriver: config.dbDriver });
  });

  app.use("/api/auth", authRoutes);

  // 业务接口统一鉴权
  app.use("/api", authMiddleware);
  app.use("/api", auditLogMiddleware);
  app.use("/api/grid-asset", gridAssetRoutes);
  app.use("/api/fault-report", faultReportRoutes);
  app.use("/api/repair-ticket", repairTicketRoutes);
  app.use("/api/crew", crewRoutes);
  app.use("/api/spare-part-usage", sparePartUsageRoutes);

  app.use(errorHandlerMiddleware);

  // 持久化就绪后幂等播种；MySQL 未就绪时 Prisma 适配器会在此抛错并退出（由 compose 重启）
  const gateway = getDataGateway();
  await gateway.ensureReady();
  await seedDatabase(gateway);

  app.listen(config.port, () => {
    console.log(`grid-repair backend listening on ${config.port} (dbDriver=${config.dbDriver})`);
  });
}

bootstrap().catch((err) => {
  console.error("bootstrap failed", err);
  process.exit(1);
});

import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { waitForDatabase, pool } from "./config/database";
import { authMiddleware } from "./middlewares/authMiddleware";
import { auditLogMiddleware } from "./middlewares/auditLogMiddleware";
import { requestLoggerMiddleware } from "./middlewares/requestLoggerMiddleware";
import { rateLimitMiddleware } from "./middlewares/rateLimitMiddleware";
import { errorHandlerMiddleware } from "./middlewares/errorHandlerMiddleware";
import authRoutes from "./routes/AuthRoutes";
import dashboardRoutes from "./routes/DashboardRoutes";
import gridAssetRoutes from "./routes/GridAssetRoutes";
import faultReportRoutes from "./routes/FaultReportRoutes";
import repairTicketRoutes from "./routes/RepairTicketRoutes";
import crewRoutes from "./routes/CrewRoutes";
import sparePartUsageRoutes from "./routes/SparePartUsageRoutes";

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(rateLimitMiddleware);
app.use(authMiddleware);
app.use(auditLogMiddleware);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "grid-repair", db: "up" });
  } catch {
    res.status(503).json({ status: "degraded", service: "grid-repair", db: "down" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/grid-asset", gridAssetRoutes);
app.use("/api/fault-report", faultReportRoutes);
app.use("/api/repair-ticket", repairTicketRoutes);
app.use("/api/crew", crewRoutes);
app.use("/api/spare-part-usage", sparePartUsageRoutes);

app.use(errorHandlerMiddleware);

async function bootstrap(): Promise<void> {
  // Docker 启动时 db 可能尚未 ready，等待 healthcheck 通过期间不断重试
  await waitForDatabase();
  app.listen(config.port, () => {
    console.log(`grid-repair backend listening on ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("failed to bootstrap backend", err);
  process.exit(1);
});

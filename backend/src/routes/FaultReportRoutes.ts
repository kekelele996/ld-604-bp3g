import { Router } from "express";
import { faultReportController } from "../controllers/FaultReportController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(faultReportController.list));
router.get("/:id", asyncHandler(faultReportController.detail));

// 登记报修：调度员/班组长（亦可开放给热线坐席，这里统一为调度员）
router.post("/", rbacMiddleware(["DISPATCHER", "LEADER"]), asyncHandler(faultReportController.create));

// 合并重复报修、生成工单：调度员
router.post("/:id/merge", rbacMiddleware(["DISPATCHER"]), asyncHandler(faultReportController.merge));
router.post("/:id/create-ticket", rbacMiddleware(["DISPATCHER"]), asyncHandler(faultReportController.createTicket));

export default router;

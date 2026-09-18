import { Router } from "express";
import { repairTicketController } from "../controllers/RepairTicketController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// 工单查询：所有登录角色
router.get("/", asyncHandler(repairTicketController.list));
router.get("/:id", asyncHandler(repairTicketController.detail));

// 派工 / 派工并领用备件：仅调度员
router.post("/:id/dispatch", rbacMiddleware(["DISPATCHER"]), asyncHandler(repairTicketController.dispatch));
router.post("/:id/dispatch-with-parts", rbacMiddleware(["DISPATCHER"]), asyncHandler(repairTicketController.dispatchWithParts));

// 到场/抢修/复电/关闭推进：调度员、班组长
router.post("/:id/transition", rbacMiddleware(["DISPATCHER", "LEADER"]), asyncHandler(repairTicketController.advance));

// 接单后申请备件：班组长
router.post("/:id/parts", rbacMiddleware(["LEADER", "DISPATCHER"]), asyncHandler(repairTicketController.applyPart));

export default router;

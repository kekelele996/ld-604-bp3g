import { Router } from "express";
import { repairTicketController } from "../controllers/RepairTicketController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";

/**
 * 抢修工单路由（RBAC 触达）：
 * - 派工/生成工单：调度员
 * - 到场/抢修/复电/关闭：班组长（实际接单人）
 */
const router = Router();

router.get("/", repairTicketController.list);
router.get("/:id", repairTicketController.detail);
router.get("/:id/timeline", repairTicketController.timeline);

router.post("/from-fault", rbacMiddleware(["DISPATCHER"]), repairTicketController.createFromFault);
router.post("/:id/dispatch", rbacMiddleware(["DISPATCHER"]), repairTicketController.dispatch);
router.post("/:id/arrive", rbacMiddleware(["CREW_LEADER"]), repairTicketController.arrive);
router.post("/:id/repair", rbacMiddleware(["CREW_LEADER"]), repairTicketController.repair);
router.post("/:id/restore", rbacMiddleware(["CREW_LEADER", "DISPATCHER"]), repairTicketController.restore);
router.post("/:id/close", rbacMiddleware(["DISPATCHER"]), repairTicketController.close);

export default router;

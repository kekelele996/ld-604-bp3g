import { Router } from "express";
import { crewController } from "../controllers/CrewController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// 派工面板需要按故障类型筛选可接单班组，所有登录角色可查
router.get("/", asyncHandler(crewController.list));
router.get("/:id", asyncHandler(crewController.detail));

// 班组维护、值班切换：调度员
router.post("/", rbacMiddleware(["DISPATCHER"]), asyncHandler(crewController.create));
router.patch("/:id/duty", rbacMiddleware(["DISPATCHER", "LEADER"]), asyncHandler(crewController.setDutyStatus));

export default router;

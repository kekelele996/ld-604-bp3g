import { Router } from "express";
import { sparePartUsageController } from "../controllers/SparePartUsageController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// 领用记录、备件目录、库存流水：登录角色可查；审计员也据此核对
router.get("/", asyncHandler(sparePartUsageController.list));
router.get("/catalog/list", asyncHandler(sparePartUsageController.listParts));
router.get("/inventory/transactions", rbacMiddleware(["WAREHOUSE", "AUDITOR", "DISPATCHER"]), asyncHandler(sparePartUsageController.listTransactions));
router.post("/catalog", rbacMiddleware(["WAREHOUSE"]), asyncHandler(sparePartUsageController.createPart));

// 审批/驳回：仅仓管
router.post("/:id/approve", rbacMiddleware(["WAREHOUSE"]), asyncHandler(sparePartUsageController.approve));
router.post("/:id/reject", rbacMiddleware(["WAREHOUSE"]), asyncHandler(sparePartUsageController.reject));

// 归还入库：班组长 / 仓管
router.post("/:id/return", rbacMiddleware(["LEADER", "WAREHOUSE"]), asyncHandler(sparePartUsageController.returnPart));

export default router;

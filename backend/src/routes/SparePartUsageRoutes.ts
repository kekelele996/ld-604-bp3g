import { Router } from "express";
import { sparePartUsageController } from "../controllers/SparePartUsageController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";

/** 备件路由：审批/驳回仅仓管；库存与流水只读开放给审计员等角色 */
const router = Router();

router.get("/parts", sparePartUsageController.listParts);
router.get("/usages", sparePartUsageController.listUsages);
router.get("/inventory-transactions", sparePartUsageController.listInventoryTransactions);
router.post("/usages/:id/review", rbacMiddleware(["WAREHOUSE"]), sparePartUsageController.review);

export default router;

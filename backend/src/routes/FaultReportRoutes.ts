import { Router } from "express";
import { faultReportController } from "../controllers/FaultReportController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";

const router = Router();

router.get("/", faultReportController.list);
router.post("/", rbacMiddleware(["DISPATCHER", "CREW_LEADER"]), faultReportController.register);

export default router;

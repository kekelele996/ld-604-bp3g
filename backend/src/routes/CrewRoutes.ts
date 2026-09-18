import { Router } from "express";
import { crewController } from "../controllers/CrewController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";

const router = Router();

router.get("/", crewController.list);
router.post("/:id/duty", rbacMiddleware(["DISPATCHER"]), crewController.toggleDuty);

export default router;

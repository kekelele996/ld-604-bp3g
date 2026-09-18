import { Router } from "express";
import { gridAssetController } from "../controllers/GridAssetController";
import { rbacMiddleware } from "../middlewares/rbacMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(gridAssetController.list));
router.get("/feeder-lines", asyncHandler(gridAssetController.feederLines));
router.post("/", rbacMiddleware(["DISPATCHER"]), asyncHandler(gridAssetController.create));
router.patch("/:id/health", rbacMiddleware(["DISPATCHER", "LEADER"]), asyncHandler(gridAssetController.updateHealthStatus));

export default router;

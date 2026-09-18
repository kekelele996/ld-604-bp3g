import { Router } from "express";
import { dashboardController } from "../controllers/DashboardController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.get("/overview", asyncHandler(dashboardController.overview));
export default router;

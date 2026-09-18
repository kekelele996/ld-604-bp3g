import { Router } from "express";
import { authController } from "../controllers/AuthController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/login", asyncHandler(authController.login));
router.get("/me", asyncHandler(authController.me));

export default router;

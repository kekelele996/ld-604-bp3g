import { Router } from "express";
import { gridAssetController } from "../controllers/GridAssetController";

const router = Router();

router.get("/", gridAssetController.list);
router.get("/:id", gridAssetController.detail);

export default router;

import { gridAssetRepository } from "../repositories/GridAssetRepository";

/** 配网资产台账（只读闭环所需） */
export const gridAssetService = {
  list() {
    return gridAssetRepository.findAll();
  },
  detail(id: number) {
    return gridAssetRepository.findById(id);
  }
};

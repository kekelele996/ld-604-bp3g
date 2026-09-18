import { gridAssetRepository } from "../repositories/GridAssetRepository";
import { writeAudit } from "./AuditService";
import { BusinessError, notFound } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { AssetHealthStatus } from "../constants/AssetHealthStatus";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import type { AuthUser } from "../types/express";

export const gridAssetService = {
  async list(feederLine?: string, healthStatus?: string) {
    return gridAssetRepository.findAll(feederLine, healthStatus);
  },

  async listFeederLines() {
    return gridAssetRepository.listFeederLines();
  },

  async create(data: {
    asset_code: string;
    asset_type: string;
    feeder_line: string;
    voltage_level: string;
    location_desc?: string;
    health_status?: string;
    owner_team_id?: number | null;
  }, user: AuthUser) {
    if (!data.asset_code || !data.asset_type || !data.feeder_line || !data.voltage_level) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "asset_code/asset_type/feeder_line/voltage_level" });
    }
    const health = data.health_status ?? "NORMAL";
    if (!AssetHealthStatus.includes(health as (typeof AssetHealthStatus)[number])) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "health_status", value: health });
    }
    const id = await gridAssetRepository.create({
      asset_code: data.asset_code,
      asset_type: data.asset_type,
      feeder_line: data.feeder_line,
      voltage_level: data.voltage_level,
      location_desc: data.location_desc ?? null,
      health_status: health,
      owner_team_id: data.owner_team_id ?? null,
    });
    const { action, message } = renderLogTemplate(LOG_TEMPLATES.GridAsset.create, {
      asset_code: data.asset_code,
      asset_type: data.asset_type,
      feeder_line: data.feeder_line,
    });
    await writeAudit({ actor: user, action, targetType: "GridAsset", targetId: id, detail: message });
    const created = await gridAssetRepository.findById(id);
    if (!created) throw notFound("GridAsset", id);
    return created;
  },

  async updateHealthStatus(id: number, toStatus: string, user: AuthUser) {
    if (!AssetHealthStatus.includes(toStatus as (typeof AssetHealthStatus)[number])) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "health_status", value: toStatus });
    }
    const asset = await gridAssetRepository.findById(id);
    if (!asset) throw notFound("GridAsset", id);
    await gridAssetRepository.updateHealthStatus(id, toStatus);
    const { action, message } = renderLogTemplate(LOG_TEMPLATES.GridAsset.status, {
      asset_code: asset.asset_code,
      from_status: asset.health_status,
      to_status: toStatus,
    });
    await writeAudit({ actor: user, action, targetType: "GridAsset", targetId: id, detail: message });
    const updated = await gridAssetRepository.findById(id);
    if (!updated) throw notFound("GridAsset", id);
    return updated;
  },
};

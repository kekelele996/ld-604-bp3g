import { sparePartRepository } from "../repositories/SparePartRepository";
import { inventoryTransactionRepository } from "../repositories/InventoryTransactionRepository";
import { writeAudit } from "./AuditService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { AuthUser } from "../types/express";

export const sparePartService = {
  async list() {
    return sparePartRepository.findAll();
  },

  async listTransactions(partCode?: string) {
    return inventoryTransactionRepository.findAll(partCode);
  },

  async create(data: { part_code: string; part_name: string; warehouse_name?: string; stock?: number; safety_stock?: number }, user: AuthUser) {
    if (!data.part_code || !data.part_name) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "part_code/part_name" });
    }
    const stock = data.stock ?? 0;
    if (!Number.isInteger(stock) || stock < 0) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "stock" });
    }
    await sparePartRepository.create({
      part_code: data.part_code,
      part_name: data.part_name,
      warehouse_name: data.warehouse_name ?? "中心仓库",
      stock,
      safety_stock: data.safety_stock ?? 0,
    });
    await writeAudit({
      actor: user,
      action: LOG_TEMPLATES.InventoryTransaction.inbound.action,
      targetType: "SparePart",
      targetId: data.part_code,
      detail: `新装备料目录 ${data.part_code}，期初库存 ${stock}`,
    });
    return sparePartRepository.findByCodeUnlocked(data.part_code);
  },
};

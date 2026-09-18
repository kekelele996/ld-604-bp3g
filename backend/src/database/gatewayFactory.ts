import { config } from "../config/env";
import type { DataGateway } from "./DataGateway";
import { InMemoryDataGateway } from "./InMemoryDataGateway";
import { PrismaDataGateway } from "./PrismaDataGateway";

let cached: DataGateway | null = null;

/**
 * 统一数据访问入口。Service / Repository 只面向 DataGateway 接口编程，
 * 切换 MySQL 与内存实现不需要改动业务代码。
 */
export function getDataGateway(): DataGateway {
  if (cached) return cached;
  cached = config.dbDriver === "prisma" ? new PrismaDataGateway(config.db.url) : new InMemoryDataGateway();
  return cached;
}

/** 测试与种子脚本可显式注入网关 */
export function setDataGateway(gateway: DataGateway): void {
  cached = gateway;
}

import { getDataGateway } from "../database/gatewayFactory";
import type { GridAssetRow } from "../database/types";
import type { UnitOfWork } from "../database/DataGateway";

/** 配网资产数据访问层；只读查询走网关，写操作只允许出现在事务内 */
export const gridAssetRepository = {
  findAll(uow?: UnitOfWork): Promise<GridAssetRow[]> {
    return (uow ?? getDataGateway()).findAssets();
  },
  findById(id: number, uow?: UnitOfWork): Promise<GridAssetRow | null> {
    return (uow ?? getDataGateway()).findAssetById(id);
  }
};

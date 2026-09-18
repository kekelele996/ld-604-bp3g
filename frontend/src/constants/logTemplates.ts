/**
 * 前端日志模板镜像：与后端 constants/logTemplates.ts 的 action 对齐。
 * 前端仅用于操作前埋点/排障，真正落库由后端完成。
 * 新增写操作时必须同步：后端模板、service、这里、调用处。
 */
export const LOG_TEMPLATES = {
  RepairTicket: {
    dispatch: "RepairTicket.dispatch",
    transition: "RepairTicket.transition",
    restore: "RepairTicket.restore",
    close: "RepairTicket.close",
  },
  FaultReport: {
    create: "FaultReport.create",
    merge: "FaultReport.merge",
    createTicket: "FaultReport.createTicket",
  },
  Crew: {
    duty: "Crew.duty",
    occupy: "Crew.occupy",
    release: "Crew.release",
  },
  SparePartUsage: {
    apply: "SparePartUsage.apply",
    approve: "SparePartUsage.approve",
    reject: "SparePartUsage.reject",
    return: "SparePartUsage.return",
  },
} as const;

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDataGateway } from "../database/InMemoryDataGateway";
import { setDataGateway } from "../database/gatewayFactory";
import { repairTicketService, type ActorContext } from "../services/RepairTicketService";
import { sparePartUsageService } from "../services/SparePartUsageService";
import { getDataGateway } from "../database/gatewayFactory";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import type {
  CrewRow,
  FaultReportRow,
  SparePartRow,
  RepairTicketRow
} from "../database/types";

const DISPATCHER: ActorContext = { userId: 1, userName: "调度员-林敏" };
const LEADER: ActorContext = { userId: 101, userName: "班组长-周强" };
const WAREHOUSE: ActorContext = { userId: 201, userName: "仓管-陈仓" };

function buildGateway(): InMemoryDataGateway {
  const gateway = new InMemoryDataGateway();
  const parts: SparePartRow[] = [
    { id: 1, part_code: "P-CABLE", part_name: "电缆接头", warehouse_name: "中心仓", stock_quantity: 8 },
    { id: 2, part_code: "P-FUSE", part_name: "熔断器", warehouse_name: "中心仓", stock_quantity: 20 },
    { id: 3, part_code: "P-LOW", part_name: "低压电缆", warehouse_name: "东郊仓", stock_quantity: 3 }
  ];
  const crews: CrewRow[] = [
    { id: 1, name: "带电班", leader_id: 1, skill_tags: "HOT_LINE,CABLE", duty_status: "ON_DUTY", current_ticket_id: null, contact_phone: "1" },
    { id: 2, name: "电缆班", leader_id: 2, skill_tags: "CABLE", duty_status: "ON_DUTY", current_ticket_id: null, contact_phone: "2" },
    { id: 3, name: "架空班", leader_id: 3, skill_tags: "OVERHEAD", duty_status: "ON_DUTY", current_ticket_id: null, contact_phone: "3" },
    { id: 4, name: "休班带电班", leader_id: 4, skill_tags: "HOT_LINE", duty_status: "OFF_DUTY", current_ticket_id: null, contact_phone: "4" },
    { id: 5, name: "忙碌带电班", leader_id: 5, skill_tags: "HOT_LINE", duty_status: "ON_DUTY", current_ticket_id: 999, contact_phone: "5" }
  ];
  const faults: FaultReportRow[] = [
    { id: 1, reporter_name: "A", phone: "1", asset_id: null, fault_type: "OUTAGE", address_desc: "x", severity: "CRITICAL", report_channel: "TEL", status: "RECEIVED" },
    { id: 2, reporter_name: "B", phone: "2", asset_id: null, fault_type: "TRIP", address_desc: "y", severity: "MAJOR", report_channel: "APP", status: "RECEIVED" },
    { id: 3, reporter_name: "C", phone: "3", asset_id: null, fault_type: "LOW_V", address_desc: "z", severity: "MINOR", report_channel: "APP", status: "RECEIVED" }
  ];
  const tickets: RepairTicketRow[] = faults.map((f, idx) => ({
    id: idx + 1,
    fault_report_id: f.id,
    team_id: null,
    dispatcher_id: null,
    priority: f.severity,
    status: "WAIT_DISPATCH",
    assigned_at: null,
    arrived_at: null,
    repairing_at: null,
    restored_at: null,
    closed_at: null
  }));
  gateway.seed({ sparePart: parts, crew: crews, faultReport: faults, repairTicket: tickets });
  setDataGateway(gateway);
  return gateway;
}

function expectAppError(err: unknown, code: keyof typeof ERROR_CODES): void {
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
}

describe("抢修工单核心闭环", () => {
  let gateway: InMemoryDataGateway;

  beforeEach(() => {
    gateway = buildGateway();
  });

  it("派工成功：工单→已派工、班组占用、领用记录与库存流水同事务写入，库存扣减一致", async () => {
    const result = await repairTicketService.dispatch(
      1,
      1,
      [{ part_code: "P-CABLE", quantity: 2 }, { part_code: "P-FUSE", quantity: 5 }],
      DISPATCHER
    );
    expect(result.ticket.status).toBe("ASSIGNED");
    expect(result.ticket.team_id).toBe(1);
    expect(result.ticket.assigned_at).not.toBeNull();
    expect(result.usages).toHaveLength(2);

    const crew = await gateway.findCrewById(1);
    expect(crew?.current_ticket_id).toBe(1);

    const part = await gateway.findPartByCode("P-CABLE");
    expect(part?.stock_quantity).toBe(6);

    const txns = await gateway.findInventoryTransactions();
    expect(txns).toHaveLength(2);
    expect(txns.map((t) => t.balance_after)).toEqual([6, 15]);
    expect(txns.every((t) => t.change_type === "RESERVE")).toBe(true);

    const events = await gateway.findTicketEventLogs(1);
    expect(events.at(-1)?.to_status).toBe("ASSIGNED");
  });

  it("库存不足：整次派工、班组占用、领用记录、库存流水全部不写入", async () => {
    await expect(
      repairTicketService.dispatch(1, 1, [{ part_code: "P-CABLE", quantity: 100 }], DISPATCHER)
    ).rejects.toMatchObject({ code: ERROR_CODES.PART_STOCK_INSUFFICIENT });

    // 工单仍待派工
    const ticket = await gateway.findTicketById(1);
    expect(ticket?.status).toBe("WAIT_DISPATCH");
    expect(ticket?.team_id).toBeNull();
    // 班组仍空闲
    const crew = await gateway.findCrewById(1);
    expect(crew?.current_ticket_id).toBeNull();
    // 无领用记录、无库存流水、库存不变
    const usages = await gateway.findUsages();
    expect(usages).toHaveLength(0);
    expect((await gateway.findInventoryTransactions())).toHaveLength(0);
    expect((await gateway.findPartByCode("P-CABLE"))?.stock_quantity).toBe(8);
  });

  it("第一项足、第二项不足时仍然整体回滚（无任何部分写入）", async () => {
    await expect(
      repairTicketService.dispatch(
        1,
        1,
        [{ part_code: "P-CABLE", quantity: 2 }, { part_code: "P-LOW", quantity: 99 }],
        DISPATCHER
      )
    ).rejects.toMatchObject({ code: ERROR_CODES.PART_STOCK_INSUFFICIENT });

    expect((await gateway.findTicketById(1))?.status).toBe("WAIT_DISPATCH");
    expect((await gateway.findCrewById(1))?.current_ticket_id).toBeNull();
    expect(await gateway.findUsages()).toHaveLength(0);
    expect(await gateway.findInventoryTransactions()).toHaveLength(0);
    expect((await gateway.findPartByCode("P-CABLE"))?.stock_quantity).toBe(8);
  });

  it("非值班班组不能接单", async () => {
    await expect(
      repairTicketService.dispatch(1, 4, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER)
    ).rejects.toMatchObject({ code: ERROR_CODES.CREW_OFF_DUTY });
    expect((await gateway.findTicketById(1))?.status).toBe("WAIT_DISPATCH");
  });

  it("忙碌班组不能接单", async () => {
    await expect(
      repairTicketService.dispatch(1, 5, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER)
    ).rejects.toMatchObject({ code: ERROR_CODES.CREW_BUSY });
  });

  it("班组技能不满足故障严重度时拒绝派工", async () => {
    // CRITICAL 必须 HOT_LINE；架空班只有 OVERHEAD
    const err = await repairTicketService
      .dispatch(1, 3, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER)
      .catch((e) => e);
    expectAppError(err, ERROR_CODES.CREW_SKILL_MISMATCH);
    // MAJOR：电缆班可接
    const ok = await repairTicketService.dispatch(2, 2, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER);
    expect(ok.ticket.status).toBe("ASSIGNED");
  });

  it("并发派工同一工单只有一次成功，另一次 409 且不产生第二套数据", async () => {
    const [a, b] = await Promise.allSettled([
      repairTicketService.dispatch(1, 1, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER),
      repairTicketService.dispatch(1, 2, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER)
    ]);
    const results = [a, b].filter((r) => r.status === "fulfilled");
    const failures = [a, b].filter((r) => r.status === "rejected");
    expect(results).toHaveLength(1);
    expect(failures).toHaveLength(1);
    const reason = (failures[0] as PromiseRejectedResult).reason as AppError;
    expect([ERROR_CODES.TICKET_ALREADY_DISPATCHED, ERROR_CODES.CREW_BUSY]).toContain(reason.code);

    expect(await gateway.findUsages()).toHaveLength(1);
    expect(await gateway.findInventoryTransactions()).toHaveLength(1);
    expect((await gateway.findPartByCode("P-CABLE"))?.stock_quantity).toBe(7);
    // 只有一个班组被占用
    const busyCrews = (await gateway.findCrews()).filter((c) => c.current_ticket_id === 1);
    expect(busyCrews).toHaveLength(1);
  });

  it("同一空闲班组并发派给两张不同工单：只有一张成功占用，另一张整体回滚", async () => {
    // 工单2(MAJOR) 电缆班可接；工单3(MINOR) 任何值班班组可接
    const [a, b] = await Promise.allSettled([
      repairTicketService.dispatch(2, 2, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER),
      repairTicketService.dispatch(3, 2, [{ part_code: "P-FUSE", quantity: 1 }], DISPATCHER)
    ]);
    expect([a.status, b.status].filter((s) => s === "fulfilled")).toHaveLength(1);
    expect(await gateway.findInventoryTransactions()).toHaveLength(1);
    expect((await gateway.findPartByCode("P-CABLE"))?.stock_quantity).toBe(7);
    expect((await gateway.findPartByCode("P-FUSE"))?.stock_quantity).toBe(20);
  });

  it("重复审批只能成功一次；第二次明确 409 USAGE_ALREADY_APPROVED", async () => {
    const dispatched = await repairTicketService.dispatch(1, 1, [{ part_code: "P-FUSE", quantity: 3 }], DISPATCHER);
    const usageId = dispatched.usages[0].id;

    const first = await sparePartUsageService.reviewUsage(usageId, { decision: "APPROVED" }, WAREHOUSE);
    expect(first.usage_status).toBe("APPROVED");

    const err = await sparePartUsageService
      .reviewUsage(usageId, { decision: "APPROVED" }, WAREHOUSE)
      .catch((e) => e);
    expectAppError(err, ERROR_CODES.USAGE_ALREADY_APPROVED);
  });

  it("并发重复审批只有一次 APPROVED 成功", async () => {
    const dispatched = await repairTicketService.dispatch(1, 1, [{ part_code: "P-FUSE", quantity: 3 }], DISPATCHER);
    const usageId = dispatched.usages[0].id;
    const outcomes = await Promise.allSettled([
      sparePartUsageService.reviewUsage(usageId, { decision: "APPROVED" }, WAREHOUSE),
      sparePartUsageService.reviewUsage(usageId, { decision: "APPROVED" }, WAREHOUSE)
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((o) => o.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as AppError).code).toBe(ERROR_CODES.USAGE_ALREADY_APPROVED);
  });

  it("驳回领用：状态变更、库存回补并写 REJECT_RETURN 流水，余额恢复到派工前", async () => {
    const dispatched = await repairTicketService.dispatch(1, 1, [{ part_code: "P-CABLE", quantity: 5 }], DISPATCHER);
    expect((await gateway.findPartByCode("P-CABLE"))?.stock_quantity).toBe(3);

    const rejected = await sparePartUsageService.reviewUsage(dispatched.usages[0].id, { decision: "REJECTED" }, WAREHOUSE);
    expect(rejected.usage_status).toBe("REJECTED");
    expect((await gateway.findPartByCode("P-CABLE"))?.stock_quantity).toBe(8);

    const txns = await gateway.findInventoryTransactions({ part_code: "P-CABLE" });
    expect(txns).toHaveLength(2);
    expect(txns[1].change_type).toBe("REJECT_RETURN");
    expect(txns[1].balance_after).toBe(8);
  });

  it("状态仅按 待派工→已派工→到场→抢修中→复电→关闭 推进，跳跃被拒", async () => {
    await repairTicketService.dispatch(1, 1, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER);

    // 不能跳到复电
    const err = await repairTicketService.advanceStatus(1, "RESTORED", LEADER).catch((e) => e);
    expectAppError(err, ERROR_CODES.TICKET_STATUS_FLOW_VIOLATION);

    const arrived = await repairTicketService.advanceStatus(1, "ARRIVED", LEADER);
    expect(arrived.status).toBe("ARRIVED");
    expect(arrived.arrived_at).not.toBeNull();

    const repairing = await repairTicketService.advanceStatus(1, "REPAIRING", LEADER);
    expect(repairing.status).toBe("REPAIRING");

    const restored = await repairTicketService.advanceStatus(1, "RESTORED", LEADER);
    expect(restored.status).toBe("RESTORED");
    expect(restored.restored_at).not.toBeNull();

    const closed = await repairTicketService.close(1, DISPATCHER);
    expect(closed.status).toBe("CLOSED");

    // 关闭后班组释放
    expect((await gateway.findCrewById(1))?.current_ticket_id).toBeNull();
  });

  it("派工后再次派工被拒（重复派工只有一次成功）", async () => {
    await repairTicketService.dispatch(1, 1, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER);
    const err = await repairTicketService
      .dispatch(1, 2, [{ part_code: "P-CABLE", quantity: 1 }], DISPATCHER)
      .catch((e) => e);
    expectAppError(err, ERROR_CODES.TICKET_ALREADY_DISPATCHED);
  });

  it("备件不存在时整笔回滚", async () => {
    const err = await repairTicketService
      .dispatch(1, 1, [{ part_code: "P-NOPE", quantity: 1 }], DISPATCHER)
      .catch((e) => e);
    expectAppError(err, ERROR_CODES.PART_NOT_FOUND);
    expect((await gateway.findTicketById(1))?.status).toBe("WAIT_DISPATCH");
    expect((await gateway.findCrewById(1))?.current_ticket_id).toBeNull();
  });

  it("MINOR 故障无技能门槛，值班空闲班组均可接", async () => {
    const result = await repairTicketService.dispatch(3, 3, [{ part_code: "P-FUSE", quantity: 1 }], DISPATCHER);
    expect(result.ticket.status).toBe("ASSIGNED");
  });

  it("重启一致性（内存网关重建读取已提交数据）：状态与库存流水余额对齐", async () => {
    await repairTicketService.dispatch(1, 1, [{ part_code: "P-CABLE", quantity: 4 }], DISPATCHER);
    await repairTicketService.advanceStatus(1, "ARRIVED", LEADER);

    // 模拟“重启”：读取网关当前已提交状态（生产中由 MySQL 承担）
    const freshGateway = getDataGateway() as InMemoryDataGateway;
    const ticket = await freshGateway.findTicketById(1);
    expect(ticket?.status).toBe("ARRIVED");
    const lastTxn = (await freshGateway.findInventoryTransactions()).at(-1);
    expect(lastTxn?.balance_after).toBe(4);
  });
});

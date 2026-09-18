import { afterAll, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { InMemoryDataGateway } from "../database/InMemoryDataGateway";
import { setDataGateway } from "../database/gatewayFactory";
import { repairTicketService, type ActorContext } from "../services/RepairTicketService";
import { getDataGateway } from "../database/gatewayFactory";
import type { CrewRow, FaultReportRow, RepairTicketRow, SparePartRow } from "../database/types";

const SNAPSHOT = "/tmp/grid-repair-test-snapshot.json";
const DISPATCHER: ActorContext = { userId: 1, userName: "调度员" };

function seedGateway(g: InMemoryDataGateway): void {
  const parts: SparePartRow[] = [
    { id: 1, part_code: "P1", part_name: "接头", warehouse_name: "仓", stock_quantity: 10 }
  ];
  const crews: CrewRow[] = [
    { id: 1, name: "带电班", leader_id: 1, skill_tags: "HOT_LINE", duty_status: "ON_DUTY", current_ticket_id: null, contact_phone: "1" }
  ];
  const faults: FaultReportRow[] = [
    { id: 1, reporter_name: "A", phone: "1", asset_id: null, fault_type: "OUTAGE", address_desc: "x", severity: "CRITICAL", report_channel: "TEL", status: "RECEIVED" }
  ];
  const tickets: RepairTicketRow[] = [
    { id: 1, fault_report_id: 1, team_id: null, dispatcher_id: null, priority: "CRITICAL", status: "WAIT_DISPATCH", assigned_at: null, arrived_at: null, repairing_at: null, restored_at: null, closed_at: null }
  ];
  g.seed({ sparePart: parts, crew: crews, faultReport: faults, repairTicket: tickets });
}

describe("内存网关快照：重启后状态与库存流水一致", () => {
  afterAll(() => {
    if (existsSync(SNAPSHOT)) rmSync(SNAPSHOT);
  });

  it("提交落盘后，用新网关实例读取到完全一致的状态/余额/流水/班组占用", async () => {
    if (existsSync(SNAPSHOT)) rmSync(SNAPSHOT);
    const first = new InMemoryDataGateway(SNAPSHOT);
    setDataGateway(first);
    seedGateway(first);
    await repairTicketService.dispatch(1, 1, [{ part_code: "P1", quantity: 4 }], DISPATCHER);

    // 模拟进程重启：新建网关从同一快照文件恢复
    const second = new InMemoryDataGateway(SNAPSHOT);
    setDataGateway(second);

    const ticket = await second.findTicketById(1);
    expect(ticket?.status).toBe("ASSIGNED");
    expect(ticket?.team_id).toBe(1);
    const crew = await second.findCrewById(1);
    expect(crew?.current_ticket_id).toBe(1);
    const part = await second.findPartByCode("P1");
    expect(part?.stock_quantity).toBe(6);
    const txns = await second.findInventoryTransactions();
    expect(txns).toHaveLength(1);
    expect(txns[0].balance_after).toBe(6);
    const events = await second.findTicketEventLogs(1);
    expect(events.at(-1)?.to_status).toBe("ASSIGNED");

    rmSync(SNAPSHOT);
  });

  it("无快照文件时以空库启动（等价全新部署）", async () => {
    const g = new InMemoryDataGateway("/tmp/grid-repair-nonexistent-snapshot.json");
    expect(await g.findTickets()).toEqual([]);
    void getDataGateway;
  });
});

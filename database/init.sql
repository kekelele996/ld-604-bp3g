-- grid-repair MySQL 8.0 初始化脚本（同时兼容 MariaDB 10.11 本地验证）
-- 抢修工单核心闭环：派工 -> 接单(到场) -> 抢修 -> 备件申请/审批 -> 复电 -> 关闭

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL COMMENT 'DISPATCHER/LEADER/WAREHOUSE/AUDITOR/ADMIN',
  phone VARCHAR(32) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crew (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  leader_id BIGINT NULL,
  skill_tags VARCHAR(255) NOT NULL DEFAULT '' COMMENT '逗号分隔技能: OUTAGE,VOLTAGE_LOW,TRIP,EQUIPMENT_DAMAGE,SAFETY_RISK',
  duty_status VARCHAR(16) NOT NULL DEFAULT 'OFF_DUTY' COMMENT 'ON_DUTY/OFF_DUTY',
  current_ticket_id BIGINT NULL,
  contact_phone VARCHAR(32) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_crew_duty (duty_status),
  KEY idx_crew_ticket (current_ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS grid_asset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  asset_code VARCHAR(64) NOT NULL UNIQUE,
  asset_type VARCHAR(32) NOT NULL,
  feeder_line VARCHAR(64) NOT NULL,
  voltage_level VARCHAR(16) NOT NULL,
  location_desc VARCHAR(255) NULL,
  health_status VARCHAR(16) NOT NULL DEFAULT 'NORMAL' COMMENT 'NORMAL/WATCH/DEGRADED/DANGEROUS',
  owner_team_id BIGINT NULL,
  KEY idx_asset_line (feeder_line),
  KEY idx_asset_health (health_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fault_report (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reporter_name VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  asset_id BIGINT NULL,
  fault_type VARCHAR(32) NOT NULL COMMENT 'OUTAGE/VOLTAGE_LOW/TRIP/EQUIPMENT_DAMAGE/SAFETY_RISK',
  address_desc VARCHAR(255) NULL,
  severity VARCHAR(16) NOT NULL COMMENT 'CRITICAL/HIGH/MEDIUM/LOW',
  report_channel VARCHAR(16) NOT NULL DEFAULT 'HOTLINE',
  status VARCHAR(16) NOT NULL DEFAULT 'WAIT_DISPATCH' COMMENT 'WAIT_DISPATCH/TICKET_CREATED/DUPLICATED',
  merged_into_id BIGINT NULL,
  ticket_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fault_status (status),
  KEY idx_fault_asset (asset_id),
  CONSTRAINT fk_fault_asset FOREIGN KEY (asset_id) REFERENCES grid_asset(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_ticket (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  fault_report_id BIGINT NOT NULL,
  team_id BIGINT NULL,
  dispatcher_id BIGINT NULL,
  priority VARCHAR(16) NOT NULL COMMENT 'P1/P2/P3/P4，按故障严重度映射',
  status VARCHAR(16) NOT NULL DEFAULT 'WAIT_DISPATCH'
    COMMENT 'WAIT_DISPATCH/ASSIGNED/ARRIVED/REPAIRING/RESTORED/CLOSED',
  assigned_at DATETIME NULL,
  arrived_at DATETIME NULL,
  repair_started_at DATETIME NULL,
  restored_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
  UNIQUE KEY uk_ticket_fault (fault_report_id),
  KEY idx_ticket_status (status),
  KEY idx_ticket_team (team_id),
  CONSTRAINT fk_ticket_fault FOREIGN KEY (fault_report_id) REFERENCES fault_report(id),
  CONSTRAINT fk_ticket_crew FOREIGN KEY (team_id) REFERENCES crew(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS spare_part (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  part_code VARCHAR(64) NOT NULL UNIQUE,
  part_name VARCHAR(128) NOT NULL,
  warehouse_name VARCHAR(64) NOT NULL DEFAULT '中心仓库',
  stock INT NOT NULL DEFAULT 0,
  safety_stock INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS spare_part_usage (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  part_code VARCHAR(64) NOT NULL,
  part_name VARCHAR(128) NOT NULL,
  quantity INT NOT NULL,
  warehouse_name VARCHAR(64) NOT NULL DEFAULT '中心仓库',
  usage_status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING/APPROVED/REJECTED/RETURNED/CONSUMED',
  requested_by BIGINT NULL,
  approved_by BIGINT NULL,
  rejected_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  version BIGINT NOT NULL DEFAULT 0,
  KEY idx_usage_ticket (ticket_id),
  KEY idx_usage_status (usage_status),
  CONSTRAINT fk_usage_ticket FOREIGN KEY (ticket_id) REFERENCES repair_ticket(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 备件库存流水：审批通过(出库) / 归还(入库) 都落流水；审批未通过不产生任何流水
CREATE TABLE IF NOT EXISTS inventory_transaction (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  part_code VARCHAR(64) NOT NULL,
  change_qty INT NOT NULL COMMENT '负数=出库，正数=入库',
  balance_after INT NOT NULL,
  tx_type VARCHAR(16) NOT NULL COMMENT 'OUTBOUND/RETURN/ADJUST',
  usage_id BIGINT NULL,
  ticket_id BIGINT NULL,
  operator_id BIGINT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_invtx_part (part_code),
  KEY idx_invtx_usage (usage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  from_status VARCHAR(16) NULL,
  to_status VARCHAR(16) NOT NULL,
  actor_id BIGINT NULL,
  actor_name VARCHAR(64) NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_event_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT NULL,
  actor_name VARCHAR(64) NULL,
  actor_role VARCHAR(32) NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NULL,
  target_id VARCHAR(64) NULL,
  detail VARCHAR(1024) NULL,
  result VARCHAR(16) NOT NULL DEFAULT 'SUCCESS' COMMENT 'SUCCESS/FAILED',
  request_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_target (target_type, target_id),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ 种子数据（幂等，仅空库时写入） ============
INSERT INTO sys_user (id, username, display_name, role, phone)
SELECT * FROM (
  SELECT 1 AS id, 'dispatcher' AS username, '调度员张敏' AS display_name, 'DISPATCHER' AS role, '13900000001' AS phone UNION ALL
  SELECT 2, 'leader1', '班长李刚', 'LEADER', '13900000002' UNION ALL
  SELECT 3, 'keeper', '仓管王芳', 'WAREHOUSE', '13900000003' UNION ALL
  SELECT 4, 'auditor', '审计员赵磊', 'AUDITOR', '13900000004' UNION ALL
  SELECT 5, 'leader2', '班长陈强', 'LEADER', '13900000005'
) s WHERE NOT EXISTS (SELECT 1 FROM sys_user LIMIT 1);

INSERT INTO crew (id, name, leader_id, skill_tags, duty_status, current_ticket_id, contact_phone)
SELECT * FROM (
  SELECT 1 AS id, '城东抢修一班' AS name, 2 AS leader_id, 'OUTAGE,TRIP,EQUIPMENT_DAMAGE' AS skill_tags, 'ON_DUTY' AS duty_status, CAST(1 AS SIGNED) AS current_ticket_id, '13911110001' AS contact_phone UNION ALL
  SELECT 2, '城南抢修二班', 5, 'OUTAGE,VOLTAGE_LOW,TRIP', 'OFF_DUTY', NULL, '13911110002' UNION ALL
  SELECT 3, '高新抢修三班', 5, 'EQUIPMENT_DAMAGE,SAFETY_RISK,OUTAGE', 'ON_DUTY', 3, '13911110003' UNION ALL
  SELECT 4, '老城抢修四班', 2, 'VOLTAGE_LOW,TRIP,OUTAGE', 'ON_DUTY', 4, '13911110004' UNION ALL
  SELECT 5, '开发区抢修五班', 2, 'OUTAGE,EQUIPMENT_DAMAGE,SAFETY_RISK,VOLTAGE_LOW,TRIP', 'ON_DUTY', NULL, '13911110005'
) c WHERE NOT EXISTS (SELECT 1 FROM crew LIMIT 1);

INSERT INTO grid_asset (id, asset_code, asset_type, feeder_line, voltage_level, location_desc, health_status, owner_team_id)
SELECT * FROM (
  SELECT 1 AS id, 'XF-10-001' AS asset_code, 'TRANSFORMER' AS asset_type, 'F101 城东I线' AS feeder_line, '10kV' AS voltage_level, '城东开发区1号公变' AS location_desc, 'DEGRADED' AS health_status, CAST(1 AS SIGNED) AS owner_team_id UNION ALL
  SELECT 2, 'KG-10-002', 'SWITCH', 'F102 城南线', '10kV', '城南路口环网柜', 'NORMAL', 2 UNION ALL
  SELECT 3, 'DL-10-003', 'CABLE', 'F103 高新线', '10kV', '高新区科苑路分支箱', 'DANGEROUS', 3 UNION ALL
  SELECT 4, 'XF-04-004', 'TRANSFORMER', 'F104 老城I线', '0.4kV', '老城厢2号台区', 'WATCH', 4 UNION ALL
  SELECT 5, 'KG-10-005', 'RECLOSER', 'F105 开发区线', '10kV', '开发区7号杆重合器', 'NORMAL', 5 UNION ALL
  SELECT 6, 'DL-10-006', 'OVERHEAD_LINE', 'F101 城东I线', '10kV', '城东大道12-18号杆', 'NORMAL', 1
) a WHERE NOT EXISTS (SELECT 1 FROM grid_asset LIMIT 1);

INSERT INTO fault_report (id, reporter_name, phone, asset_id, fault_type, address_desc, severity, report_channel, status, merged_into_id, ticket_id, created_at)
SELECT * FROM (
  SELECT 1 AS id, '周女士' AS reporter_name, '13800001001' AS phone, CAST(1 AS SIGNED) AS asset_id, 'EQUIPMENT_DAMAGE' AS fault_type, '城东开发区1号公变异响' AS address_desc, 'HIGH' AS severity, 'HOTLINE' AS report_channel, 'TICKET_CREATED' AS status, CAST(NULL AS SIGNED) AS merged_into_id, CAST(1 AS SIGNED) AS ticket_id, '2026-09-17 08:10:00' AS created_at UNION ALL
  SELECT 2, '刘先生', '13800001002', 2, 'TRIP', '城南路口环网柜跳闸', 'MEDIUM', 'APP', 'TICKET_CREATED', NULL, 2, '2026-09-16 14:20:00' UNION ALL
  SELECT 3, '管委会', '13800001003', 3, 'OUTAGE', '高新区科苑路全线停电', 'CRITICAL', 'HOTLINE', 'TICKET_CREATED', NULL, 3, '2026-09-17 09:05:00' UNION ALL
  SELECT 4, '王阿姨', '13800001004', 4, 'VOLTAGE_LOW', '老城厢2号台区电压偏低', 'LOW', 'WECHAT', 'TICKET_CREATED', NULL, 4, '2026-09-17 07:40:00' UNION ALL
  SELECT 5, '吴先生', '13800001005', 5, 'OUTAGE', '开发区7号杆重合器故障停电', 'HIGH', 'HOTLINE', 'WAIT_DISPATCH', NULL, NULL, '2026-09-17 09:30:00' UNION ALL
  SELECT 6, '孙女士', '13800001006', 6, 'TRIP', '城东大道12号杆开关跳闸', 'MEDIUM', 'APP', 'WAIT_DISPATCH', NULL, NULL, '2026-09-17 09:35:00' UNION ALL
  SELECT 7, '重复来电', '13800001007', 5, 'OUTAGE', '开发区停电（重复报修）', 'HIGH', 'HOTLINE', 'DUPLICATED', 5, NULL, '2026-09-17 09:40:00'
) f WHERE NOT EXISTS (SELECT 1 FROM fault_report LIMIT 1);

INSERT INTO repair_ticket (id, fault_report_id, team_id, dispatcher_id, priority, status, assigned_at, arrived_at, repair_started_at, restored_at, closed_at, created_at, version)
SELECT * FROM (
  SELECT 1 AS id, 1 AS fault_report_id, CAST(1 AS SIGNED) AS team_id, CAST(1 AS SIGNED) AS dispatcher_id, 'P2' AS priority, 'ARRIVED' AS status, '2026-09-17 08:25:00' AS assigned_at, '2026-09-17 08:55:00' AS arrived_at, CAST(NULL AS DATETIME) AS repair_started_at, CAST(NULL AS DATETIME) AS restored_at, CAST(NULL AS DATETIME) AS closed_at, '2026-09-17 08:12:00' AS created_at, 0 AS version UNION ALL
  SELECT 2, 2, 2, 1, 'P3', 'CLOSED', '2026-09-16 14:35:00', '2026-09-16 15:00:00', '2026-09-16 15:05:00', '2026-09-16 16:30:00', '2026-09-16 17:00:00', '2026-09-16 14:22:00', 0 UNION ALL
  SELECT 3, 3, 3, 1, 'P1', 'REPAIRING', '2026-09-17 09:15:00', '2026-09-17 09:40:00', '2026-09-17 09:50:00', NULL, NULL, '2026-09-17 09:07:00', 0 UNION ALL
  SELECT 4, 4, 4, 1, 'P4', 'ASSIGNED', '2026-09-17 08:00:00', NULL, NULL, NULL, NULL, '2026-09-17 07:45:00', 0 UNION ALL
  SELECT 5, 5, NULL, NULL, 'P2', 'WAIT_DISPATCH', NULL, NULL, NULL, NULL, NULL, '2026-09-17 09:32:00', 0 UNION ALL
  SELECT 6, 6, NULL, NULL, 'P3', 'WAIT_DISPATCH', NULL, NULL, NULL, NULL, NULL, '2026-09-17 09:37:00', 0
) t WHERE NOT EXISTS (SELECT 1 FROM repair_ticket LIMIT 1);

INSERT INTO spare_part (id, part_code, part_name, warehouse_name, stock, safety_stock)
SELECT * FROM (
  SELECT 1 AS id, 'BRK-10-630' AS part_code, '10kV真空断路器' AS part_name, '中心仓库' AS warehouse_name, 8 AS stock, 2 AS safety_stock UNION ALL
  SELECT 2, 'FUS-10-100', '10kV跌落式熔断器', '中心仓库', 20, 5 UNION ALL
  SELECT 3, 'CAB-10-240', '10kV电缆240mm(米)', '城东前置仓', 50, 10 UNION ALL
  SELECT 4, 'TRF-04-400', '400kVA配变', '中心仓库', 2, 1 UNION ALL
  SELECT 5, 'INS-10-3', '10kV支柱绝缘子(支)', '城东前置仓', 0, 6 UNION ALL
  SELECT 6, 'RCL-10-AUTO', '10kV自动重合器', '中心仓库', 1, 1
) p WHERE NOT EXISTS (SELECT 1 FROM spare_part LIMIT 1);

INSERT INTO spare_part_usage (id, ticket_id, part_code, part_name, quantity, warehouse_name, usage_status, requested_by, approved_by, rejected_by, created_at, approved_at, version)
SELECT * FROM (
  SELECT 1 AS id, 1 AS ticket_id, 'FUS-10-100' AS part_code, '10kV跌落式熔断器' AS part_name, 2 AS quantity, '中心仓库' AS warehouse_name, 'CONSUMED' AS usage_status, CAST(2 AS SIGNED) AS requested_by, CAST(3 AS SIGNED) AS approved_by, CAST(NULL AS SIGNED) AS rejected_by, '2026-09-17 09:00:00' AS created_at, '2026-09-17 09:05:00' AS approved_at, 0 AS version UNION ALL
  SELECT 2, 3, 'CAB-10-240', '10kV电缆240mm(米)', 15, '城东前置仓', 'PENDING', 2, NULL, NULL, '2026-09-17 10:00:00', NULL, 0 UNION ALL
  SELECT 3, 3, 'BRK-10-630', '10kV真空断路器', 1, '中心仓库', 'PENDING', 2, NULL, NULL, '2026-09-17 10:02:00', NULL, 0
) u WHERE NOT EXISTS (SELECT 1 FROM spare_part_usage LIMIT 1);

INSERT INTO inventory_transaction (id, part_code, change_qty, balance_after, tx_type, usage_id, ticket_id, operator_id, remark, created_at)
SELECT * FROM (
  SELECT 1 AS id, 'FUS-10-100' AS part_code, -2 AS change_qty, 20 AS balance_after, 'OUTBOUND' AS tx_type, CAST(1 AS SIGNED) AS usage_id, CAST(1 AS SIGNED) AS ticket_id, CAST(3 AS SIGNED) AS operator_id, '工单1审批出库' AS remark, '2026-09-17 09:05:00' AS created_at
) x WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction LIMIT 1);

INSERT INTO ticket_event (ticket_id, from_status, to_status, actor_id, actor_name, note, created_at)
SELECT * FROM (
  SELECT 1 AS ticket_id, CAST(NULL AS CHAR(16)) AS from_status, 'WAIT_DISPATCH' AS to_status, CAST(1 AS SIGNED) AS actor_id, '调度员张敏' AS actor_name, '工单创建' AS note, '2026-09-17 08:12:00' AS created_at UNION ALL
  SELECT 1, 'WAIT_DISPATCH', 'ASSIGNED', 1, '调度员张敏', '派工至城东抢修一班', '2026-09-17 08:25:00' UNION ALL
  SELECT 1, 'ASSIGNED', 'ARRIVED', 2, '班长李刚', '班组到场', '2026-09-17 08:55:00' UNION ALL
  SELECT 3, 'WAIT_DISPATCH', 'ASSIGNED', 1, '调度员张敏', '重大停电优先派工', '2026-09-17 09:15:00' UNION ALL
  SELECT 3, 'ASSIGNED', 'ARRIVED', 5, '班长陈强', '班组到场', '2026-09-17 09:40:00' UNION ALL
  SELECT 3, 'ARRIVED', 'REPAIRING', 5, '班长陈强', '开始抢修', '2026-09-17 09:50:00'
) e WHERE NOT EXISTS (SELECT 1 FROM ticket_event LIMIT 1);

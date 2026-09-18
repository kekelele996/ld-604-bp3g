# 电力配网抢修工单系统（grid-repair）

面向供电所的配网故障报修、抢修派工、备件领用和停电恢复跟踪平台。调度员按**故障严重度 × 班组技能**派工，只有**值班且空闲**的班组能接单；派工与备件申请在**同一个数据库事务**内完成，库存不足时整次派工、班组占用、领用记录、库存流水**全部不写入**；并发派工与重复审批只能成功一次；工单状态严格沿 **待派工→已派工→到场→抢修中→复电→关闭** 推进；重启后状态与库存流水保持一致。

## 快速启动（首选）

```bash
cp .env.example .env && docker compose up -d
```

- 前端：<http://localhost:20104>
- 后端健康检查：<http://localhost:21104/health>
- 演示账号（密码统一 `grid-repair`，在登录页下拉选择）：

| 用户名 | 角色 | 可执行动作 |
|---|---|---|
| `dispatcher` | 调度员 | 登记报修、生成工单、派工、复电/关闭 |
| `crew_leader` | 班组长 | 到场、开始抢修、复电确认 |
| `warehouse` | 仓管 | 备件批准 / 驳回（驳回自动回补库存） |
| `auditor` | 审计员 | 台账与流水只读 |
| `admin` | 管理员 | 全部权限 |

也可以直接用 HTTP 头模拟登录态联调：`Authorization: Bearer <token>`（先 `POST /api/auth/login`），或 `x-role: DISPATCHER / x-user-id: 1 / x-user-name: 林敏`。

## 抢修工单核心闭环（本次实现）

```mermaid
flowchart LR
  A[故障报修] -->|生成工单| B[待派工 WAIT_DISPATCH]
  B -->|调度员派工+申请备件/单事务| C[已派工 ASSIGNED]
  C -->|班组长到场| D[到场 ARRIVED]
  D -->|开始抢修| E[抢修中 REPAIRING]
  E -->|复电确认| F[复电 RESTORED]
  F -->|调度员关闭/释放班组| G[关闭 CLOSED]
  H[仓管审批 PENDING] -->|批准| I[APPROVED]
  H -->|驳回| J[REJECTED + 库存回补]
```

派工事务（`RepairTicketService.dispatch`）内的写入顺序，任一失败整体 `ROLLBACK`：

1. 校验工单为 `WAIT_DISPATCH`、读取故障严重度；
2. 校验班组**存在 / 值班 ON_DUTY / 空闲 current_ticket_id IS NULL / 技能覆盖严重度**；
3. 预校验全部备件库存（不足直接抛 `PART_STOCK_INSUFFICIENT`，写库前即回滚）；
4. 条件式占位工单：`UPDATE repair_ticket SET ... WHERE id=? AND status='WAIT_DISPATCH'`；
5. 条件式占用班组：`UPDATE crew SET current_ticket_id=? WHERE id=? AND duty_status='ON_DUTY' AND current_ticket_id IS NULL`；
6. 逐件原子扣减 `UPDATE spare_part SET stock=stock-? WHERE part_code=? AND stock>=?`，并写领用记录（`PENDING`）与 `RESERVE` 库存流水；
7. 写工单状态事件与审计日志，提交。

严重度→技能规则（`constants/Severity.ts`）：

| 严重度 | 接单技能要求 |
|---|---|
| CRITICAL 危急 | 必须持有 `HOT_LINE`（带电作业） |
| MAJOR 重大 | `CABLE` 或 `HOT_LINE` |
| MINOR 一般 | 无技能门槛（值班空闲即可） |

并发与幂等保证：

- **并发派工同一工单**：两张事务的条件 UPDATE 只有一张 `affected=1`，另一张回滚（`TICKET_ALREADY_DISPATCHED`）；
- **同一空闲班组并发抢两张工单**：只有一张工单成功占用班组，另一张 `CREW_BUSY` 整笔回滚，不产生领用/流水；
- **重复/并发审批**：`UPDATE spare_part_usage SET status='APPROVED' WHERE id=? AND status='PENDING'` 只有一次命中，第二次 `USAGE_ALREADY_APPROVED`；
- **状态跳跃/回退**：服务端按状态机表 `TICKET_STATUS_FLOW` 裁决，带旧状态条件更新，重复点击只有一次生效；
- **重启一致**：生产由 MySQL 8 命名卷持久化（状态、事件、库存余额、流水同事务落库）；内存驱动可用 `MEMORY_SNAPSHOT_FILE` 落盘回放，行为一致。

## 本地开发方式

需要 Node.js 20+。

```bash
# 后端（默认内存驱动，零外部依赖即可联调；行为与 MySQL 条件更新一致）
cd backend
npm install
npm run dev                 # http://localhost:3000 （可用 PORT 覆盖）

# 前端（5173/20104 由 vite 反代 /api 到后端）
cd frontend
npm install
npm run dev                 # http://localhost:20104
```

本地对接 MySQL（与 Docker 同一套 Prisma 适配器）：

```bash
cd backend
export DB_DRIVER=prisma
export DATABASE_URL="mysql://app_user:app_password@localhost:33060/app_db"
npx prisma migrate deploy    # 建表（幂等）
npm run dev
```

后端测试（同一套 Service 跑内存事务网关，16 个用例覆盖派工/回滚/并发/审批/状态机）：

```bash
cd backend && npm test
```

## 访问地址 / CLI 示例

```bash
# 登录
curl -s -X POST http://localhost:21104/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"dispatcher","password":"grid-repair"}'

# 派工 + 申请备件（库存不足会 409 且整体不写入）
curl -s -X POST http://localhost:21104/api/repair-ticket/1/dispatch \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"team_id":1,"parts":[{"part_code":"SP-CABLE-10","quantity":2},{"part_code":"SP-FUSE-10","quantity":5}]}'

# 状态推进
curl -s -X POST http://localhost:21104/api/repair-ticket/1/arrive  -H "Authorization: Bearer $LEADER_TOKEN"
curl -s -X POST http://localhost:21104/api/repair-ticket/1/repair  -H "Authorization: Bearer $LEADER_TOKEN"
curl -s -X POST http://localhost:21104/api/repair-ticket/1/restore -H "Authorization: Bearer $LEADER_TOKEN"

# 仓管审批 / 驳回（驳回自动写 REJECT_RETURN 流水并回补库存）
curl -s -X POST http://localhost:21104/api/spare-part-usage/usages/1/review \
  -H "Authorization: Bearer $WAREHOUSE_TOKEN" -H 'Content-Type: application/json' \
  -d '{"decision":"APPROVED"}'
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia |
| 后端 | Node.js + Express + TypeScript（分层 routes/controllers/services/repositories） |
| 持久化 | Prisma + MySQL 8.0；另内置与 MySQL 条件更新语义一致的内存事务网关（本地/测试） |
| 认证 | JWT + RBAC（调度员/班组长/仓管/审计员/管理员） |
| 部署 | Docker Compose（db / backend / frontend 三容器，命名卷，healthcheck 依赖编排） |

## 项目目录结构

```text
.
├── docker-compose.yml         # name: grid-repair，三容器 + 命名卷 + healthcheck
├── .env / .env.example        # COMPOSE_PROJECT_NAME / 端口 / DB / JWT / 限流
├── database/init.sql          # MySQL 幂等建表脚本（容器首次初始化）
├── backend/
│   ├── prisma/schema.prisma   # 9 张表（含 spare_part / inventory_transaction / ticket_event_log / audit_log）
│   ├── prisma/migrations/     # 与 init.sql 同构的幂等迁移
│   └── src/
│       ├── config/            # env（端口/DB_DRIVER/JWT/限流）
│       ├── constants/         # TicketStatus/Severity/UsageStatus/Role/errorCodes/errorMessages/logTemplates
│       ├── database/          # DataGateway 接口 + Prisma/InMemory 两套事务适配器
│       ├── routes/ controllers/ services/ repositories/ models/
│       ├── middlewares/       # auth / rbac / rateLimit / auditLog / requestLogger / errorHandler
│       ├── constructors/      # 响应 DTO 工厂
│       ├── utils/             # AppError / asyncHandler / CrewEligibility / formatters
│       └── __tests__/         # 闭环集成测试（vitest）
└── frontend/src/
    ├── api/ stores/ types/ constants/ constructors/
    ├── components/common/     # StatusBadge / PriorityTag / CrewCard / StatCard / TimelineList / EmptyState / AssetTree
    ├── components/ticket/     # DispatchDialog 派工+备件对话框
    ├── hooks/                 # useTicketFlow / useCrewAvailability / usePagination
    ├── pages/                 # Dashboard / Assets / Faults / Tickets / Parts / Login
    └── router/                # 路由表 + canAccess 前端守卫
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `grid-repair` | Compose 项目名与容器/卷前缀 |
| `FRONTEND_PORT` | `20104` | 前端宿主机端口 |
| `BACKEND_PORT` | `21104` | 后端宿主机端口（容器内固定 3000） |
| `DB_PORT` | `33060` | MySQL 宿主机端口 |
| `DB_NAME / DB_USER / DB_PASSWORD` | `app_db / app_user / app_password` | 业务库凭据 |
| `DB_ROOT_PASSWORD` | `app_password` | MySQL root 密码（healthcheck 使用） |
| `JWT_SECRET` | `local-dev-secret` | JWT 签名密钥，生产请修改 |
| `RATE_LIMIT_MAX` | `600` | 每 IP 每分钟最大请求数 |
| `DB_DRIVER`（仅裸跑） | `memory` | `prisma`=MySQL；`memory`=本地内存事务网关 |
| `MEMORY_SNAPSHOT_FILE`（可选） | — | 内存驱动快照文件，配置后重启回放 |

## Docker 部署说明

- 根 Compose 不写 `version`，顶层 `name: grid-repair`；容器名均为 `${COMPOSE_PROJECT_NAME:-grid-repair}-{db,backend,frontend}`。
- 数据库使用命名卷 `${COMPOSE_PROJECT_NAME:-grid-repair}_db_data`，**不绑定挂载到中文路径**。
- `db` 配置 healthcheck；`backend` 通过 `depends_on: condition: service_healthy` 等待数据库，启动时执行 `prisma migrate deploy` 幂等建表；`frontend` 等待后端健康。
- Nginx 仅托管静态资源，并将 `/api/` 反代到 `http://backend:3000/api/`，`try_files $uri $uri/ /index.html` 支持前端路由回退。
- 前端代码统一请求 `/api`，无任何 `localhost` 硬编码，因此任意目录名（含中文）下均可构建启动。
- 常见问题：
  - 端口占用：改 `.env` 中 `FRONTEND_PORT/BACKEND_PORT/DB_PORT` 后 `docker compose up -d`；
  - 重置数据：`docker compose down -v`（删除命名卷）后重新 `up -d`；
  - 后端起不来：`docker compose logs backend`，确认 db healthcheck 是否已通过；
  - 只改前端：`docker compose up -d --build frontend`。

## 枚举/常量出现位置清单

> 需求强制：枚举在前后端多模块重复定义；新增取值需同步常量、类型、构造器、日志、错误、格式化、筛选器、展示组件。

### TicketStatus（WAIT_DISPATCH/ASSIGNED/ARRIVED/REPAIRING/RESTORED/CLOSED）

- 后端：`backend/src/constants/TicketStatus.ts`（含 `TICKET_STATUS_FLOW` 状态机）、`prisma/schema.prisma`（repair_ticket.status）、`services/RepairTicketService.ts`（派工/推进裁决）、`repositories/RepairTicketRepository.ts`（条件更新）、`constructors/RepairTicketDtoFactory.ts`、`controllers/RepairTicketController.ts`、`constants/errorMessages.ts`（状态冲突/非法跳转）、`constants/logTemplates.ts`、`seed.ts`
- 前端：`frontend/src/constants/TicketStatus.ts`、`types/TicketStatus.ts`、`types/RepairTicket.ts`、`constants/statusText.ts`、`hooks/useTicketFlow.ts`、`constructors/RepairTicketConstructor.ts`、`pages/TicketsPage.vue`（状态筛选器/按钮显隐）、`components/common/StatusBadge.vue`、`components/common/TimelineList.vue`、`pages/DashboardPage.vue`（进度条）

### Severity / 派工技能规则（CRITICAL/MAJOR/MINOR + HOT_LINE/CABLE/...）

- 后端：`constants/Severity.ts`（枚举与 `SEVERITY_SKILL_RULE`）、`utils/CrewEligibility.ts`、`services/RepairTicketService.ts`（严重度派工校验）、`constants/errorMessages.ts`、`seed.ts`
- 前端：`constants/Severity.ts`、`components/common/PriorityTag.vue`、`hooks/useCrewAvailability.ts`、`stores/CrewStore.ts`、`components/ticket/DispatchDialog.vue`（仅技能匹配班组可点）、`pages/FaultsPage.vue`（分级单选）、`pages/DashboardPage.vue`（危急优先排序）

### UsageStatus / InventoryChangeType（PENDING/APPROVED/REJECTED... + RESERVE/REJECT_RETURN...）

- 后端：`constants/UsageStatus.ts`、`prisma/schema.prisma`、`services/SparePartUsageService.ts`（条件审批/驳回回补）、`repositories/SparePartUsageRepository.ts`、`constants/logTemplates.ts`、`constants/errorCodes.ts`
- 前端：`constants/UsageStatus.ts`、`types/SparePartUsage.ts`、`components/common/StatusBadge.vue`、`pages/PartsPage.vue`（待审批/全部/流水三个筛选页）

### FaultType（OUTAGE/VOLTAGE_LOW/TRIP/EQUIPMENT_DAMAGE/SAFETY_RISK）

- 后端：`constants/FaultType.ts`、`services/FaultReportService.ts`、`seed.ts`
- 前端：`constants/FaultType.ts`、`constants/statusText.ts`、`pages/FaultsPage.vue`（筛选与登记表单）、`types/FaultReport.ts`

### AssetHealthStatus（NORMAL/WATCH/DEGRADED/DANGEROUS）

- 后端：`constants/AssetHealthStatus.ts`、`seed.ts`、`services/GridAssetService.ts`
- 前端：`constants/AssetHealthStatus.ts`、`components/common/StatusBadge.vue`、`components/common/AssetTree.vue`、`pages/AssetsPage.vue`（健康筛选器）

### RBAC Role（DISPATCHER/CREW_LEADER/WAREHOUSE/AUDITOR/ADMIN）

- 后端：`constants/Role.ts`、`middlewares/authMiddleware.ts`（JWT 解析）、`middlewares/rbacMiddleware.ts`、各 `routes/*Routes.ts`（按动作挂角色）、`controllers/AuthController.ts`
- 前端：`constants/Role.ts`、`stores/AuthStore.ts`（`can()`）、`router/routes.ts`（`canAccess` 守卫）、`App.vue`（导航显隐）、各页面按钮 `:disabled`

## 横切：操作日志 + 库存流水

- `audit_log`：业务事务内写领域事件（派工/审批/状态推进/班组占用释放），`auditLogMiddleware` 对所有 POST 追加请求级日志；时间维度另有 `ticket_event_log` 驱动工单时间线。
- `inventory_transaction`：每次 `RESERVE` 扣减、`REJECT_RETURN` 回补都记录变动量与 `balance_after`，与 `spare_part.stock_quantity` 同事务更新，天然账实一致；`/parts` 页可按备件核对流水。
- 全局异常：service 抛 `AppError(code,message,status)`，controller 经 `asyncHandler` 包装，最终由 `errorHandlerMiddleware` 统一输出 `{code,message,details}`，错误码集中于 `constants/errorCodes.ts`，消息模板集中于 `constants/errorMessages.ts`。

## 为什么该项目会牵一发动全身

工单状态、严重度、领用状态、角色等枚举在前后端多目录重复定义并被 store/hook/组件/筛选器引用；派工一个动作横跨 `RepairTicketService` 事务、`RepairTicket/Crew/SparePartUsage` 三个仓储、四张表写入、日志模板与错误消息。新增一个状态通常需要同时修改：后端状态机表、条件更新仓储、DTO、种子、错误码/消息/日志模板，以及前端常量、`useTicketFlow`、状态筛选器、`StatusBadge` 文案、时间线组件与 README。数据访问层用 `DataGateway` 接口隔离 Prisma 与内存两套实现，使同一条业务规则既能在 MySQL 行锁下运行，也能在无数据库环境被并发测试直接验证。

## License

MIT

# 电力配网抢修工单系统（grid-repair）

面向供电所的配网**故障报修 → 调度派工 → 班组接单 → 备件领用审批 → 复电关闭**全闭环平台。
所有状态与库存都落在 MySQL，服务重启后工单状态、班组占用、库存流水完全一致。

## 快速启动（首选）

```bash
cp .env.example .env && docker compose up -d
```

- 前端：<http://localhost:20104>
  - 首次进入为登录页，快捷账号：`dispatcher`（调度员）/ `leader1`（班组长）/ `keeper`（仓管）/ `auditor`（审计员）
- 后端健康检查：<http://localhost:21104/health>

校验编排文件：`docker compose config --quiet`

## 抢修工单核心闭环（本次实现重点）

1. **调度员派工**：按**故障严重度**（CRITICAL/HIGH/MEDIUM/LOW）自动映射优先级（P1/P2/P3/P4）。
2. **接单三条件**：只有 `值班(ON_DUTY)` 且 `空闲(current_ticket_id IS NULL)` 且 **技能标签包含该故障类型** 的班组才能被派工；
   休班、在做别的工单、技能不匹配都会被拒绝（错误码 `CREW_NOT_ON_DUTY / CREW_BUSY / CREW_SKILL_MISMATCH`）。
3. **备件申请与审批**：班组到场后才能申请备件（生成 `PENDING` 领用记录，不动库存）；仓管审批通过才扣减库存并写**库存流水**。
4. **库存不足整体回滚**：
   - 审批时库存不足 → 领用记录保持 `PENDING`，库存与流水零改动；
   - “派工同时领用备件”接口中任一备件库存不足 → **整次派工、班组占用、领用记录、库存流水全部不写入**（单数据库事务回滚）。
5. **并发只成功一次**：派工与状态推进都用 `SELECT … FOR UPDATE` 行锁 + `WHERE status=前置状态` 条件更新，
   审批用 `WHERE usage_status='PENDING'` 条件更新；并发派工 / 重复点击审批 / 重复状态推进都只有一次 `affectedRows=1`，其余返回 409。
6. **状态单向推进**：只允许 `待派工 WAIT_DISPATCH → 已派工 ASSIGNED → 到场 ARRIVED → 抢修中 REPAIRING → 复电 RESTORED → 关闭 CLOSED`，
   跳跃、回退一律拒绝（`TICKET_INVALID_TRANSITION`）；关闭时释放班组占用。
7. **重启一致**：所有数据在 MySQL，后端无内存业务态；`inventory_transaction` 逐笔记录出库/入库与结存，重启后可逐笔核对。

### 关键接口

| 方法 & 路径 | 角色 | 说明 |
|---|---|---|
| `POST /api/auth/login` | 公开 | 用户名换 JWT |
| `GET  /api/dashboard/overview` | 登录 | 态势统计（实时聚合） |
| `POST /api/fault-report` | 调度/班长 | 登记报修 |
| `POST /api/fault-report/:id/create-ticket` | 调度 | 报修生成待派工工单（重复只成功一次） |
| `POST /api/fault-report/:id/merge` | 调度 | 重复报修合并 |
| `GET  /api/crew?faultType=OUTAGE` | 登录 | 按故障类型返回可接单班组 |
| `POST /api/repair-ticket/:id/dispatch` | 调度 | 派工（值班/空闲/技能） |
| `POST /api/repair-ticket/:id/dispatch-with-parts` | 调度 | 派工并领用备件（**库存不足整体回滚**） |
| `POST /api/repair-ticket/:id/transition` | 调度/班长 | 到场/抢修/复电/关闭单向推进 |
| `POST /api/repair-ticket/:id/parts` | 班长/调度 | 接单后申请备件（PENDING） |
| `POST /api/spare-part-usage/:id/approve` | 仓管 | 审批通过并出库（重复审批只成功一次） |
| `POST /api/spare-part-usage/:id/reject` | 仓管 | 驳回（不动库存） |
| `POST /api/spare-part-usage/:id/return` | 班长/仓管 | 归还入库（写正向流水） |
| `GET  /api/spare-part-usage/inventory/transactions` | 仓管/审计 | 库存流水核对 |

示例：

```bash
TOKEN=$(curl -s -X POST http://localhost:21104/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"dispatcher"}' | jq -r .token)

# 派工
curl -s -X POST http://localhost:21104/api/repair-ticket/5/dispatch \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"teamId":5}'

# 派工并领用备件（库存不足时整体回滚）
curl -s -X POST http://localhost:21104/api/repair-ticket/5/dispatch-with-parts \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"teamId":5,"parts":[{"partCode":"FUS-10-100","quantity":2}]}'
```

## 本地开发方式

- 前置：Node.js 20、一个可连的 MySQL 8（或兼容的 MariaDB）。
- 数据库：`mysql -u<user> -p < database/init.sql`（幂等，可重复执行）。
- 后端：

  ```bash
  cd backend
  npm install
  DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD= DB_NAME=app_db npm run dev
  ```

  接口统一挂在 `/api`，端口 21104（容器内 3000）。
- 前端：

  ```bash
  cd frontend
  npm install
  npm run dev      # http://localhost:20104，/api 已在 vite 配置代理到 21104
  ```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router |
| 后端 | Node.js + Express + TypeScript + mysql2（连接池/事务） |
| 数据库 | MySQL 8.0（init.sql，兼容 MariaDB 10.11 本地验证） |
| 认证 | JWT + RBAC（调度员/班组长/仓管/审计员/管理员） |
| 部署 | Docker Compose（frontend / backend / db） |

## 项目目录结构

```text
frontend/src/
├── api/            # http 封装 + 按实体分文件（auth/dashboard/RepairTicket/...）
├── stores/         # Pinia，按实体分文件 + authStore
├── types/          # 实体接口 + 枚举镜像
├── constants/      # 枚举/错误码/日志模板/状态文案/Role/Severity
├── constructors/   # 各实体默认对象与表单构造器
├── components/common/  # StatusBadge/PriorityTag/CrewCard/AssetTree/TimelineList/...
├── hooks/          # useTicketFlow/useCrewAvailability/usePagination
├── pages/          # Login/Dashboard/Assets/Faults/Tickets/Parts
├── router/         # 路由 + 登录守卫
├── utils/          # formatters（日期/状态/风险等级混合）
└── mocks/          # 种子账号说明（业务数据全部来自数据库）

backend/src/
├── routes/         # 按实体分文件，挂 rbacMiddleware 角色白名单
├── controllers/    # 参数解析 + DTO 构造器 + 调 service
├── services/       # 事务边界、状态机、库存原子性（核心在 RepairTicketService）
├── repositories/   # mysql2 数据访问，FOR UPDATE / 条件更新
├── models/         # 数据库行接口
├── middlewares/    # auth/rbac/auditLog/rateLimit/requestLogger/errorHandler
├── constants/      # TicketStatus/TicketFlow/Severity/错误码/错误消息/日志模板/状态文案
├── constructors/   # 响应 DTO 工厂（snake_case -> camelCase + 文案）
├── utils/  types/  config/
database/init.sql   # 建表 + 幂等种子
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `grid-repair` | Compose 项目名与容器名前缀 |
| `FRONTEND_PORT` | `20104` | 前端宿主机端口 |
| `BACKEND_PORT` | `21104` | 后端宿主机端口（容器内 3000） |
| `DB_PORT` | `33060` | MySQL 宿主机端口（容器内固定 3306） |
| `DB_NAME/DB_USER/DB_PASSWORD` | `app_db/app_user/app_password` | 数据库凭据 |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | `local-dev-secret` / `12h` | JWT 配置 |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `300` | 接口限流窗口与阈值 |

## Docker 部署说明

- 根 `docker-compose.yml`：顶层 `name: grid-repair`，无 `version:` 字段；容器名均带 `${COMPOSE_PROJECT_NAME:-grid-repair}-` 前缀。
- `db` 使用**命名卷 `db_data`**（不绑定挂载，中文目录名也安全），配置 `healthcheck`；`backend` 通过 `depends_on: condition: service_healthy` 等待数据库。
- `backend` 暴露 `/health` 并带 healthcheck，`frontend` 等待 backend 健康后启动。
- `frontend/nginx.conf`：`location /api/` 反代到 `http://backend:3000/api/`，其余走 `try_files $uri $uri/ /index.html;`。前端代码统一请求 `/api`，无硬编码 host。
- 常见问题：
  - 端口占用：改 `.env` 的 `FRONTEND_PORT/BACKEND_PORT/DB_PORT` 后 `docker compose up -d`。
  - 重置数据：`docker compose down -v`（删除命名卷），再 `docker compose up -d` 会重新执行 init.sql。

## 枚举/常量出现位置清单

新增一个枚举值时，需要同步：`constants`（前后端）→ `types` 镜像 → 构造器默认值 → 日志模板/错误消息 → 列表筛选器 → 详情展示组件 → 种子数据。

### TicketStatus（WAIT_DISPATCH/ASSIGNED/ARRIVED/REPAIRING/RESTORED/CLOSED）

- 后端：`constants/TicketStatus.ts`（值+类型守卫）、`constants/TicketFlow.ts`（状态机 `TICKET_TRANSITIONS`）、`constants/statusText.ts`（文案）、`constants/logTemplates.ts`（dispatch/transition/restore/close 模板）、`constants/errorCodes.ts`（TICKET_NOT_DISPATCHABLE/INVALID_TRANSITION/VERSION_CONFLICT）、`repositories/RepairTicketRepository.ts`（条件更新）、`services/RepairTicketService.ts`（推进/派工）、`models/RepairTicket.ts`、`constructors/RepairTicketDtoFactory.ts`、`database/init.sql`（列注释/种子/事件）。
- 前端：`constants/TicketStatus.ts`（值+`TICKET_NEXT`）、`types/TicketStatus.ts`（镜像）、`constants/statusText.ts`、`constants/logTemplates.ts`、`hooks/useTicketFlow.ts`、`components/common/StatusBadge.vue`、`components/common/TimelineList.vue`、`pages/TicketsPage.vue`（筛选器+推进按钮）、`types/RepairTicket.ts`。

### FaultType（OUTAGE/VOLTAGE_LOW/TRIP/EQUIPMENT_DAMAGE/SAFETY_RISK）

- 后端：`constants/FaultType.ts`、`constants/statusText.ts`（FAULT_TYPE_TEXT）、`services/FaultReportService.ts`（校验）、`repositories/CrewRepository.ts`（`FIND_IN_SET` 技能匹配）、`models/FaultReport.ts`、`constructors/FaultReportDtoFactory.ts`、`database/init.sql`（报修与班组 skill_tags 种子）。
- 前端：`constants/FaultType.ts`、`types/FaultType.ts`、`constants/statusText.ts`、`pages/FaultsPage.vue`（登记下拉/筛选）、`hooks/useCrewAvailability.ts`（按故障类型拉可接班组）、`types/FaultReport.ts`。

### AssetHealthStatus（NORMAL/WATCH/DEGRADED/DANGEROUS）

- 后端：`constants/AssetHealthStatus.ts`、`constants/statusText.ts`、`constants/logTemplates.ts`（GridAsset.status）、`services/GridAssetService.ts`（更新校验）、`repositories/GridAssetRepository.ts`、`constructors/GridAssetDtoFactory.ts`、`database/init.sql`。
- 前端：`constants/AssetHealthStatus.ts`、`types/AssetHealthStatus.ts`、`constants/statusText.ts`、`components/common/AssetTree.vue`（色阶）、`pages/AssetsPage.vue`（筛选器/详情）、`types/GridAsset.ts`。

### 关联：Severity → Priority、PartUsageStatus、CrewDutyStatus、Role

- `constants/Severity.ts`（CRITICAL/HIGH/MEDIUM/LOW + `SEVERITY_PRIORITY`）前后端各一份，`PriorityTag.vue` 与派工服务共同消费。
- `constants/PartUsageStatus.ts`（PENDING/APPROVED/REJECTED/CONSUMED/RETURNED）贯穿备件服务、审批面板、备件页。
- `constants/CrewDutyStatus.ts`（ON_DUTY/OFF_DUTY）贯穿班组占用判定。
- `constants/Role.ts` 前端 `can()` 控制按钮显隐，与后端 `rbacMiddleware` 角色白名单双端对齐。

## 为什么该项目会“牵一发动全身”

- 日志模板、错误码、错误消息、枚举、DTO 构造器分别独立成文件，但被 controller/service/store/component 多层直接引用；改一个状态值会同时波及状态机、条件更新 SQL、日志、错误提示、筛选器、时间轴和徽标。
- 派工/审批/状态推进的正确性依赖“仓储条件更新 + service 事务 + controller 角色 + 前端按钮显隐”多处协同；任一环节漏改都会破坏“只成功一次/库存不足零写入”的语义。
- `utils/formatters` 故意混合日期、状态文案、风险等级色阶，被多个页面与 DTO 工厂共同依赖。

## License

MIT

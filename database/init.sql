-- ============================================================================
-- grid-repair 电力配网抢修工单系统 - MySQL 8.0 初始化结构（幂等）
-- 与 backend/prisma/schema.prisma 保持一致；后端启动时还会执行 prisma db push
-- 做兜底对齐。容器首次初始化空库时执行，重启不重复执行。
-- ============================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `grid_asset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_code` VARCHAR(64) NOT NULL,
    `asset_type` VARCHAR(32) NOT NULL,
    `feeder_line` VARCHAR(64) NOT NULL,
    `voltage_level` VARCHAR(16) NOT NULL,
    `location_desc` VARCHAR(255) NOT NULL,
    `health_status` VARCHAR(32) NOT NULL,
    `owner_team_id` INTEGER NULL,
    UNIQUE INDEX `grid_asset_asset_code_key`(`asset_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fault_report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporter_name` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `asset_id` INTEGER NULL,
    `fault_type` VARCHAR(32) NOT NULL,
    `address_desc` VARCHAR(255) NOT NULL,
    `severity` VARCHAR(16) NOT NULL,
    `report_channel` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    INDEX `fault_report_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `repair_ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fault_report_id` INTEGER NOT NULL,
    `team_id` INTEGER NULL,
    `dispatcher_id` INTEGER NULL,
    `priority` VARCHAR(16) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'WAIT_DISPATCH',
    `assigned_at` DATETIME(3) NULL,
    `arrived_at` DATETIME(3) NULL,
    `repairing_at` DATETIME(3) NULL,
    `restored_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    UNIQUE INDEX `repair_ticket_fault_report_id_key`(`fault_report_id`),
    INDEX `repair_ticket_status_idx`(`status`),
    INDEX `repair_ticket_team_id_idx`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crew` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `leader_id` INTEGER NOT NULL,
    `skill_tags` VARCHAR(255) NOT NULL,
    `duty_status` VARCHAR(16) NOT NULL DEFAULT 'ON_DUTY',
    `current_ticket_id` INTEGER NULL,
    `contact_phone` VARCHAR(32) NOT NULL,
    UNIQUE INDEX `crew_current_ticket_id_key`(`current_ticket_id`),
    INDEX `crew_duty_status_idx`(`duty_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spare_part` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `part_code` VARCHAR(64) NOT NULL,
    `part_name` VARCHAR(128) NOT NULL,
    `warehouse_name` VARCHAR(64) NOT NULL,
    `stock_quantity` INTEGER NOT NULL DEFAULT 0,
    UNIQUE INDEX `spare_part_part_code_key`(`part_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spare_part_usage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `part_code` VARCHAR(64) NOT NULL,
    `part_name` VARCHAR(128) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `warehouse_name` VARCHAR(64) NOT NULL,
    `usage_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `spare_part_usage_ticket_id_idx`(`ticket_id`),
    INDEX `spare_part_usage_usage_status_idx`(`usage_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `part_code` VARCHAR(64) NOT NULL,
    `change_type` VARCHAR(32) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `ticket_id` INTEGER NULL,
    `usage_id` INTEGER NULL,
    `operator_id` INTEGER NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `inventory_transaction_part_code_idx`(`part_code`),
    INDEX `inventory_transaction_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ticket_event_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `from_status` VARCHAR(32) NULL,
    `to_status` VARCHAR(32) NOT NULL,
    `operator_id` INTEGER NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ticket_event_log_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor` VARCHAR(64) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `target_type` VARCHAR(32) NOT NULL,
    `target_id` VARCHAR(64) NULL,
    `detail` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 外键（用 information_schema 做存在性检查，保证脚本可重复执行）
DROP PROCEDURE IF EXISTS `grid_repair_add_fk`;
DELIMITER //
CREATE PROCEDURE `grid_repair_add_fk`(
    IN p_table VARCHAR(64), IN p_constraint VARCHAR(64),
    IN p_ddl VARCHAR(512)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND CONSTRAINT_NAME = p_constraint
    ) THEN
        SET @ddl = p_ddl;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL grid_repair_add_fk('fault_report', 'fault_report_asset_id_fkey',
    'ALTER TABLE `fault_report` ADD CONSTRAINT `fault_report_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `grid_asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
CALL grid_repair_add_fk('repair_ticket', 'repair_ticket_fault_report_id_fkey',
    'ALTER TABLE `repair_ticket` ADD CONSTRAINT `repair_ticket_fault_report_id_fkey` FOREIGN KEY (`fault_report_id`) REFERENCES `fault_report`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE');
CALL grid_repair_add_fk('repair_ticket', 'repair_ticket_team_id_fkey',
    'ALTER TABLE `repair_ticket` ADD CONSTRAINT `repair_ticket_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `crew`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
CALL grid_repair_add_fk('spare_part_usage', 'spare_part_usage_ticket_id_fkey',
    'ALTER TABLE `spare_part_usage` ADD CONSTRAINT `spare_part_usage_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `repair_ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE');
CALL grid_repair_add_fk('ticket_event_log', 'ticket_event_log_ticket_id_fkey',
    'ALTER TABLE `ticket_event_log` ADD CONSTRAINT `ticket_event_log_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `repair_ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE');

DROP PROCEDURE IF EXISTS `grid_repair_add_fk`;

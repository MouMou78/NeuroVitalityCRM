CREATE TABLE `amplemarketListCache` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`listId` varchar(100) NOT NULL,
	`listName` varchar(500) NOT NULL,
	`owner` varchar(320),
	`shared` boolean DEFAULT false,
	`contactCount` int NOT NULL,
	`lastFetchedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `amplemarketListCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_list_unique` UNIQUE(`tenantId`,`listId`)
);
--> statement-breakpoint
CREATE TABLE `amplemarketSyncLogs` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`syncType` enum('full','incremental','preview','list_counts') NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`contactsCreated` int DEFAULT 0,
	`contactsUpdated` int DEFAULT 0,
	`contactsMerged` int DEFAULT 0,
	`conflictsDetected` int DEFAULT 0,
	`errors` json,
	`errorMessage` text,
	`metadata` json,
	`triggeredBy` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `amplemarketSyncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `amplemarket_list_cache_tenant_idx` ON `amplemarketListCache` (`tenantId`);--> statement-breakpoint
CREATE INDEX `amplemarket_sync_logs_tenant_idx` ON `amplemarketSyncLogs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `amplemarket_sync_logs_status_idx` ON `amplemarketSyncLogs` (`status`);--> statement-breakpoint
CREATE INDEX `amplemarket_sync_logs_started_idx` ON `amplemarketSyncLogs` (`startedAt`);
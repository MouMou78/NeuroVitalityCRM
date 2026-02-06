ALTER TABLE `amplemarketSyncLogs` ADD `correlationId` varchar(36);--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `listIdsScannedCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `leadIdsFetchedTotal` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `leadIdsDedupedTotal` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `contactsHydratedTotal` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `contactsWithOwnerFieldCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `keptOwnerMatch` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `discardedOwnerMismatch` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `created` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `updated` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `skipped` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `amplemarketSyncLogs` ADD `reason` varchar(100);
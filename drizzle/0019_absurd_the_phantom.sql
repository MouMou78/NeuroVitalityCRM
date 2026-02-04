CREATE TABLE `dealStages` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`order` int NOT NULL,
	`color` varchar(20) DEFAULT '#3b82f6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dealStages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`value` decimal(15,2),
	`currency` varchar(3) DEFAULT 'USD',
	`stageId` varchar(36) NOT NULL,
	`accountId` varchar(36),
	`contactId` varchar(36),
	`ownerUserId` varchar(36),
	`expectedCloseDate` timestamp,
	`probability` int DEFAULT 50,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `deal_stages_tenant_idx` ON `dealStages` (`tenantId`);--> statement-breakpoint
CREATE INDEX `deal_stages_tenant_order_idx` ON `dealStages` (`tenantId`,`order`);--> statement-breakpoint
CREATE INDEX `deals_tenant_idx` ON `deals` (`tenantId`);--> statement-breakpoint
CREATE INDEX `deals_stage_idx` ON `deals` (`stageId`);--> statement-breakpoint
CREATE INDEX `deals_account_idx` ON `deals` (`accountId`);--> statement-breakpoint
CREATE INDEX `deals_owner_idx` ON `deals` (`ownerUserId`);
CREATE TABLE `campaignRecipients` (
	`id` varchar(36) NOT NULL,
	`campaignId` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('pending','sent','failed','bounced') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`error` text,
	CONSTRAINT `campaignRecipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailAccounts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`smtpHost` text,
	`smtpPort` int,
	`smtpUser` text,
	`smtpPass` text,
	`imapHost` text,
	`imapPort` int,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketingCampaigns` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` enum('draft','scheduled','sending','sent','paused') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`recipientCount` int NOT NULL DEFAULT 0,
	`openCount` int NOT NULL DEFAULT 0,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketingCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `recipients_campaign_idx` ON `campaignRecipients` (`campaignId`);--> statement-breakpoint
CREATE INDEX `recipients_person_idx` ON `campaignRecipients` (`personId`);--> statement-breakpoint
CREATE INDEX `email_accounts_tenant_idx` ON `emailAccounts` (`tenantId`);--> statement-breakpoint
CREATE INDEX `email_accounts_user_idx` ON `emailAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `campaigns_tenant_idx` ON `marketingCampaigns` (`tenantId`);--> statement-breakpoint
CREATE INDEX `campaigns_user_idx` ON `marketingCampaigns` (`userId`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `marketingCampaigns` (`status`);
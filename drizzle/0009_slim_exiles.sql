CREATE TABLE `trackingEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`personId` varchar(36),
	`accountId` varchar(36),
	`eventType` enum('email_sent','email_opened','email_clicked','email_replied','page_view','demo_request','pricing_view','content_download','webinar_registration','trial_started') NOT NULL,
	`eventData` json DEFAULT ('{}'),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trackingEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tenant_person_idx` ON `trackingEvents` (`tenantId`,`personId`);--> statement-breakpoint
CREATE INDEX `tenant_account_idx` ON `trackingEvents` (`tenantId`,`accountId`);--> statement-breakpoint
CREATE INDEX `tenant_timestamp_idx` ON `trackingEvents` (`tenantId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `tenant_type_idx` ON `trackingEvents` (`tenantId`,`eventType`);
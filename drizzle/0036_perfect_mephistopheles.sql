CREATE TABLE `activities` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`personId` varchar(36),
	`accountId` varchar(36),
	`userId` varchar(36),
	`activityType` enum('email','call','meeting','note','task','deal_stage_change','tag_added','assignment_changed') NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`metadata` json,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailTrackingEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`emailId` varchar(36) NOT NULL,
	`personId` varchar(36),
	`eventType` enum('sent','delivered','opened','clicked','bounced','unsubscribed') NOT NULL,
	`clickedUrl` text,
	`userAgent` text,
	`ipAddress` varchar(45),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailTrackingEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activities_person_idx` ON `activities` (`personId`);--> statement-breakpoint
CREATE INDEX `activities_account_idx` ON `activities` (`accountId`);--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `activities` (`activityType`);--> statement-breakpoint
CREATE INDEX `activities_timestamp_idx` ON `activities` (`timestamp`);--> statement-breakpoint
CREATE INDEX `email_tracking_email_idx` ON `emailTrackingEvents` (`emailId`);--> statement-breakpoint
CREATE INDEX `email_tracking_person_idx` ON `emailTrackingEvents` (`personId`);--> statement-breakpoint
CREATE INDEX `email_tracking_type_idx` ON `emailTrackingEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `email_tracking_timestamp_idx` ON `emailTrackingEvents` (`timestamp`);
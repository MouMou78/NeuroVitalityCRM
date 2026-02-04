CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`type` enum('mention','reply','reaction') NOT NULL,
	`messageId` varchar(36),
	`channelId` varchar(36),
	`content` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_read_idx` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `created_idx` ON `notifications` (`createdAt`);
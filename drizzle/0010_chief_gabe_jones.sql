CREATE TABLE `channelMembers` (
	`id` varchar(36) NOT NULL,
	`channelId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastReadAt` timestamp,
	CONSTRAINT `channelMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `channel_user_unique` UNIQUE(`channelId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `channels` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`type` enum('public','private') NOT NULL DEFAULT 'public',
	`createdBy` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`archivedAt` timestamp,
	CONSTRAINT `channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directMessages` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`senderId` varchar(36) NOT NULL,
	`recipientId` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	`deletedAt` timestamp,
	CONSTRAINT `directMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messageReactions` (
	`id` varchar(36) NOT NULL,
	`messageId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`emoji` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageReactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_user_emoji_unique` UNIQUE(`messageId`,`userId`,`emoji`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`channelId` varchar(36),
	`userId` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`threadId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp,
	`deletedAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `channelMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `channels` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_name_idx` ON `channels` (`tenantId`,`name`);--> statement-breakpoint
CREATE INDEX `tenant_sender_recipient_idx` ON `directMessages` (`tenantId`,`senderId`,`recipientId`);--> statement-breakpoint
CREATE INDEX `tenant_recipient_idx` ON `directMessages` (`tenantId`,`recipientId`);--> statement-breakpoint
CREATE INDEX `created_idx` ON `directMessages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `message_idx` ON `messageReactions` (`messageId`);--> statement-breakpoint
CREATE INDEX `tenant_channel_idx` ON `messages` (`tenantId`,`channelId`);--> statement-breakpoint
CREATE INDEX `channel_created_idx` ON `messages` (`channelId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `thread_idx` ON `messages` (`threadId`);
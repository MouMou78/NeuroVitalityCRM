CREATE TABLE `typingIndicators` (
	`id` varchar(36) NOT NULL,
	`channelId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`lastTypingAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `typingIndicators_id` PRIMARY KEY(`id`),
	CONSTRAINT `channel_user_typing_unique` UNIQUE(`channelId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `channel_typing_idx` ON `typingIndicators` (`channelId`);--> statement-breakpoint
CREATE INDEX `last_typing_idx` ON `typingIndicators` (`lastTypingAt`);
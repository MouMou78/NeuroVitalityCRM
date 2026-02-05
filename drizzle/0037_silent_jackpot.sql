CREATE TABLE `enrollmentPathHistory` (
	`id` varchar(36) NOT NULL,
	`enrollmentId` varchar(36) NOT NULL,
	`nodeId` varchar(36) NOT NULL,
	`enteredAt` timestamp NOT NULL DEFAULT (now()),
	`exitedAt` timestamp,
	`edgeTaken` varchar(36),
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `enrollmentPathHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequenceEdges` (
	`id` varchar(36) NOT NULL,
	`sequenceId` varchar(36) NOT NULL,
	`sourceNodeId` varchar(36) NOT NULL,
	`targetNodeId` varchar(36) NOT NULL,
	`edgeType` enum('default','yes','no','variant_a','variant_b','goal_met','goal_not_met') NOT NULL DEFAULT 'default',
	`label` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sequenceEdges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequenceNodes` (
	`id` varchar(36) NOT NULL,
	`sequenceId` varchar(36) NOT NULL,
	`nodeType` enum('email','wait','condition','ab_split','goal_check','exit') NOT NULL,
	`position` json NOT NULL,
	`subject` text,
	`body` text,
	`waitDays` int,
	`waitUntilTime` varchar(20),
	`conditionType` enum('replied','not_replied','opened','not_opened','clicked_link','time_elapsed','custom_field','goal_achieved','negative_response'),
	`conditionConfig` json,
	`variantAPercentage` int,
	`goalType` enum('meeting_booked','demo_requested','replied','link_clicked','custom'),
	`label` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sequenceNodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `enrollment_node_idx` ON `enrollmentPathHistory` (`enrollmentId`,`nodeId`);--> statement-breakpoint
CREATE INDEX `enrollment_time_idx` ON `enrollmentPathHistory` (`enrollmentId`,`enteredAt`);--> statement-breakpoint
CREATE INDEX `sequence_edge_idx` ON `sequenceEdges` (`sequenceId`);--> statement-breakpoint
CREATE INDEX `source_node_idx` ON `sequenceEdges` (`sourceNodeId`);--> statement-breakpoint
CREATE INDEX `sequence_node_idx` ON `sequenceNodes` (`sequenceId`);
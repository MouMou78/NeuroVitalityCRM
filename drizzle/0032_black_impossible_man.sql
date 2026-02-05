ALTER TABLE `automationRules` MODIFY COLUMN `triggerType` enum('email_opened','email_replied','no_reply_after_days','meeting_held','stage_entered','deal_value_threshold','scheduled') NOT NULL;--> statement-breakpoint
ALTER TABLE `automationRules` ADD `schedule` text;--> statement-breakpoint
ALTER TABLE `automationRules` ADD `timezone` text DEFAULT ('UTC');--> statement-breakpoint
ALTER TABLE `automationRules` ADD `nextRunAt` timestamp;
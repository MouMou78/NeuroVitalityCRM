ALTER TABLE `users` ADD `twoFactorSecret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `backupCodes` json;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetExpires` timestamp;
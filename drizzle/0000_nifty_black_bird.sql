CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`market` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_owner_kind` ON `records` (`owner`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_records_market_kind` ON `records` (`market`,`kind`);
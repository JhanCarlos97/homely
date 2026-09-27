CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`contractor` text NOT NULL,
	`market` text NOT NULL,
	`project_id` text,
	`booking_id` text,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_project_id_unique` ON `contracts` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_booking_id_unique` ON `contracts` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_contracts_owner` ON `contracts` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_contracts_contractor` ON `contracts` (`contractor`);--> statement-breakpoint
CREATE TABLE `cost_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`market` text NOT NULL,
	`city` text NOT NULL,
	`service` text NOT NULL,
	`labor` real NOT NULL,
	`materials` real NOT NULL,
	`source` text NOT NULL,
	`observed` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cost_samples_location_service` ON `cost_samples` (`market`,`city`,`service`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated` text NOT NULL
);

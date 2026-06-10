CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pao_months` integer,
	`shelf_life_months` integer,
	`builtin` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category_id` text NOT NULL,
	`thumbnail_uri` text,
	`exp` text,
	`mfg` text,
	`opened_at` text,
	`pao_months` integer,
	`computed_expiry` text,
	`expiry_basis` text,
	`status` text DEFAULT 'unopened' NOT NULL,
	`location` text,
	`memo` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `episode` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feedId` integer NOT NULL,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`guid` text NOT NULL,
	`pubDate` timestamp NOT NULL,
	`duration` integer,
	`recorded` boolean,
	FOREIGN KEY (`feedId`) REFERENCES `feed`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feed` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`topic` text,
	`link` text NOT NULL,
	`earliest` timestamp NOT NULL,
	`lastCheck` timestamp
);

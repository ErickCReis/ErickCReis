CREATE TABLE `blog_post_daily_views` (
	`date` text NOT NULL,
	`slug` text NOT NULL,
	`views` integer NOT NULL,
	CONSTRAINT `blog_post_daily_views_pk` PRIMARY KEY(`date`, `slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_weekly_views` (
	`week_start` text NOT NULL,
	`slug` text NOT NULL,
	`views` integer NOT NULL,
	CONSTRAINT `blog_post_weekly_views_pk` PRIMARY KEY(`week_start`, `slug`)
);
--> statement-breakpoint
CREATE INDEX `blog_post_daily_views_date_idx` ON `blog_post_daily_views` (`date`);--> statement-breakpoint
CREATE INDEX `blog_post_weekly_views_week_start_idx` ON `blog_post_weekly_views` (`week_start`);
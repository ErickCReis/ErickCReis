CREATE TABLE `blog_post_view_totals` (
	`slug` text PRIMARY KEY,
	`total_views` integer NOT NULL,
	`updated_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `blog_post_view_visitors` (
	`slug` text NOT NULL,
	`visitor_id` text NOT NULL,
	`last_counted_at_ms` integer NOT NULL,
	CONSTRAINT `blog_post_view_visitors_pk` PRIMARY KEY(`slug`, `visitor_id`)
);
--> statement-breakpoint
CREATE INDEX `blog_post_view_visitors_last_counted_at_idx` ON `blog_post_view_visitors` (`last_counted_at_ms`);
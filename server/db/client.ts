import { Database } from "bun:sqlite";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { getDataPath } from "@server/data-dir";
import { schema } from "@server/db/schema";

const DEFAULT_DB_FILENAME = "server.sqlite";
const DEFAULT_MIGRATIONS_FOLDER = join(process.cwd(), "server", "db", "migrations");

export type CreateServerDatabaseOptions = {
  client?: Database;
  filePath?: string;
  migrationsFolder?: string;
};

function getDatabasePath(filePath?: string) {
  return filePath ?? getDataPath(DEFAULT_DB_FILENAME);
}

function getMigrationsFolder(migrationsFolder?: string) {
  return migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;
}

function configureSqlite(client: Database) {
  client.run("PRAGMA journal_mode = WAL");
  client.run("PRAGMA busy_timeout = 5000");
}

function openDatabase(filePath: string) {
  const client = new Database(filePath);
  configureSqlite(client);
  return client;
}

export function createServerDatabase(options: CreateServerDatabaseOptions = {}) {
  const client = options.client ?? openDatabase(getDatabasePath(options.filePath));
  if (options.client) {
    configureSqlite(client);
  }

  const db = drizzle({ client, schema });
  migrate(db, { migrationsFolder: getMigrationsFolder(options.migrationsFolder) });

  return {
    client,
    db,
    close: () => {
      client.close();
    },
  };
}

let singleton: ReturnType<typeof createServerDatabase> | null = null;

export function getServerDatabase() {
  if (singleton) return singleton;
  singleton = createServerDatabase();
  return singleton;
}

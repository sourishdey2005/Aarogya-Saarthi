/**
 * SQLite database layer.
 *
 * Uses the SQLite build that ships with Node (node:sqlite), so there is no
 * native module to compile and no external database server to run. The whole
 * backend is one process plus one file on disk.
 *
 * The SQL used by the handlers is written with `$1` style placeholders; this
 * client rewrites them to the `?` placeholders SQLite expects.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(here, '../db/migrations');

export interface SqlResult<T> {
  rows: T[];
  rowCount?: number;
  affectedRows?: number;
}

export interface SqlClient {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<SqlResult<T>>;
  /** Runs a script that contains several statements (migrations). */
  exec(sql: string): void;
  close(): void;
}

/**
 * Rewrites `$1, $2 ...` placeholders into the `?` form SQLite uses.
 * SQL that already uses `?` is passed through unchanged (the parameters are
 * then bound positionally).
 */
function toSqlite(text: string, params: unknown[]): { sql: string; values: unknown[] } {
  if (!/\$\d+/.test(text)) {
    return { sql: text, values: [...params] };
  }
  const values: unknown[] = [];
  const sql = text.replace(/\$(\d+)/g, (_match, index: string) => {
    values.push(params[Number(index) - 1]);
    return '?';
  });
  return { sql, values };
}

/** Opens a SQLite database and applies every pending migration. */
export function openDatabase(file: string): SqlClient {
  const resolved = file === ':memory:' ? file : path.resolve(file);

  if (resolved !== ':memory:') {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }

  const db = new DatabaseSync(resolved);

  // Durability + concurrency settings that suit a single node server.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  const runQuery = <T,>(text: string, params: unknown[] = []): SqlResult<T> => {
    const { sql, values } = toSqlite(text, params);
    const statement = db.prepare(sql);
    const rows = statement.all(...(values as never[])) as T[];
    return { rows, rowCount: rows.length, affectedRows: 0 };
  };

  const client: SqlClient = {
    query: async <T,>(text: string, params: unknown[] = []) => runQuery<T>(text, params),
    exec: (sql: string) => {
      db.exec(sql);
    },
    close: () => {
      db.close();
    },
  };

  migrate(client, runQuery);
  return client;
}

/** Applies the SQL files in db/migrations (idempotent, tracked in _migrations). */
export function migrate(
  client: SqlClient,
  run: <T>(text: string, params?: unknown[]) => SqlResult<T>
): string[] {
  client.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name       TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     )`
  );

  const applied = new Set(
    run<{ name: string }>('SELECT name FROM _migrations').rows.map((row) => row.name)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const executed: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    client.exec(sql);
    run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    executed.push(file);
  }
  return executed;
}

/**
 * The database file used by the API.
 *
 * - `SQLITE_PATH` always wins.
 * - On Vercel the filesystem is read only except for /tmp and instances are
 *   recycled, so the database is kept in /tmp (ephemeral).
 * - Everywhere else it lives in `data/aarogya.sqlite` next to the project.
 */
export function databaseFile(): string {
  if (process.env.SQLITE_PATH) return path.resolve(process.env.SQLITE_PATH);
  if (process.env.VERCEL) {
    console.warn(
      '[db] running on Vercel: the SQLite file in /tmp is ephemeral and is lost ' +
        'when the instance is recycled. Use a host with a persistent disk for real data.'
    );
    return path.join(os.tmpdir(), 'aarogya.sqlite');
  }
  return path.resolve(here, '../data/aarogya.sqlite');
}

let shared: SqlClient | null = null;

/**
 * The process wide database connection. It is opened (and migrated) on the
 * first use, so importing this module never touches the file system.
 */
export function getDatabase(): SqlClient {
  if (!shared) {
    shared = openDatabase(databaseFile());
  }
  return shared;
}

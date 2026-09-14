import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export type CsvColumnType = 'string' | 'number' | 'boolean';

export interface CsvColumn<T> {
  name: keyof T & string;
  type: CsvColumnType;
}

function serializeValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

function parseValue(raw: string, type: CsvColumnType): unknown {
  if (type === 'number') return raw === '' ? undefined : Number(raw);
  if (type === 'boolean') return raw === 'true';
  return raw;
}

/**
 * Typed read/write access to a single CSV file, with an in-process write
 * queue so concurrent append/update calls never interleave (see AGENTS.md
 * CSV concurrency guidance).
 */
export class CsvFileStore<T extends Record<string, unknown>> {
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly columns: CsvColumn<T>[],
  ) {}

  private get header(): string[] {
    return this.columns.map((column) => column.name);
  }

  async readAll(): Promise<T[]> {
    const content = await readFile(this.filePath, 'utf-8').catch(
      (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') return '';
        throw err;
      },
    );
    if (content.trim().length === 0) return [];
    const rows: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });
    return rows.map((row) => this.deserialize(row));
  }

  async append(record: T): Promise<T> {
    return this.enqueue(async () => {
      const rows = await this.readAll();
      rows.push(record);
      await this.writeAll(rows);
      return record;
    });
  }

  async update(
    predicate: (record: T) => boolean,
    updater: (record: T) => T,
  ): Promise<T | undefined> {
    return this.enqueue(async () => {
      const rows = await this.readAll();
      const index = rows.findIndex(predicate);
      if (index === -1) return undefined;
      const updated = updater(rows[index]);
      rows[index] = updated;
      await this.writeAll(rows);
      return updated;
    });
  }

  private deserialize(row: Record<string, string>): T {
    const result = {} as T;
    for (const column of this.columns) {
      (result as Record<string, unknown>)[column.name] = parseValue(
        row[column.name] ?? '',
        column.type,
      );
    }
    return result;
  }

  private serialize(record: T): Record<string, string> {
    const row: Record<string, string> = {};
    for (const column of this.columns) {
      row[column.name] = serializeValue(
        (record as Record<string, unknown>)[column.name],
      );
    }
    return row;
  }

  private async writeAll(records: T[]): Promise<void> {
    const csv = stringify(
      records.map((record) => this.serialize(record)),
      {
        header: true,
        columns: this.header,
      },
    );
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, csv, 'utf-8');
  }

  /** Serializes all write operations on this file through a single queue. */
  private enqueue<R>(task: () => Promise<R>): Promise<R> {
    const result = this.writeQueue.then(task, task);
    this.writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

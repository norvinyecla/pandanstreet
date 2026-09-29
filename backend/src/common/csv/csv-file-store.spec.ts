import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CsvFileStore, type CsvColumn } from './csv-file-store.js';

interface TestRecord extends Record<string, unknown> {
  id: string;
  label: string;
  count: number;
  active: boolean;
}

const columns: CsvColumn<TestRecord>[] = [
  { name: 'id', type: 'string' },
  { name: 'label', type: 'string' },
  { name: 'count', type: 'number' },
  { name: 'active', type: 'boolean' },
];

describe('CsvFileStore', () => {
  let dir: string;
  let filePath: string;
  let store: CsvFileStore<TestRecord>;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'csv-file-store-'));
    filePath = join(dir, 'nested', 'records.csv');
    store = new CsvFileStore<TestRecord>(filePath, columns);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns an empty array when the file does not exist yet', async () => {
    await expect(store.readAll()).resolves.toEqual([]);
  });

  it('appends records and creates parent directories as needed', async () => {
    await store.append({ id: '1', label: 'a, comma', count: 1, active: true });
    await store.append({ id: '2', label: 'plain', count: 2, active: false });

    const rows = await store.readAll();
    expect(rows).toEqual([
      { id: '1', label: 'a, comma', count: 1, active: true },
      { id: '2', label: 'plain', count: 2, active: false },
    ]);
  });

  it('appendUnless skips the append when a conflicting row exists', async () => {
    const sameId = (id: string) => (record: TestRecord) => record.id === id;
    const make = (id: string, label: string): TestRecord => ({
      id,
      label,
      count: 0,
      active: true,
    });

    const results = await Promise.all([
      store.appendUnless(sameId('1'), make('1', 'first')),
      store.appendUnless(sameId('1'), make('1', 'second')),
    ]);

    expect(results[0]).toEqual(make('1', 'first'));
    expect(results[1]).toBeUndefined();
    await expect(store.readAll()).resolves.toEqual([make('1', 'first')]);
  });

  it('round-trips values containing commas, quotes, and newlines', async () => {
    const record: TestRecord = {
      id: '1',
      label: 'has "quotes", commas,\nand a newline',
      count: 7,
      active: true,
    };
    await store.append(record);

    const rows = await store.readAll();
    expect(rows).toEqual([record]);
  });

  it('updates a matching record in place', async () => {
    await store.append({ id: '1', label: 'first', count: 1, active: false });
    await store.append({ id: '2', label: 'second', count: 2, active: false });

    const updated = await store.update(
      (record) => record.id === '2',
      (record) => ({ ...record, active: true }),
    );

    expect(updated).toEqual({
      id: '2',
      label: 'second',
      count: 2,
      active: true,
    });
    const rows = await store.readAll();
    expect(rows).toEqual([
      { id: '1', label: 'first', count: 1, active: false },
      { id: '2', label: 'second', count: 2, active: true },
    ]);
  });

  it('returns undefined from update when no record matches', async () => {
    await store.append({ id: '1', label: 'first', count: 1, active: false });

    const updated = await store.update(
      (record) => record.id === 'missing',
      (record) => record,
    );

    expect(updated).toBeUndefined();
  });

  it('removes a matching record', async () => {
    await store.append({ id: '1', label: 'first', count: 1, active: false });
    await store.append({ id: '2', label: 'second', count: 2, active: false });

    const removed = await store.remove((record) => record.id === '1');

    expect(removed).toBe(true);
    const rows = await store.readAll();
    expect(rows).toEqual([
      { id: '2', label: 'second', count: 2, active: false },
    ]);
  });

  it('returns false from remove when no record matches', async () => {
    await store.append({ id: '1', label: 'first', count: 1, active: false });

    const removed = await store.remove((record) => record.id === 'missing');

    expect(removed).toBe(false);
    const rows = await store.readAll();
    expect(rows).toHaveLength(1);
  });

  it('serializes concurrent writes through the per-file queue without losing records', async () => {
    const writes = Array.from({ length: 20 }, (_, i) =>
      store.append({
        id: String(i),
        label: `label-${i}`,
        count: i,
        active: i % 2 === 0,
      }),
    );
    await Promise.all(writes);

    const rows = await store.readAll();
    expect(rows).toHaveLength(20);
    const ids = rows.map((row) => row.id).sort((a, b) => Number(a) - Number(b));
    expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => String(i)));
  });

  it('interleaves concurrent appends and updates without corrupting the file', async () => {
    await store.append({ id: '1', label: 'first', count: 0, active: false });

    const appends = Array.from({ length: 5 }, (_, i) =>
      store.append({
        id: `extra-${i}`,
        label: `extra-${i}`,
        count: i,
        active: false,
      }),
    );
    const update = store.update(
      (record) => record.id === '1',
      (record) => ({ ...record, count: record.count + 1 }),
    );

    await Promise.all([...appends, update]);

    const rows = await store.readAll();
    expect(rows).toHaveLength(6);
    const first = rows.find((row) => row.id === '1');
    expect(first?.count).toBe(1);
  });
});

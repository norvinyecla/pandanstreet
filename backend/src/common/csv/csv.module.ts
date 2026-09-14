import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCsvStores, type CsvStores } from './csv-stores.js';

export const CSV_STORES = Symbol('CSV_STORES');

/** Provides the shared, app-wide CsvStores instance rooted at `DATA_DIR` (default: `backend/data`). */
@Global()
@Module({
  providers: [
    {
      provide: CSV_STORES,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CsvStores => {
        const dataDir =
          config.get<string>('DATA_DIR') ?? join(process.cwd(), 'data');
        return createCsvStores(dataDir);
      },
    },
  ],
  exports: [CSV_STORES],
})
export class CsvModule {}

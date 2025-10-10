import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

type ConfigLike =
  | Pick<ConfigService, 'get'>
  | { get: (key: string) => string | undefined };

export const buildDataSourceOptions = (
  config: ConfigLike,
): DataSourceOptions => {
  const databaseUrl = config.get('DATABASE_URL');
  let options: DataSourceOptions;

  if (databaseUrl) {
    options = { type: 'postgres', url: databaseUrl };
  } else {
    options = {
      type: 'postgres',
      host: config.get('POSTGRES_HOST') || 'db',
      port: Number(config.get('POSTGRES_PORT') || 5432),
      username: config.get('POSTGRES_USER') || 'postgres',
      password: config.get('POSTGRES_PASSWORD') || 'postgres',
      database: config.get('POSTGRES_DB') || 'busmedaus',
    };
  }

  return {
    ...options,
    entities: [path.join(__dirname, '**/*.entity.{js,ts}')],
    migrations: [path.join(__dirname, 'migrations/*.{js,ts}')],
    synchronize: false,
    logging: false,
  };
};

export const dataSource = new DataSource(
  buildDataSourceOptions({ get: (key: string) => process.env[key] }),
);

export default (config: ConfigService): DataSourceOptions =>
  buildDataSourceOptions(config);

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

loadEnv();

const dbUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${
    process.env.POSTGRES_PASSWORD || 'postgres'
  }@${process.env.POSTGRES_HOST || 'db'}:${process.env.POSTGRES_PORT || '5432'}/${
    process.env.POSTGRES_DB || 'busmedaus'
  }`;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  synchronize: false,
  logging: false,
  entities: [path.join(__dirname, '**/*.entity.{js,ts}')],
  migrations: [path.join(__dirname, 'migrations', '*-*.js')],
});

export default AppDataSource;

import { ConfigService } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";
import { User } from "./users/user.entity";
import { Hive } from "./hives/hive.entity";
import { Task } from "./tasks/task.entity";
import { TaskStep } from "./tasks/steps/task-step.entity";
import { Assignment } from "./assignments/assignment.entity";
import { StepProgress } from "./progress/step-progress.entity";
import { Notification } from "./notifications/notification.entity";
import { ActivityLog } from "./activity-log/activity-log.entity";
import { Group } from "./groups/group.entity";
import { GroupMember } from "./groups/group-member.entity";
import { InitialMigration1720000000000 } from "./migrations/1720000000000-InitialMigration";
import { AddGroups1722000000000 } from "./migrations/1722000000000-AddGroups";
type ConfigLike =
  | Pick<ConfigService, "get">
  | { get: (key: string) => string | undefined };
export const buildDataSourceOptions = (
  config: ConfigLike,
): DataSourceOptions => {
  const databaseUrl = config.get("DATABASE_URL");
  let options: DataSourceOptions;
  if (databaseUrl) {
    options = { type: "postgres", url: databaseUrl };
  } else {
    options = {
      type: "postgres",
      host: "db",
      port: 5432,
      username: config.get("POSTGRES_USER") || "postgres",
      password: config.get("POSTGRES_PASSWORD") || "postgres",
      database: config.get("POSTGRES_DB") || "busmedaus",
    } as DataSourceOptions;
  }
  return {
    ...options,
    entities: [
      User,
      Hive,
      Task,
      TaskStep,
      Assignment,
      StepProgress,
      Notification,
      ActivityLog,
      Group,
      GroupMember,
    ],
    migrations: [InitialMigration1720000000000, AddGroups1722000000000],
    synchronize: false,
    logging: false,
  };
};
export const dataSource = new DataSource(
  buildDataSourceOptions({ get: (key: string) => process.env[key] }),
);
export default (config: ConfigService): DataSourceOptions =>
  buildDataSourceOptions(config);

import type { HiveHistoryEventResponse, SupportAttachmentPayload } from '@/lib/api';

export type HistoryEventDescriptor = {
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
  attachments?: SupportAttachmentPayload[];
};

const HISTORY_FIELD_LABELS: Record<string, string> = {
  label: 'Pavadinimas',
  location: 'Lokacija',
  tag: 'Žyma',
};

const HISTORY_EVENT_LABELS: Record<HiveHistoryEventResponse['type'], string> = {
  HIVE_UPDATED: 'Avilio pakeitimai',
  TASK_ASSIGNED: 'Priskirta užduotis',
  TASK_DATES_CHANGED: 'Atnaujinti terminai',
  TASK_COMPLETED: 'Užduotis užbaigta',
  MANUAL_NOTE: 'Rankinis įrašas',
};

const historyDateFormatter = new Intl.DateTimeFormat('lt-LT', { dateStyle: 'medium' });
const historyDateTimeFormatter = new Intl.DateTimeFormat('lt-LT', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const parseDateValue = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
};

const formatHistoryDateValue = (value: unknown) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'nenurodyta';
  }

  return historyDateFormatter.format(parsed);
};

const toPrintableValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '—';
  }

  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : '—';
};

const buildAssignmentLink = (assignmentId?: unknown) => {
  if (typeof assignmentId !== 'string' || !assignmentId) {
    return undefined;
  }

  return `/tasks/${assignmentId}/run`;
};

export const formatHiveHistoryTimestamp = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return value;
  }

  return historyDateTimeFormatter.format(parsed);
};

export const getHiveHistoryEventLabel = (type: HiveHistoryEventResponse['type']) =>
  HISTORY_EVENT_LABELS[type] ?? 'Įvykis';

export const getHiveHistoryActorLabel = (event: HiveHistoryEventResponse) => {
  const name = typeof event.user?.name === 'string' ? event.user.name.trim() : '';
  if (name) {
    return name;
  }

  const email = typeof event.user?.email === 'string' ? event.user.email.trim() : '';
  if (email) {
    return email;
  }

  return 'Sistema';
};

export const describeHiveHistoryEvent = (
  event: HiveHistoryEventResponse,
): HistoryEventDescriptor => {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (event.type) {
    case 'HIVE_UPDATED': {
      const changedFields = (payload.changedFields ?? {}) as Record<
        string,
        { before?: unknown; after?: unknown }
      >;

      const changeLines = Object.entries(changedFields).map(([fieldKey, values]) => {
        const label = HISTORY_FIELD_LABELS[fieldKey] ?? fieldKey;
        const before = toPrintableValue(values?.before ?? null);
        const after = toPrintableValue(values?.after ?? null);
        return `${label}: „${before}“ → „${after}“`;
      });

      return {
        title: 'Atnaujinta avilio informacija',
        description: changeLines.length
          ? changeLines.join(' · ')
          : 'Įrašyta nauja informacija apie avilį.',
      };
    }
    case 'TASK_ASSIGNED': {
      const taskTitle = typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Užduotis';
      const startLabel = formatHistoryDateValue(payload.startDate);
      const dueLabel = formatHistoryDateValue(payload.dueDate);
      const link = buildAssignmentLink(payload.assignmentId);
      return {
        title: `Priskirta užduotis „${taskTitle}“`,
        description: `Pradžia: ${startLabel} · Pabaiga: ${dueLabel}`,
        link,
        linkLabel: link ? 'Peržiūrėti užduotį' : undefined,
      };
    }
    case 'TASK_DATES_CHANGED': {
      const taskTitle = typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Užduotis';
      const link = buildAssignmentLink(payload.assignmentId);
      const dateChanges: string[] = [];

      if ('previousStartDate' in payload || 'nextStartDate' in payload) {
        dateChanges.push(
          `Pradžia: ${formatHistoryDateValue(payload.previousStartDate)} → ${formatHistoryDateValue(
            payload.nextStartDate,
          )}`,
        );
      }

      if ('previousDueDate' in payload || 'nextDueDate' in payload) {
        dateChanges.push(
          `Pabaiga: ${formatHistoryDateValue(payload.previousDueDate)} → ${formatHistoryDateValue(
            payload.nextDueDate,
          )}`,
        );
      }

      return {
        title: `Atnaujinti terminai „${taskTitle}“`,
        description: dateChanges.length ? dateChanges.join(' · ') : 'Atnaujintas grafikas.',
        link,
        linkLabel: link ? 'Peržiūrėti užduotį' : undefined,
      };
    }
    case 'TASK_COMPLETED': {
      const taskTitle = typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Užduotis';
      const link = buildAssignmentLink(payload.assignmentId);
      return {
        title: `Užbaigta užduotis „${taskTitle}“`,
        description: 'Visi šios užduoties veiksmai atlikti 100 %.',
        link,
        linkLabel: link ? 'Peržiūrėti užduotį' : undefined,
      };
    }
    case 'MANUAL_NOTE': {
      const attachments =
        Array.isArray(payload.attachments) && payload.attachments.length
          ? (payload.attachments as SupportAttachmentPayload[])
          : [];
      const text = typeof payload.text === 'string' ? payload.text : '';
      return {
        title: 'Rankinis įrašas istorijoje',
        description: text || 'Naujas komentaras avilio istorijoje.',
        attachments,
      };
    }
    default:
      return {
        title: 'Įrašas istorijoje',
        description: 'Užfiksuotas avilio įvykis.',
      };
  }
};

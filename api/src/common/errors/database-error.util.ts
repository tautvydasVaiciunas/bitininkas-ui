import { BadRequestException, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

const logger = new Logger('DatabaseErrorTranslator');

type DriverError = {
  code?: unknown;
  detail?: unknown;
  message?: unknown;
};

const EXTRACT_COLUMN_REGEX = /\(([^)]+)\)=/;
const EXTRACT_COLUMN_FALLBACK_REGEX = /column "([^"]+)"/i;

const extractColumnName = (detail?: string) => {
  if (!detail) {
    return undefined;
  }

  const match = detail.match(EXTRACT_COLUMN_REGEX);
  if (match?.[1]) {
    return match[1];
  }

  const fallbackMatch = detail.match(EXTRACT_COLUMN_FALLBACK_REGEX);
  return fallbackMatch?.[1];
};

const buildDetailsMessage = (code: string | undefined, column: string | undefined) => {
  if (code === '23505') {
    return column
      ? `Laukas „${column}“ turi būti unikalus`
      : 'Reikšmė turi būti unikali';
  }

  if (code === '23503') {
    return column
      ? `Susijęs laukas „${column}“ nurodo neegzistuojantį įrašą`
      : 'Susijęs įrašas nerastas';
  }

  if (code === '23514') {
    return 'Pažeisti duomenų apribojimai';
  }

  if (code === '23502') {
    return column
      ? `Laukas „${column}“ yra privalomas`
      : 'Trūksta privalomos reikšmės';
  }

  return 'Neteisingi duomenys';
};

export interface DatabaseErrorContext {
  message: string;
  code?: string;
}

export const translateDatabaseError = (
  error: unknown,
  context: DatabaseErrorContext,
): never => {
  if (error instanceof QueryFailedError) {
    const driverError: DriverError =
      (error as QueryFailedError & { driverError?: DriverError }).driverError ?? {};
    const code = typeof driverError.code === 'string' ? driverError.code : undefined;
    const detailCandidate = driverError.detail ?? driverError.message;
    const detail = typeof detailCandidate === 'string' ? detailCandidate : undefined;
    const column = extractColumnName(detail);

    const details = buildDetailsMessage(code, column);

    if (process.env.NODE_ENV !== 'test') {
      logger.warn(`Database klaida (${code ?? 'unknown'}): ${details}`);
    }

    throw new BadRequestException({
      message: context.message,
      code: context.code,
      details,
    });
  }

  throw error;
};

export const runWithDatabaseErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: DatabaseErrorContext,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    translateDatabaseError(error, context);
    throw error as any;
  }
};

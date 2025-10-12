import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY_REGEX.exec(value);
  if (!match) {
    return false;
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  const date = new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function IsDateOnlyString(validationOptions?: ValidationOptions) {
  return function (object: Record<string, unknown>, propertyName: string) {
    registerDecorator({
      name: 'isDateOnlyString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          return isValidDateOnly(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid date string in the format YYYY-MM-DD`;
        },
      },
    });
  };
}

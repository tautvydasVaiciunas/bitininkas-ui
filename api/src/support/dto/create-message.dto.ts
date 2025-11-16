import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsEnum(['image', 'video', 'other'])
  kind!: 'image' | 'video' | 'other';

  @IsOptional()
  sizeBytes?: number;
}

@ValidatorConstraint({ name: 'SupportMessageContent', async: false })
class SupportMessageContentConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const value = args.object as CreateMessageDto;
    const trimmedText =
      typeof value.text === 'string' ? value.text.trim() : undefined;
    const hasText = typeof trimmedText === 'string' && trimmedText.length > 0;
    const hasAttachments =
      Array.isArray(value.attachments) && value.attachments.length > 0;
    return hasText || hasAttachments;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Žinutėje turi būti tekstas arba priedas.';
  }
}

export class CreateMessageDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Validate(SupportMessageContentConstraint)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentDto)
  attachments?: CreateAttachmentDto[];
}

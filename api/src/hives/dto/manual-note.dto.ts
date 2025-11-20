import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, ValidateNested } from 'class-validator';

export type ManualNoteAttachmentKind = 'image' | 'video' | 'other';

export class ManualNoteAttachmentDto {
  @IsString()
  url!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  sizeBytes!: number;

  @IsEnum(['image', 'video', 'other'])
  kind!: ManualNoteAttachmentKind;
}

export class CreateManualNoteDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualNoteAttachmentDto)
  attachments?: ManualNoteAttachmentDto[];
}

export class UpdateManualNoteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualNoteAttachmentDto)
  attachments?: ManualNoteAttachmentDto[];
}

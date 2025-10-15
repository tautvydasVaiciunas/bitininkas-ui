import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderTemplateStepsDto {
  @IsArray({ message: 'Reikia pateikti šablono žingsnių sąrašą' })
  @ArrayMinSize(1, { message: 'Mažiausiai vienas šablono žingsnis privalomas' })
  @IsUUID('4', { each: true, message: 'Šablono žingsnio ID turi būti teisingas UUID' })
  stepIds!: string[];
}

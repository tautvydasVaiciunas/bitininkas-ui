import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssignmentReviewStatus } from '../assignment.entity';

export class ReviewAssignmentDto {
  @IsEnum([AssignmentReviewStatus.APPROVED, AssignmentReviewStatus.REJECTED], {
    message: 'Neteisinga peržiūros būsena',
  })
  status!: AssignmentReviewStatus.APPROVED | AssignmentReviewStatus.REJECTED;

  @IsOptional()
  @IsString({ message: 'Komentaras turi būti tekstas' })
  @MaxLength(1000, { message: 'Komentaras gali būti iki 1000 simbolių' })
  comment?: string;
}

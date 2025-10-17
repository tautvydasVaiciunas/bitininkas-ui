import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { CompleteStepDto } from './dto/complete-step.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('progress/step-complete')
  complete(@Body() dto: CompleteStepDto, @Request() req) {
    return this.progressService.completeStep(dto, req.user);
  }

  @Patch('progress/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProgressDto, @Request() req) {
    return this.progressService.update(id, dto, req.user);
  }

  @Delete('progress/:id')
  remove(@Param('id') id: string, @Request() req) {
    return this.progressService.remove(id, req.user);
  }

  @Get('assignments/:id/progress')
  completion(
    @Param('id') id: string,
    @Request() req,
    @Query('userId') userId?: string,
  ) {
    return this.progressService.assignmentCompletion(id, req.user, userId);
  }

  @Get('assignments/:id/progress/list')
  list(
    @Param('id') id: string,
    @Request() req,
    @Query('userId') userId?: string,
  ) {
    return this.progressService.listForAssignment(id, req.user, userId);
  }
}

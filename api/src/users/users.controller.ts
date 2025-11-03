import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

const listUsersValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: (validationErrors: ValidationError[] = []) => {
    const collectMessages = (errors: ValidationError[]): string[] => {
      const result: string[] = [];

      for (const error of errors) {
        if (error.constraints) {
          result.push(...Object.values(error.constraints));
        }

        if (error.children?.length) {
          result.push(...collectMessages(error.children));
        }
      }

      return result;
    };

    const messages = Array.from(
      new Set(
        collectMessages(validationErrors).filter((message): message is string => Boolean(message)),
      ),
    );

    return new BadRequestException({
      message: 'Pateikti duomenys neteisingi',
      details: messages.length ? messages : undefined,
    });
  },
});

@Controller('users')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UsePipes(listUsersValidationPipe)
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findByIdOrFail(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Request() req,
  ) {
    return this.usersService.updateRole(id, updateUserRoleDto, req.user);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }
}
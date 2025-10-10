import { Body, Controller, Patch, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Patch()
  update(@Body() dto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.id, dto).then((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      address: user.address ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }
}

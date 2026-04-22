import { Controller, Get, Param, Req } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/user-role.enum';
import { ConstructionService } from './construction.service';
import { ApiResponse } from 'src/common/dtos/response.dto';

@Controller('construction')
export class ConstructionController {
    constructor(private readonly constructionService: ConstructionService) { }
    @Roles(UserRole.ADMIN, UserRole.USER)
    @Get()
    async getAll(@Req() req) {
        console.log(req.user)
        return new ApiResponse("Obras recuperadas",
        await this.constructionService.getAll(req.user));

    }

    @Roles(UserRole.ADMIN, UserRole.USER)
    @Get(":id")
    async getById(@Param('id') id:string) {
        console.log(id);
        return new ApiResponse("Obra recuperada",
        await this.constructionService.getById(id));

    }
}

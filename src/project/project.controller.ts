import { Controller, Get, Param, Req } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/user-role.enum';
import { ApiResponse } from 'src/common/dtos/response.dto';

@Controller('project')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }
        @Roles(UserRole.ADMIN, UserRole.USER)
        @Get()
        async getAll(@Req() req) {
            console.log(req.user)
            return new ApiResponse("Projetos recuperados",
            await this.projectService.getAll(req.user));
    
        }
    
        @Roles(UserRole.ADMIN, UserRole.USER)
        @Get(":id")
        async getById(@Param('id') id:string) {
            
            return new ApiResponse("Projeto recuperado",
            await this.projectService.getById(id));
    
        }

        @Roles(UserRole.ADMIN,UserRole.USER)
        @Get("construction/:id")
        async getByConstruction(@Param('id') id:string){
            return new ApiResponse("Projetos recuperado",
            await this.projectService.getByConstruction(id));

        }
}

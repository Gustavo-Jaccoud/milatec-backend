import { Controller, Get, Param, Req } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/user-role.enum';
import { ApiResponse } from 'src/common/dtos/response.dto';

@Controller('delivery')
export class DeliveryController {
    constructor(private readonly deliveryService: DeliveryService) { }
            @Roles(UserRole.ADMIN, UserRole.USER)
            @Get()
            async getAll(@Req() req) {
                console.log(req.user)
                return new ApiResponse("Entregas recuperadas",
                await this.deliveryService.getAll(req.user));
        
            }
        
            @Roles(UserRole.ADMIN, UserRole.USER)
            @Get(":id")
            async getById(@Param('id') id:string) {
                
                return new ApiResponse("Entrega recuperada",
                await this.deliveryService.getById(id));
        
            }
    
            @Roles(UserRole.ADMIN,UserRole.USER)
            @Get("construction/:id")
            async getByConstruction(@Param('id') id:string){
                return new ApiResponse("Entregas recuperada",
                await this.deliveryService.getByConstruction(id));
    
            }
}

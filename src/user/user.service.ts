import { Injectable } from '@nestjs/common';
import { User } from './user.model';
import { UserRole } from './user-role.enum';

@Injectable()
export class UserService {

   async getUser(userEmail: string){
        return new User("Teste",userEmail,UserRole.USER); 
    }

}

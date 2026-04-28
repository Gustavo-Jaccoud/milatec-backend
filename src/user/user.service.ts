import { Inject, Injectable } from '@nestjs/common';
import { User } from './user.model';
import { UserRole } from './user-role.enum';
import Airtable from 'airtable';
import { AirtableService } from 'src/airtable/airtable.service';

@Injectable()
export class UserService {
    constructor(private readonly airtableService: AirtableService) { }

    async getUser(userEmail: string) {
        var response = await this.airtableService.getUserByEmail(userEmail)
        if (!response) {
            return
        }
        var user = new User(String(response.nomeCompleto),
            userEmail, Boolean(response.ativo), UserRole.USER, response?.empresa, response?.id)
        console.log(user)
        return user;
    }
}


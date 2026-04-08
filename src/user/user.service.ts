import { Inject, Injectable } from '@nestjs/common';
import { User } from './user.model';
import { UserRole } from './user-role.enum';

@Injectable()
export class UserService {
    constructor(@Inject('AIRTABLE_CLIENT') private readonly airtable: any) { }

    async getUser(userEmail: string) {
        var response = await this.findByEmail("ANDRÉ SILVEIRA")
        if(!response){
            return
        }
        var user = new User(response?.nomeCompleto,
            userEmail, UserRole.USER, response?.empresa, response?.id)
        console.log(user)
        return user;
    }

    private async findByEmail(email: string) {
        const records = await this.airtable('Contatos')

            .select({
                filterByFormula: `{Nome completo} = "${email}"`,
                maxRecords: 1,
            })
            .firstPage();

        if (!records.length) return null;

        console.log(records)
        const record = records[0];

        return {
            id: record.id,
            nomeCompleto: record.fields["Nome completo"], 
            empresa: record.fields["Empresa"]?.[0] || null
        };

    }
}

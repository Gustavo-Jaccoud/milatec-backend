import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/user-role.enum';
import { User } from 'src/user/user.model';

@Injectable()
export class ConstructionService {
    constructor(@Inject('AIRTABLE_CLIENT') private readonly airtable: any) { }

    async getAll(user: User) {

        const query = {
            fields: [
                "Orçamentos",
                "Tipo de orçamento",
                "Cidade da obra",
                "EmpresaId"
            ],
            filterByFormula: `{EmpresaId}="recOAwFNXjz1CgW6O"`
        };

        if (user.role === UserRole.ADMIN) {
            query.filterByFormula = "";
        }

        const records = await this.airtable('Orçamentos').select(query).all();

        return records.map(record => ({
            id: record.id,
            ...record.fields
        }));

    }

    async getById(constructionId: string) {
        try {
            const record = await this.airtable('Orçamentos').find(constructionId)
            return {
                id: record.id,
                ...record.fields
            }
        }
        catch (error) {
            console.log(error)
            throw new BadRequestException("Orçamento não encontrado");
        }
    }

}

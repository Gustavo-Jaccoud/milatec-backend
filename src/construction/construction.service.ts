import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AirtableService } from 'src/airtable/airtable.service';
import { QueryAirtable } from 'src/airtable/query.airtable';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/user-role.enum';
import { User } from 'src/user/user.model';

@Injectable()
export class ConstructionService {
    constructor(private readonly airtableService: AirtableService) { }

    async getAll(user: User) {

        const query = new QueryAirtable([
                "Orçamentos",
                "Tipo de orçamento",
                "Cidade da obra",
                "EmpresaId",
                "Etapa do negócio"
            ], `{EmpresaId}="recOAwFNXjz1CgW6O"`
        )

        if (user.role === UserRole.ADMIN) {
            query.filterByFormula = "";
        }

        return await this.airtableService.getAll("Orçamentos",query);

    }

    async getById(constructionId: string) {
        try {
            return await this.airtableService.getById("Orçamentos",constructionId)
        }
        catch (error) {
            console.log(error)
            throw new BadRequestException("Orçamento não encontrado");
        }
    }

}

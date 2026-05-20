import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AirtableService } from 'src/airtable/airtable.service';
import { QueryAirtable } from 'src/airtable/query.airtable';
import { UserRole } from 'src/user/user-role.enum';
import { User } from 'src/user/user.model';

@Injectable()
export class ProjectService {
    constructor(private readonly airtableService: AirtableService) { }

    async getAll(user: User) {
        const query = new QueryAirtable([
            "Orçamentos",
            "Tipo de orçamento",
            "Cidade da obra",
            "OrcamentoNome",
            "OrcamentoId",
            "Etapa do negócio",
            "Projeto",
            "Data de criação"
        ], `{EmpresaId}="rec1chb4BKL01ZPVq"`)

        if (user.role === UserRole.ADMIN) {
            query.filterByFormula = "";
        }

        return await this.airtableService.getAll("Projetos", query)

    }

    async getById(projectId: string) {
        try {
            return await this.airtableService.getById("Projetos", projectId)
        }
        catch (error) {
            console.log(error)
            throw new BadRequestException("Projeto não encontrado");
        }
    }
    async getByConstruction(constructionId: string) {
        try {
            const query = new QueryAirtable([
                "Projeto",
                "Tipo de orçamento",
                "ProjetoId",
                "Etapa do Projeto",
                "Quantidade",
                "Valor total (Projeto)",
                "Produto"],
                `{OrcamentoId}="${constructionId}"`)

            return await this.airtableService.getAll("Projetos", query)
        }
        catch (error) {
            console.log(error)
            throw new BadRequestException("Projetos não encontrado");
        }
    }
}

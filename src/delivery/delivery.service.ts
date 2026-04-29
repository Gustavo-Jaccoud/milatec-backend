import { BadRequestException, Injectable } from '@nestjs/common';
import { AirtableService } from 'src/airtable/airtable.service';
import { QueryAirtable } from 'src/airtable/query.airtable';
import { UserRole } from 'src/user/user-role.enum';
import { User } from 'src/user/user.model';

@Injectable()
export class DeliveryService {
    constructor(private readonly airtableService: AirtableService) { }

    async getAll(user: User) {

        const query = new QueryAirtable([
            "Entregas",
            "Cidade da obra (from Orçamentos)",
            "Data de entrega",
            "Pedido produzido",
        ], `{EmpresaId}="recOAwFNXjz1CgW6O"`
        )

        if (user.role === UserRole.ADMIN) {
            query.filterByFormula = "";
        }

        return await this.airtableService.getAll("Entregas", query);

    }

    async getById(deliveryId: string) {
        try {
            return await this.airtableService.getById("Entregas", deliveryId)
        }
        catch (error) {
            console.log(error)
            throw new BadRequestException("Entrega não encontrada");
        }
    }
    async getByConstruction(constructionId: string) {
        try {
            const query = new QueryAirtable([
                "Entregas",
                "Cidade da obra (from Orçamentos)",
                "Data de entrega",
                "Pedido produzido"],
                `{OrcamentoId}="${constructionId}"`)

            return await this.airtableService.getAll("Entregas", query)
        }
        catch (error) {
            console.log(error)
            throw new BadRequestException("Entrega não encontrada");
        }
    }
}

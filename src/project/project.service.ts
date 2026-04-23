import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from 'src/user/user-role.enum';
import { User } from 'src/user/user.model';

@Injectable()
export class ProjectService {
    constructor(@Inject('AIRTABLE_CLIENT') private readonly airtable: any) { }
    
        async getAll(user: User) {
    
            const query = {
                fields: [
                    "Orçamentos",
                    "Tipo de orçamento",
                    "Cidade da obra",
                    "OrcamentosId",
                    "Etapa do negócio"
                ],
                filterByFormula: `{EmpresaId}="rec1chb4BKL01ZPVq"`
            };
    
            if (user.role === UserRole.ADMIN) {
                query.filterByFormula = "";
            }
    
            const records = await this.airtable('Projetos').select(query).all();
    
            return records.map(record => ({
                id: record.id,
                ...record.fields
            }));
    
        }
    
        async getById(projectId: string) {
            try {
                const record = await this.airtable('Projetos').find(projectId)
                return {
                    id: record.id,
                    ...record.fields
                }
            }
            catch (error) {
                console.log(error)
                throw new BadRequestException("Projeto não encontrado");
            }
        }
}

import { Injectable } from '@nestjs/common';
import Airtable from 'airtable';
import { QueryAirtable } from './query.airtable';

@Injectable()
export class AirtableService {
    private airtable: Airtable.Base;

    constructor() {
        const airtable = new Airtable({
            apiKey: process.env.AIRTABLE_API_KEY,
        });
        this.airtable = airtable.base(process.env.AIRTABLE_BASE_ID!);
    }

    async getUserByEmail(email: string){
        const records = await this.airtable('Contatos').select({
            filterByFormula: `{E-mail} = "${email}"`,
            maxRecords: 1,
        }).firstPage();
        if (!records.length) return null;

        const record = records[0];

        return {
            id: record.id,
            nomeCompleto: record.fields["Nome completo"], 
            empresa: record.fields["Empresa"]?.[0] || null,
            ativo: record.fields["Ativo"] || false
        };
    }

    async getAll(tableName: string, query?: QueryAirtable) {
        console.log(query)
        const records = await this.airtable.table(tableName).select({...query}).all();
        return records.map(record => ({
            id: record.id,
            ...record.fields
        }));



    }
    async getById(tableName: string, id: string) {
        const record = await this.airtable.table(tableName).find(id);
        return {
            id: record.id,
            ...record.fields
        }
    }

}
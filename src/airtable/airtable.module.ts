import { Module } from '@nestjs/common';
import { AirtableProvider } from './airtable.provider';

@Module({
    providers:[AirtableProvider],
    exports:[AirtableProvider]
})
export class AirtableModule {}

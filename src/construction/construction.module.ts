import { Module } from '@nestjs/common';
import { ConstructionController } from './construction.controller';
import { ConstructionService } from './construction.service';
import { AirtableModule } from 'src/airtable/airtable.module';

@Module({
  controllers: [ConstructionController],
  imports:[AirtableModule],
  providers: [ConstructionService]
})
export class ConstructionModule {}

import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { AirtableModule } from 'src/airtable/airtable.module';

@Module({
  controllers: [ProjectController],
  imports:[AirtableModule],
  providers: [ProjectService]
})
export class ProjectModule {}

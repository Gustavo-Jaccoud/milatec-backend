import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AirtableModule } from 'src/airtable/airtable.module';

@Module({
  providers: [UserService],
  imports:[AirtableModule]
})
export class UserModule {}

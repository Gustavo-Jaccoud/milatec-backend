import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { AirtableModule } from 'src/airtable/airtable.module';

@Module({
  controllers: [DeliveryController],
  imports:[AirtableModule],
  providers: [DeliveryService]
})
export class DeliveryModule {}

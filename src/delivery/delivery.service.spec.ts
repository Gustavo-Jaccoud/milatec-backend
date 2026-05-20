import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AirtableService } from 'src/airtable/airtable.service';
import { createMockAirtableService } from 'test/mocks/airtable.service.mock';
import { userAdmin, userRegular } from 'test/fixtures/users.fixture';
import { sampleRecord, sampleRecords } from 'test/fixtures/records.fixture';
import { DeliveryService } from './delivery.service';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let airtableService: ReturnType<typeof createMockAirtableService>;

  beforeEach(async () => {
    airtableService = createMockAirtableService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: AirtableService, useValue: airtableService },
      ],
    }).compile();

    service = module.get(DeliveryService);
  });

  describe('getAll', () => {
    it('filtra por empresa quando usuario e USER', async () => {
      const result = await service.getAll(userRegular);

      expect(airtableService.getAll).toHaveBeenCalledWith(
        'Entregas',
        expect.objectContaining({
          filterByFormula: expect.stringContaining('EmpresaId'),
        }),
      );
      expect(result).toEqual(sampleRecords);
    });

    it('remove filtro de empresa quando usuario e ADMIN', async () => {
      await service.getAll(userAdmin);

      expect(airtableService.getAll).toHaveBeenCalledWith(
        'Entregas',
        expect.objectContaining({ filterByFormula: '' }),
      );
    });
  });

  describe('getById', () => {
    it('retorna entrega quando encontrada', async () => {
      const result = await service.getById('rec123');

      expect(airtableService.getById).toHaveBeenCalledWith('Entregas', 'rec123');
      expect(result).toEqual(sampleRecord);
    });

    it('lanca BadRequestException quando entrega nao existe', async () => {
      airtableService.getById.mockRejectedValue(new Error('not found'));

      await expect(service.getById('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getByConstruction', () => {
    it('busca entregas pelo OrcamentoId', async () => {
      const result = await service.getByConstruction('recOrcamento1');

      expect(airtableService.getAll).toHaveBeenCalledWith(
        'Entregas',
        expect.objectContaining({
          filterByFormula: '{OrcamentoId}="recOrcamento1"',
        }),
      );
      expect(result).toEqual(sampleRecords);
    });

    it('lanca BadRequestException em falha na busca', async () => {
      airtableService.getAll.mockRejectedValue(new Error('fail'));

      await expect(service.getByConstruction('bad')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AirtableService } from 'src/airtable/airtable.service';
import { createMockAirtableService } from 'test/mocks/airtable.service.mock';
import { userAdmin, userRegular } from 'test/fixtures/users.fixture';
import { sampleRecord, sampleRecords } from 'test/fixtures/records.fixture';
import { ConstructionService } from './construction.service';

describe('ConstructionService', () => {
  let service: ConstructionService;
  let airtableService: ReturnType<typeof createMockAirtableService>;

  beforeEach(async () => {
    airtableService = createMockAirtableService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructionService,
        { provide: AirtableService, useValue: airtableService },
      ],
    }).compile();

    service = module.get(ConstructionService);
  });

  describe('getAll', () => {
    it('filtra por empresa quando usuario e USER', async () => {
      const result = await service.getAll(userRegular);

      expect(airtableService.getAll).toHaveBeenCalledWith(
        'Orçamentos',
        expect.objectContaining({
          filterByFormula: expect.stringContaining('EmpresaId'),
        }),
      );
      expect(result).toEqual(sampleRecords);
    });

    it('remove filtro de empresa quando usuario e ADMIN', async () => {
      await service.getAll(userAdmin);

      expect(airtableService.getAll).toHaveBeenCalledWith(
        'Orçamentos',
        expect.objectContaining({ filterByFormula: '' }),
      );
    });
  });

  describe('getById', () => {
    it('retorna obra quando encontrada', async () => {
      const result = await service.getById('rec123');

      expect(airtableService.getById).toHaveBeenCalledWith(
        'Orçamentos',
        'rec123',
      );
      expect(result).toEqual(sampleRecord);
    });

    it('lanca BadRequestException quando obra nao existe', async () => {
      airtableService.getById.mockRejectedValue(new Error('not found'));

      await expect(service.getById('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

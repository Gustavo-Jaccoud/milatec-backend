import { sampleRecord, sampleRecords } from 'test/fixtures/records.fixture';

export const createMockAirtableService = () => ({
  getAll: jest.fn().mockResolvedValue([...sampleRecords]),
  getById: jest.fn().mockResolvedValue({ ...sampleRecord }),
  getUserByEmail: jest.fn().mockResolvedValue(null),
});

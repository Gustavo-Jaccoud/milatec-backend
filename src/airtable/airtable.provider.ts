import Airtable from 'airtable';

export const AirtableProvider = {
  provide: 'AIRTABLE_CLIENT',
  useFactory: () => {
    return new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID!);
  },
};
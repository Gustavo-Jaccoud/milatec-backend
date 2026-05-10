const fs = require('fs');
const Airtable = require('airtable');

function readEnv() {
  const env = {};
  const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = readEnv();
  const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);

  const email = 'hugo.mramos@souunit.com.br';
  const formula = `{E-mail} = "${email}"`;

  const existing = await base('Contatos')
    .select({ filterByFormula: formula, maxRecords: 1 })
    .firstPage();

  if (existing.length) {
    console.log(`USER_ALREADY_EXISTS ${existing[0].id}`);
    return;
  }

  const created = await base('Contatos').create([
    {
      fields: {
        'Nome completo': 'Hugo Teste',
        'E-mail': email,
        Ativo: true,
        Empresa: ['recWyy0BH10S7K72H'],
      },
    },
  ]);

  console.log(`USER_CREATED ${created[0].id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

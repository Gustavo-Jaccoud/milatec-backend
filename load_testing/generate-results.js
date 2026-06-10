const fs = require('fs');
const path = require('path');
const START_MARKER = '<!-- AUTO_RESULTS_START -->';
const END_MARKER = '<!-- AUTO_RESULTS_END -->';

const SUMMARY_FILES = [
  { label: 'login.test.js', file: 'load_testing/reports/login-summary.json' },
  { label: 'projects.test.js', file: 'load_testing/reports/projects-summary.json' },
  { label: 'construction.test.js', file: 'load_testing/reports/construction-summary.json' },
  { label: 'delivery.test.js', file: 'load_testing/reports/delivery-summary.json' },
  { label: 'full-load.test.js', file: 'load_testing/reports/full-summary.json' },
];

function readJsonIfExists(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function ms(value) {
  if (value === undefined || value === null) return 'n/a';
  return `${Number(value).toFixed(2)}ms`;
}

function collectFailedChecks(group, acc = []) {
  if (!group) return acc;
  const checks = group.checks || {};
  for (const [name, info] of Object.entries(checks)) {
    if ((info?.fails || 0) > 0) {
      acc.push(`- ${name}: ${info.fails} falhas`);
    }
  }
  const groups = group.groups || {};
  for (const sub of Object.values(groups)) {
    collectFailedChecks(sub, acc);
  }
  return acc;
}

function formatSummary(label, data) {
  const m = data.metrics || {};
  const failedChecks = collectFailedChecks(data.root_group).slice(0, 8);

  return [
    `## ${label}`,
    `- p95: ${ms(m.http_req_duration?.['p(95)'] || 0)}`,
    `- p99: ${ms(m.http_req_duration?.['p(99)'])}`,
    `- erro (custom): ${pct(m.error_rate?.value || 0)}`,
    `- falha HTTP: ${pct(m.http_req_failed?.value || 0)}`,
    `- throughput: ${(m.http_reqs?.rate || 0).toFixed(2)} req/s`,
    failedChecks.length ? '- checks com impacto:' : '- checks com impacto: nenhum',
    ...failedChecks,
    '',
  ].join('\n');
}

function main() {
  const sections = SUMMARY_FILES.map(({ label, file }) => {
    const data = readJsonIfExists(file);
    if (!data) {
      return [`## ${label}`, `- arquivo ausente: ${file}`, ''].join('\n');
    }
    return formatSummary(label, data);
  });

  const output = ['# Resumo automatico de load test', '', ...sections].join('\n');

  if (process.argv.includes('--write')) {
    const resultsPath = path.resolve('load_testing/RESULTS.md');
    const original = fs.readFileSync(resultsPath, 'utf8');
    const block = `${START_MARKER}\n${output}\n${END_MARKER}`;

    let updated;
    if (original.includes(START_MARKER) && original.includes(END_MARKER)) {
      const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, 'm');
      updated = original.replace(pattern, block);
    } else {
      updated = `${original.trimEnd()}\n\n## Resumo gerado automaticamente\n\n${block}\n`;
    }

    fs.writeFileSync(resultsPath, updated, 'utf8');
    console.log(`Resumo atualizado em ${resultsPath}`);
    return;
  }

  console.log(output);
}

main();

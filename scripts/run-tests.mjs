import { spawnSync } from 'node:child_process';

const incoming = process.argv.slice(2);
const filtered = incoming.filter((arg) => !['--runInBand', '--verbose'].includes(arg));

const result = spawnSync(
  'node',
  ['--import', 'tsx', '--test', 'tests/**/*.test.ts', ...filtered],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);

process.exit(result.status ?? 1);

import { spawnSync } from 'node:child_process';

const incoming = process.argv.slice(2);
const filtered = incoming.filter((arg) => !['--runInBand', '--verbose'].includes(arg));

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', ...filtered],
  { stdio: 'inherit', shell: false }
);

process.exit(result.status ?? 1);

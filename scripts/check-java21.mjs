import { spawnSync } from 'node:child_process';

function parseJavaMajor(versionOutput) {
  const match = versionOutput.match(/version\s+"([^"]+)"/i);
  if (!match) {
    return null;
  }

  const raw = match[1];
  if (raw.startsWith('1.')) {
    const legacy = Number(raw.split('.')[1]);
    return Number.isFinite(legacy) ? legacy : null;
  }

  const major = Number(raw.split('.')[0]);
  return Number.isFinite(major) ? major : null;
}

const result = spawnSync('java', ['-version'], { encoding: 'utf8' });

if (result.error) {
  console.error('❌ Java runtime is not available on PATH. Install JDK 21+ to run Firebase emulators.');
  process.exit(1);
}

const output = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
const major = parseJavaMajor(output);

if (!major) {
  console.error('❌ Unable to detect Java version from `java -version` output.');
  console.error(output);
  process.exit(1);
}

if (major < 21) {
  console.error(`❌ Detected Java ${major}. Firebase emulators require Java 21+.`);
  console.error('   Install/activate a JDK 21 runtime, then rerun smoke tests.');
  process.exit(1);
}

console.log(`✅ Java ${major} detected (meets Firebase emulators requirement).`);

import fs from 'node:fs';
import path from 'node:path';

const REQUIREMENTS_PATH = process.env.REQUIREMENTS_PATH || 'docs/REQUIREMENTS.md';
const MATRIX_PATH = process.env.REQUIREMENTS_MATRIX_PATH || 'docs/requirements-verification.json';
const REPORT_PATH = process.env.REQUIREMENTS_REPORT_PATH || 'artifacts/requirements-verification-report.json';
const STRICT_ALL = process.env.REQUIREMENTS_STRICT_ALL === 'true';

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseTableRow(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function pickRequirementColumn(headers, statusIndex) {
  const candidates = ['Requirement', 'Feature', 'Integration', 'Item', 'Area', 'Aspect', 'Component'];
  for (const label of candidates) {
    const idx = headers.findIndex((value) => value.toLowerCase() === label.toLowerCase());
    if (idx >= 0 && idx !== statusIndex) {
      return idx;
    }
  }

  for (let index = 0; index < headers.length; index++) {
    if (index !== statusIndex) {
      return index;
    }
  }

  return -1;
}

function parseCompletedRequirements(markdown) {
  const lines = markdown.split(/\r?\n/);
  const results = [];
  let currentSection = 'Uncategorized';

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (/^###\s+/.test(line)) {
      currentSection = line.replace(/^###\s+/, '').trim();
      continue;
    }

    if (!line.startsWith('|')) {
      continue;
    }

    const nextLine = lines[index + 1] || '';
    if (!nextLine.startsWith('|') || !/^[|\s:-]+$/.test(nextLine)) {
      continue;
    }

    const headers = parseTableRow(line);
    const statusIndex = headers.findIndex((header) => /status/i.test(header));
    if (statusIndex < 0) {
      continue;
    }

    const requirementIndex = pickRequirementColumn(headers, statusIndex);
    let rowIndex = index + 2;

    while (rowIndex < lines.length && lines[rowIndex].startsWith('|')) {
      const cells = parseTableRow(lines[rowIndex]);
      const status = cells[statusIndex] || '';
      if (status.includes('✅')) {
        const requirement = (cells[requirementIndex] || '').trim();
        if (requirement.length > 0) {
          results.push({
            section: currentSection,
            requirement,
            status
          });
        }
      }
      rowIndex++;
    }

    index = rowIndex - 1;
  }

  return results;
}

function requirementKey(section, requirement) {
  return `${section}::${requirement}`;
}

function ensureDirectory(filePath) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function writeReport(report) {
  ensureDirectory(REPORT_PATH);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

function loadMatrix() {
  const parsed = JSON.parse(readText(MATRIX_PATH));
  if (!Array.isArray(parsed.items)) {
    throw new Error('requirements-verification.json must include an items array.');
  }
  return parsed;
}

function summarizeFailures(lines) {
  if (lines.length === 0) {
    return;
  }

  for (const line of lines) {
    console.error(`- ${line}`);
  }
}

function main() {
  if (!fs.existsSync(REQUIREMENTS_PATH)) {
    throw new Error(`Requirements file not found at ${REQUIREMENTS_PATH}`);
  }

  if (!fs.existsSync(MATRIX_PATH)) {
    throw new Error(`Verification matrix file not found at ${MATRIX_PATH}`);
  }

  const completed = parseCompletedRequirements(readText(REQUIREMENTS_PATH));
  const matrix = loadMatrix();

  const matrixByRequirement = new Map();
  const duplicateKeys = [];

  for (const item of matrix.items) {
    const key = requirementKey(item.section, item.requirement);
    if (matrixByRequirement.has(key)) {
      duplicateKeys.push(key);
    }
    matrixByRequirement.set(key, item);
  }

  const completedKeys = new Set();
  const unmappedCompleted = [];
  const enforcedUnverified = [];
  const malformedEnforced = [];
  const designUnlinkedEnforced = [];

  for (const item of completed) {
    const key = requirementKey(item.section, item.requirement);
    completedKeys.add(key);

    const mapped = matrixByRequirement.get(key);
    if (!mapped) {
      unmappedCompleted.push(`${item.section} → ${item.requirement}`);
      continue;
    }

    if (mapped.enforced) {
      if (mapped.verificationStatus !== 'verified') {
        enforcedUnverified.push(`${item.section} → ${item.requirement} (status=${mapped.verificationStatus})`);
      }
      if (!Array.isArray(mapped.evidence) || mapped.evidence.length === 0 || !mapped.lastVerifiedAt) {
        malformedEnforced.push(`${item.section} → ${item.requirement}`);
      }

      if (!mapped.persona || !mapped.flow || !mapped.designRef) {
        designUnlinkedEnforced.push(`${item.section} → ${item.requirement}`);
      }
    }
  }

  const enforcedMissingFromCompleted = [];
  for (const item of matrix.items) {
    if (!item.enforced) {
      continue;
    }
    const key = requirementKey(item.section, item.requirement);
    if (!completedKeys.has(key)) {
      enforcedMissingFromCompleted.push(`${item.section} → ${item.requirement}`);
    }
  }

  const blockingFailures = [
    ...duplicateKeys.map((entry) => `Duplicate matrix key: ${entry}`),
    ...enforcedUnverified.map((entry) => `Enforced requirement not verified: ${entry}`),
    ...enforcedMissingFromCompleted.map((entry) => `Enforced matrix entry does not match a ✅ requirement: ${entry}`),
    ...malformedEnforced.map((entry) => `Enforced requirement missing evidence/lastVerifiedAt: ${entry}`),
    ...designUnlinkedEnforced.map((entry) => `Enforced requirement missing persona/flow/designRef: ${entry}`)
  ];

  if (STRICT_ALL) {
    blockingFailures.push(...unmappedCompleted.map((entry) => `Completed requirement missing matrix mapping (strict): ${entry}`));
  }

  const report = {
    timestamp: new Date().toISOString(),
    strictAll: STRICT_ALL,
    source: {
      requirementsPath: REQUIREMENTS_PATH,
      matrixPath: MATRIX_PATH
    },
    summary: {
      completedRequirements: completed.length,
      matrixEntries: matrix.items.length,
      unmappedCompleted: unmappedCompleted.length,
      enforcedUnverified: enforcedUnverified.length,
      enforcedMissingFromCompleted: enforcedMissingFromCompleted.length,
      malformedEnforced: malformedEnforced.length,
      designUnlinkedEnforced: designUnlinkedEnforced.length,
      duplicateKeys: duplicateKeys.length,
      blockingFailures: blockingFailures.length
    },
    details: {
      unmappedCompleted,
      enforcedUnverified,
      enforcedMissingFromCompleted,
      malformedEnforced,
      designUnlinkedEnforced,
      duplicateKeys
    }
  };

  writeReport(report);

  console.log('Requirements verification summary:');
  console.log(`- Completed requirements in doc: ${report.summary.completedRequirements}`);
  console.log(`- Matrix entries: ${report.summary.matrixEntries}`);
  console.log(`- Unmapped completed: ${report.summary.unmappedCompleted}`);
  console.log(`- Enforced unverified: ${report.summary.enforcedUnverified}`);
  console.log(`- Enforced drift: ${report.summary.enforcedMissingFromCompleted}`);
  console.log(`- Enforced without design linkage: ${report.summary.designUnlinkedEnforced}`);
  console.log(`- Report: ${REPORT_PATH}`);

  if (blockingFailures.length > 0) {
    console.error('\nRequirements verification failed with blocking issues:');
    summarizeFailures(blockingFailures);
    process.exit(1);
  }

  if (unmappedCompleted.length > 0) {
    console.warn('\nRequirements verification warning: completed requirements are not fully mapped yet.');
    summarizeFailures(unmappedCompleted.map((entry) => `Unmapped (non-blocking in phased mode): ${entry}`));
  }

  console.log('Requirements verification passed.');
}

main();
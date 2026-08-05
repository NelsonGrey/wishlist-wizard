import fs from 'node:fs';
import path from 'node:path';

const TRACEABILITY_PATH = process.env.REQUIREMENTS_TRACEABILITY_PATH || 'docs/requirements/traceability-matrix.json';
const REPORT_PATH = process.env.REQUIREMENTS_TRACEABILITY_REPORT_PATH || 'artifacts/requirements-traceability-report.json';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDirectory(filePath) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function writeReport(report) {
  ensureDirectory(REPORT_PATH);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

function toIdSet(items) {
  return new Set(items.map((item) => item.id));
}

function isArrayWithValues(value) {
  return Array.isArray(value) && value.length > 0;
}

function main() {
  if (!fs.existsSync(TRACEABILITY_PATH)) {
    throw new Error(`Traceability matrix file not found at ${TRACEABILITY_PATH}`);
  }

  const matrix = readJson(TRACEABILITY_PATH);
  const businessRequirements = Array.isArray(matrix.businessRequirements) ? matrix.businessRequirements : [];
  const technicalRequirements = Array.isArray(matrix.technicalRequirements) ? matrix.technicalRequirements : [];
  const workPackages = Array.isArray(matrix.workPackages) ? matrix.workPackages : [];

  const businessIds = toIdSet(businessRequirements);
  const technicalIds = toIdSet(technicalRequirements);
  const workPackageIds = toIdSet(workPackages);

  const failures = [];
  const warnings = [];

  if (businessRequirements.length === 0) {
    failures.push('No business requirements found in matrix.');
  }
  if (technicalRequirements.length === 0) {
    failures.push('No technical requirements found in matrix.');
  }
  if (workPackages.length === 0) {
    failures.push('No work packages found in matrix.');
  }

  for (const br of businessRequirements) {
    if (!isArrayWithValues(br.mapsToTechnical)) {
      failures.push(`${br.id}: missing mapsToTechnical links.`);
    }
    if (!isArrayWithValues(br.mapsToWorkPackages)) {
      failures.push(`${br.id}: missing mapsToWorkPackages links.`);
    }

    for (const trId of br.mapsToTechnical || []) {
      if (!technicalIds.has(trId)) {
        failures.push(`${br.id}: references unknown technical requirement ${trId}.`);
      }
    }

    for (const wpId of br.mapsToWorkPackages || []) {
      if (!workPackageIds.has(wpId)) {
        failures.push(`${br.id}: references unknown work package ${wpId}.`);
      }
    }

    if ((br.priority === 'P0') && !isArrayWithValues(br.verificationSignals)) {
      failures.push(`${br.id}: P0 requirement must define at least one verification signal.`);
    }
  }

  for (const tr of technicalRequirements) {
    if (!isArrayWithValues(tr.mapsToWorkPackages)) {
      failures.push(`${tr.id}: missing mapsToWorkPackages links.`);
      continue;
    }

    for (const wpId of tr.mapsToWorkPackages) {
      if (!workPackageIds.has(wpId)) {
        failures.push(`${tr.id}: references unknown work package ${wpId}.`);
      }
    }

    const linkedByBusiness = businessRequirements.some((br) => (br.mapsToTechnical || []).includes(tr.id));
    if (!linkedByBusiness) {
      warnings.push(`${tr.id}: not referenced by any business requirement.`);
    }
  }

  for (const wp of workPackages) {
    const linkedByBusiness = businessRequirements.some((br) => (br.mapsToWorkPackages || []).includes(wp.id));
    const linkedByTechnical = technicalRequirements.some((tr) => (tr.mapsToWorkPackages || []).includes(wp.id));
    if (!linkedByBusiness && !linkedByTechnical) {
      warnings.push(`${wp.id}: not referenced by business or technical requirements.`);
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    source: TRACEABILITY_PATH,
    summary: {
      businessRequirements: businessRequirements.length,
      technicalRequirements: technicalRequirements.length,
      workPackages: workPackages.length,
      warnings: warnings.length,
      failures: failures.length
    },
    warnings,
    failures
  };

  writeReport(report);

  console.log('Traceability verification summary:');
  console.log(`- Business requirements: ${report.summary.businessRequirements}`);
  console.log(`- Technical requirements: ${report.summary.technicalRequirements}`);
  console.log(`- Work packages: ${report.summary.workPackages}`);
  console.log(`- Warnings: ${report.summary.warnings}`);
  console.log(`- Failures: ${report.summary.failures}`);
  console.log(`- Report: ${REPORT_PATH}`);

  if (warnings.length > 0) {
    console.warn('\nTraceability warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error('\nTraceability verification failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Traceability verification passed.');
}

main();

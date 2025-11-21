# 🧪 Automated CI/CD Testing

This directory contains automated testing for the Wishlist Wizard CI/CD pipeline.

## 🚀 Quick Start

### Run Automated Tests Locally

```bash
# Run the full automated CI/CD test suite
./test-ci-cd-automated.sh
```

This script will:
- ✅ Test environment determination logic
- ✅ Run quality checks (TypeScript, unit tests, security audit)
- ✅ Build all packages (web, functions, browser-extension, shared)
- ✅ Test extension packaging
- ✅ Test environment file generation
- ✅ Clean up all test artifacts

### GitHub Actions Automated Testing

The CI/CD pipeline includes automated testing that runs on:

- **Push to test branches**: `test-ci-cd`, `test-pipeline`
- **Scheduled runs**: Daily at 2 AM UTC
- **Manual trigger**: Via GitHub Actions UI

#### Test Workflow Features

- **Fully Automated**: No manual intervention required
- **Comprehensive Coverage**: Tests all pipeline components
- **Self-Cleaning**: Automatically removes test artifacts
- **Detailed Reporting**: Generates test summary reports
- **Safe Testing**: Never deploys to production environments

#### Test Environments

- **DEVELOPMENT**: Default test environment
- **STAGING**: Optional staging environment testing
- **PRODUCTION**: Optional production environment validation

## 📊 Test Results

Test results are automatically generated and include:

- Environment determination validation
- Quality check results (TypeScript, tests, security)
- Package build status
- Extension packaging verification
- Environment configuration testing
- Deployment readiness assessment

## 🛠️ Test Configuration

### Automated Triggers

```yaml
on:
  push:
    branches: [ test-ci-cd, test-pipeline ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:     # Manual trigger available
```

### Test Scopes

- **full**: Complete pipeline testing (default)
- **build-only**: Build testing only
- **environment-only**: Environment logic testing only

## 🔧 Manual Testing

For manual testing with specific configurations:

1. Go to GitHub Actions → "CI/CD Pipeline Test"
2. Click "Run workflow"
3. Select test scope and environment
4. Monitor the workflow execution

## 🧹 Cleanup

The automated test workflow includes automatic cleanup:

- Test environment files
- Test extension packages
- Temporary build artifacts
- Test result summaries (optional)

Manual cleanup can be performed with:

```bash
# Clean test artifacts
rm -rf chrome-extension-package-test/
rm -f wishlist-wizard-extension-test.zip
rm -f packages/web/.env.test
rm -f test-results-summary.md
```

## 📈 Monitoring

Monitor test results through:

- **GitHub Actions logs**: Detailed execution logs
- **Test summaries**: Generated in workflow runs
- **Status badges**: Available in repository README
- **Notifications**: Configurable for test failures

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**: Check Node.js version and dependencies
2. **Test Failures**: Review test logs and fix failing tests
3. **Extension Packaging**: Verify manifest.json and build outputs
4. **Environment Variables**: Ensure test environment files are generated

### Debug Mode

Enable debug logging by setting:

```bash
export DEBUG=test-ci-cd:*
./test-ci-cd-automated.sh
```

## 📚 Related Documentation

- [CI/CD Pipeline](../.github/workflows/ci-cd-pipeline.yml)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Development Setup](../docs/ENVIRONMENT_SETUP.md)
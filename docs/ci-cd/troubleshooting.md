# CI/CD Pipeline & Testcontainer Troubleshooting Guide

This guide provides solutions for common issues that may occur when running CI/CD pipelines with Testcontainers.

## General Docker Issues

### Docker Service Not Available

**Problem**: The pipeline cannot connect to the Docker daemon.

**Solution**:

- Check if Docker is running on the CI/CD runner
- Ensure Docker socket settings are correct
- GitHub Actions: Check the `services` configuration
- GitLab CI: Check the `docker:dind` service configuration

```yaml
# GitHub Actions correction
services:
  docker:
    image: docker:dind
    options: >-
      --privileged
      -v /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 2375:2375
```

### Docker Permission Issues

**Problem**: Insufficient permissions for Docker operations.

**Solution**:

- Add the `--privileged` option to the Docker service
- Ensure the CI/CD runner has the necessary rights

## Testcontainers-specific Issues

### Container Start Fails

**Problem**: Testcontainers cannot start containers.

**Solution**:

- Make sure environment variables are set correctly:

  ```
  TESTCONTAINERS_HOST_OVERRIDE=localhost (for GitHub Actions)
  TESTCONTAINERS_HOST_OVERRIDE=docker (for GitLab CI)
  DOCKER_HOST=unix:///var/run/docker.sock (for GitHub Actions)
  DOCKER_HOST=tcp://docker:2375 (for GitLab CI)
  ```

- Check Docker network settings and ports

### Container Cannot Communicate

**Problem**: Containers start, but tests cannot connect.

**Solution**:

- Check network settings between the test runner and containers
- Make sure you use the `getMappedPort()` method in tests, not the standard port
- Test network connectivity before running actual tests:

```typescript
it('should establish connection', async () => {
  const client = createClient({
    port: container.getMappedPort(5432),
    host: container.getHost(),
    // ...
  });
  
  const isConnected = await client.connect();
  expect(isConnected).toBeTruthy();
});
```

### Slow Tests in CI

**Problem**: Tests with Testcontainers are slow in CI/CD.

**Solution**:

- Enable container reuse with `TESTCONTAINERS_REUSE_ENABLE=true`
- Pull frequently used images in advance:

  ```yaml
  - docker pull postgres:latest
  - docker pull redis:latest
  ```

- Optimize test configuration for parallel execution
- Use Docker layer cache in CI/CD

## Build Issues

### Build Fails Due to Missing Dependencies

**Problem**: The build fails due to missing Node modules.

**Solution**:

- Ensure caching is correctly configured:

  ```yaml
  # GitHub Actions
  - name: Cache Bun dependencies
    uses: actions/cache@v3
    with:
      path: |
        ~/.bun/install/cache
        node_modules
      key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
  
  # GitLab CI
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .bun-install/cache
  ```

- Always use `--frozen-lockfile` with `bun install`

### Environment Variables Not Available

**Problem**: Environment variables are not available in CI/CD.

**Solution**:

- Add missing environment variables in the repository settings
- For GitHub: Secrets and Variables > Actions
- For GitLab: Settings > CI/CD > Variables
- Check variable referencing in CI/CD files

## Test Reporting Issues

### Missing Test Reports

**Problem**: Test reports are not saved as artifacts.

**Solution**:

- Make sure reports are generated in the correct format
- Check path configuration in `actions/upload-artifact` or `artifacts.paths`
- Add a debugging step to confirm the existence of files:

  ```yaml
  - name: Debug artifacts
    run: ls -la coverage/ test-results/
  ```

### Issues with Coverage Reports

**Problem**: Coverage reports are not generated correctly.

**Solution**:

- Update Jest configuration for coverage reports:

  ```json
  "jest": {
    "coverageReporters": ["json", "lcov", "text", "clover", "cobertura"]
  }
  ```

- Make sure `test:cov` is correctly configured in `package.json`

## Other Issues

### Badge Shows Incorrect Information

**Problem**: GitHub/GitLab badges show incorrect build status information.

**Solution**:

- Update the badge URL with the correct parameters
- For GitHub Actions:

  ```markdown
  ![Tests](https://github.com/username/repo/actions/workflows/test.yml/badge.svg)
  ```

- For GitLab CI:

  ```markdown
  ![Pipeline Status](https://gitlab.com/username/repo/badges/main/pipeline.svg)
  ```

### Different Node.js/Bun Versions

**Problem**: Different versions between local and CI environment.

**Solution**:

- Fix the Node.js/Bun version in the CI/CD configuration:

  ```yaml
  # GitHub Actions
  - name: Setup Bun
    uses: oven-sh/setup-bun@v1
    with:
      bun-version: '1.0.0' # Specific version
  
  # GitLab CI
  variables:
    BUN_VERSION: "1.0.0" # Specific version
  ```

- Make sure `.node-version` or similar files are present

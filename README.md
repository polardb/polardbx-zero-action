# Setup PolarDB-X Zero

A GitHub Action that creates an ephemeral [PolarDB-X](https://www.alibabacloud.com/product/polardbx) database instance for CI testing. The instance is automatically cleaned up after the job completes.

## Features

- **One-line setup** - Add a single step to get a fully functional MySQL-compatible database
- **Complete isolation** - Every workflow run gets its own dedicated instance
- **Auto cleanup** - Instance is deleted when the job finishes, even on failure
- **Zero maintenance** - No database servers to manage, no test data to clean up

## Quick Start

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: polardb/polardbx-zero-action@v1
        id: db

      - name: Run tests
        env:
          DATABASE_URL: ${{ steps.db.outputs.url }}
        run: npm test
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `api-key` | `""` | PolarDB-X Zero API key (`pxk_xxx`) for higher quotas. Store in GitHub Secrets. |
| `ttl-minutes` | `30` | Instance time-to-live in minutes. |
| `edition` | `standard` | Instance edition: `standard` (single-node) or `enterprise` (distributed). |
| `tag` | auto | Tag to identify the instance. Auto-generated from `GITHUB_RUN_ID` if empty. |
| `api-url` | `https://zero.polardbx.com/api/v1` | API base URL. Override for self-hosted deployments. |
| `wait-timeout` | `120` | Seconds to wait for MySQL to become connectable. |

## Outputs

| Output | Example | Description |
|--------|---------|-------------|
| `url` | `mysql://user:pass@host:3306` | MySQL connection URL |
| `jdbc-url` | `jdbc:mysql://host:3306/?useSSL=true` | JDBC connection URL |
| `host` | `pxzeroxxxx.polardbx.rds.aliyuncs.com` | MySQL host |
| `port` | `3306` | MySQL port |
| `user` | `polardbx_root` | MySQL username |
| `password` | `xxxxxxxx` | MySQL password (masked in logs) |
| `instance-id` | `pxz_aBcDeFg...` | Instance ID |

## Examples

### Python + pytest

```yaml
- uses: polardb/polardbx-zero-action@v1
  id: db

- name: Run tests
  env:
    DATABASE_URL: ${{ steps.db.outputs.url }}
  run: pytest tests/ -v
```

### Node.js + Prisma

```yaml
- uses: polardb/polardbx-zero-action@v1
  id: db

- name: Migrate & test
  env:
    DATABASE_URL: ${{ steps.db.outputs.url }}
  run: |
    npx prisma migrate deploy
    npm test
```

### Java + Spring Boot

```yaml
- uses: polardb/polardbx-zero-action@v1
  id: db

- name: Run tests
  env:
    SPRING_DATASOURCE_URL: ${{ steps.db.outputs.jdbc-url }}
    SPRING_DATASOURCE_USERNAME: ${{ steps.db.outputs.user }}
    SPRING_DATASOURCE_PASSWORD: ${{ steps.db.outputs.password }}
  run: ./mvnw test
```

### With API Key (higher quotas)

```yaml
- uses: polardb/polardbx-zero-action@v1
  id: db
  with:
    api-key: ${{ secrets.PXZ_API_KEY }}
    ttl-minutes: 60
    edition: enterprise
```

## How It Works

1. **Create** - Calls the PolarDB-X Zero API to allocate an ephemeral database instance
2. **Wait** - Verifies MySQL connectivity via TCP + protocol handshake
3. **Export** - Sets connection details as step outputs for subsequent steps
4. **Cleanup** - Automatically deletes the instance when the job ends (via `post` hook with `always()`)

## License

Apache-2.0

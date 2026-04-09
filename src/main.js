const core = require('@actions/core');
const { waitForMySQL } = require('./wait-ready');

async function run() {
  try {
    // 1. Read inputs
    const apiKey = core.getInput('api-key');
    const ttlMinutes = parseInt(core.getInput('ttl-minutes'), 10) || 30;
    const edition = core.getInput('edition') || 'standard';
    const apiUrl = core.getInput('api-url') || 'https://zero.polardbx.com/api/v1';
    const waitTimeout = parseInt(core.getInput('wait-timeout'), 10) || 120;

    let tag = core.getInput('tag');
    if (!tag) {
      const runId = process.env.GITHUB_RUN_ID || '0';
      const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1';
      tag = `ci-${runId}-${runAttempt}`;
    }

    // Save api-url and api-key to state for post cleanup
    core.saveState('apiUrl', apiUrl);
    core.saveState('apiKey', apiKey);

    // 2. Create instance via Zero API
    core.info(`Creating PolarDB-X Zero instance (edition=${edition}, ttl=${ttlMinutes}m)...`);

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-PXZ-Key'] = apiKey;
    }

    const body = JSON.stringify({
      tag,
      ttlMinutes,
      edition,
      whitelistIp: '0.0.0.0/0',
    });

    const resp = await fetch(`${apiUrl}/instances`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await resp.json();

    if (!resp.ok) {
      const err = data.error || {};
      core.setFailed(
        `Failed to create instance: [${err.code || resp.status}] ${err.message || resp.statusText}`
      );
      return;
    }

    const instance = data.instance;
    if (!instance || !instance.id) {
      core.setFailed('Invalid API response: missing instance data');
      return;
    }

    // 3. Save instance ID to state for post cleanup
    core.saveState('instanceId', instance.id);

    const { host, port, username, password } = instance.connection;

    // 4. Mask password in logs
    core.setSecret(password);
    if (instance.connectionString) {
      core.setSecret(instance.connectionString);
    }

    core.info(`Instance created: ${instance.id}`);
    core.info(`  Host: ${host}:${port}`);
    core.info(`  User: ${username}`);
    core.info(`  Edition: ${instance.edition}`);
    core.info(`  Expires: ${instance.expiresAt}`);

    // 5. Wait for MySQL to be connectable
    core.info(`Waiting for MySQL to be ready (timeout=${waitTimeout}s)...`);
    await waitForMySQL(host, port, waitTimeout);
    core.info('MySQL is ready!');

    // 6. Set outputs
    const url = instance.connectionString || `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}`;
    const jdbcUrl = `jdbc:mysql://${host}:${port}/?useSSL=true&characterEncoding=utf8`;

    core.setOutput('url', url);
    core.setOutput('jdbc-url', jdbcUrl);
    core.setOutput('host', host);
    core.setOutput('port', String(port));
    core.setOutput('user', username);
    core.setOutput('password', password);
    core.setOutput('instance-id', instance.id);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

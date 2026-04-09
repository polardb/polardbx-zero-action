const core = require('@actions/core');

async function cleanup() {
  try {
    const instanceId = core.getState('instanceId');
    if (!instanceId) {
      core.info('No instance to clean up (creation may not have succeeded).');
      return;
    }

    const apiUrl = core.getState('apiUrl') || 'https://zero.polardbx.com/api/v1';
    const apiKey = core.getState('apiKey');

    core.info(`Cleaning up instance ${instanceId}...`);

    const headers = {};
    if (apiKey) {
      headers['X-PXZ-Key'] = apiKey;
    }

    const resp = await fetch(`${apiUrl}/instances/${instanceId}`, {
      method: 'DELETE',
      headers,
    });

    if (resp.ok || resp.status === 404) {
      core.info(`Instance ${instanceId} cleaned up successfully.`);
    } else {
      const text = await resp.text().catch(() => '');
      core.warning(`Failed to clean up instance ${instanceId}: ${resp.status} ${text}`);
    }
  } catch (error) {
    core.warning(`Cleanup error: ${error.message}`);
  }
}

cleanup();

const net = require('net');

/**
 * Wait for MySQL to become connectable by attempting a TCP connection
 * and verifying the MySQL greeting packet.
 *
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutSeconds
 * @returns {Promise<void>}
 */
async function waitForMySQL(host, port, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  const interval = 3000;

  while (Date.now() < deadline) {
    try {
      await probeMySQL(host, port);
      return;
    } catch {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await sleep(Math.min(interval, remaining));
    }
  }

  throw new Error(
    `MySQL at ${host}:${port} did not become ready within ${timeoutSeconds}s`
  );
}

/**
 * Open a TCP connection and read the MySQL greeting packet.
 * Resolves if a valid MySQL greeting is received, rejects otherwise.
 */
function probeMySQL(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        socket.destroy();
      }
    };

    socket.setTimeout(5000);

    socket.on('timeout', () => {
      cleanup();
      reject(new Error('Connection timed out'));
    });

    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });

    socket.on('data', (data) => {
      cleanup();
      // MySQL greeting packet: 4-byte header + payload
      // payload[0] is protocol version, should be 0x0a (10) for MySQL 5.x+
      if (data.length >= 5 && data[4] === 0x0a) {
        resolve();
      } else {
        reject(new Error('Received non-MySQL greeting packet'));
      }
    });

    socket.connect(port, host);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { waitForMySQL };

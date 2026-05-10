import dgram from 'node:dgram';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT || 3000);
const root = resolve(process.cwd());
const ntpPort = 123;
const ntpTimeoutMs = 3000;
const ntpEpochOffset = 2208988800;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};


function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sanitizeNtpHost(value) {
  const host = value.trim();

  if (!host || host.length > 253 || !/^[a-zA-Z0-9.-]+$/.test(host) || host.includes('..')) {
    return null;
  }

  return host;
}

function readNtpTimestamp(buffer, offset) {
  const seconds = buffer.readUInt32BE(offset);
  const fraction = buffer.readUInt32BE(offset + 4);
  return (seconds - ntpEpochOffset) * 1000 + (fraction * 1000) / 0x100000000;
}

function fetchNtpTime(host) {
  return new Promise((resolveNtp, rejectNtp) => {
    const socket = dgram.createSocket('udp4');
    const packet = Buffer.alloc(48);
    packet[0] = 0x1b;

    const timeout = setTimeout(() => {
      socket.close();
      rejectNtp(new Error('NTP request timed out'));
    }, ntpTimeoutMs);

    socket.once('error', (error) => {
      clearTimeout(timeout);
      socket.close();
      rejectNtp(error);
    });

    socket.once('message', (message) => {
      clearTimeout(timeout);
      socket.close();

      if (message.length < 48) {
        rejectNtp(new Error('Invalid NTP response'));
        return;
      }

      resolveNtp(readNtpTimestamp(message, 40));
    });

    socket.send(packet, 0, packet.length, ntpPort, host, (error) => {
      if (error) {
        clearTimeout(timeout);
        socket.close();
        rejectNtp(error);
      }
    });
  });
}

async function handleNtpRequest(requestUrl, response) {
  const host = sanitizeNtpHost(requestUrl.searchParams.get('host') || '');

  if (!host) {
    sendJson(response, 400, { error: 'Enter a valid NTP hostname.' });
    return;
  }

  try {
    const time = await fetchNtpTime(host);
    sendJson(response, 200, { host, time, receivedAt: Date.now() });
  } catch (error) {
    sendJson(response, 502, { error: error.message || 'NTP sync failed.', host });
  }
}

function getSafePath(url) {
  const { pathname } = new URL(url, `http://localhost:${port}`);
  const decodedPath = decodeURIComponent(pathname);
  const requestedPath = normalize(decodedPath === '/' ? '/index.html' : decodedPath);
  const filePath = resolve(join(root, requestedPath));
  return filePath.startsWith(root) ? filePath : null;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://localhost:${port}`);

  if (requestUrl.pathname === '/api/ntp') {
    handleNtpRequest(requestUrl, response);
    return;
  }

  const filePath = getSafePath(request.url || '/');

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Time app is running at http://localhost:${port}`);
});

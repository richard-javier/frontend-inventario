const dgram = require('dgram');

const LOCAL_IP = process.env.SINCOT_IP || '192.168.0.120';
const UPSTREAM_DNS = process.env.UPSTREAM_DNS || '8.8.8.8';
const PORT = Number(process.env.DNS_PORT || 53);
const LOCAL_NAMES = new Set(['sincot', 'sincot.local']);

const server = dgram.createSocket('udp4');
const upstream = dgram.createSocket('udp4');
const pending = new Map();

function readName(buffer, offset) {
  const labels = [];
  let cursor = offset;

  while (cursor < buffer.length) {
    const length = buffer[cursor];
    if (length === 0) {
      cursor += 1;
      break;
    }

    if ((length & 0xc0) === 0xc0) {
      cursor += 2;
      break;
    }

    labels.push(buffer.slice(cursor + 1, cursor + 1 + length).toString('ascii'));
    cursor += length + 1;
  }

  return { name: labels.join('.').toLowerCase(), offset: cursor };
}

function ipToBytes(ip) {
  return Buffer.from(ip.split('.').map((part) => Number(part)));
}

function createLocalResponse(query) {
  const question = readName(query, 12);
  const qtype = query.readUInt16BE(question.offset);
  const qclass = query.readUInt16BE(question.offset + 2);
  const questionEnd = question.offset + 4;
  const requestedName = question.name.replace(/\.$/, '');

  if (!LOCAL_NAMES.has(requestedName)) return null;

  if (qtype !== 1) {
    const response = Buffer.alloc(questionEnd);
    query.copy(response, 0, 0, questionEnd);
    response[2] = 0x81;
    response[3] = 0x80;
    response.writeUInt16BE(1, 4);
    response.writeUInt16BE(0, 6);
    response.writeUInt16BE(0, 8);
    response.writeUInt16BE(0, 10);
    return response;
  }

  const response = Buffer.alloc(questionEnd + 16);
  query.copy(response, 0, 0, questionEnd);

  response[2] = 0x81;
  response[3] = 0x80;
  response.writeUInt16BE(1, 4);
  response.writeUInt16BE(1, 6);
  response.writeUInt16BE(0, 8);
  response.writeUInt16BE(0, 10);

  let offset = questionEnd;
  response[offset++] = 0xc0;
  response[offset++] = 0x0c;
  response.writeUInt16BE(1, offset);
  offset += 2;
  response.writeUInt16BE(qclass, offset);
  offset += 2;
  response.writeUInt32BE(60, offset);
  offset += 4;
  response.writeUInt16BE(4, offset);
  offset += 2;
  ipToBytes(LOCAL_IP).copy(response, offset);

  return response;
}

server.on('message', (message, remote) => {
  try {
    const debugQuestion = readName(message, 12);
    const debugType = message.readUInt16BE(debugQuestion.offset);
    console.log(`Consulta ${debugQuestion.name || '(raiz)'} tipo ${debugType} desde ${remote.address}:${remote.port}`);
    const localResponse = createLocalResponse(message);
    if (localResponse) {
      server.send(localResponse, remote.port, remote.address);
      console.log(`Respuesta local enviada a ${remote.address}:${remote.port}`);
      return;
    }
  } catch (error) {
    console.error(`Error procesando consulta DNS: ${error.message}`);
    return;
  }

  const key = `${message.readUInt16BE(0)}:${remote.address}:${remote.port}:${Date.now()}:${Math.random()}`;
  pending.set(key, remote);

  upstream.send(message, 53, UPSTREAM_DNS, (error) => {
    if (error) pending.delete(key);
  });

  setTimeout(() => pending.delete(key), 5000).unref();
});

server.on('error', (error) => {
  console.error(`Error en DNS local: ${error.message}`);
  process.exit(1);
});

upstream.on('error', (error) => {
  console.error(`Error en DNS upstream: ${error.message}`);
});

upstream.on('message', (message) => {
  for (const [key, remote] of pending) {
    if (Number(key.split(':')[0]) === message.readUInt16BE(0)) {
      pending.delete(key);
      server.send(message, remote.port, remote.address);
      break;
    }
  }
});

server.bind(PORT, '0.0.0.0', () => {
  console.log(`DNS SINCOT activo en 0.0.0.0:${PORT}`);
  console.log(`SINCOT -> ${LOCAL_IP}`);
  console.log(`sincot.local -> ${LOCAL_IP}`);
  console.log(`Consultas externas -> ${UPSTREAM_DNS}`);
});

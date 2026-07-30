const dgram = require('dgram');

const server = process.argv[2] || '127.0.0.1';
const port = Number(process.argv[3] || 53);
const name = process.argv[4] || 'SINCOT';

function createQuery(hostname) {
  const labels = hostname.split('.');
  const qname = Buffer.concat([
    ...labels.flatMap((label) => [Buffer.from([label.length]), Buffer.from(label, 'ascii')]),
    Buffer.from([0]),
  ]);

  return Buffer.concat([
    Buffer.from([0x53, 0x43, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    qname,
    Buffer.from([0x00, 0x01, 0x00, 0x01]),
  ]);
}

const socket = dgram.createSocket('udp4');
const timer = setTimeout(() => {
  console.error(`Sin respuesta DNS desde ${server}:${port}`);
  socket.close();
  process.exit(1);
}, 3000);

socket.on('message', (message) => {
  clearTimeout(timer);

  if (message.length < 4 || message.readUInt16BE(6) < 1) {
    console.error('Respuesta DNS recibida sin registros A.');
    socket.close();
    process.exit(1);
  }

  const ip = [...message.slice(message.length - 4)].join('.');
  console.log(`${name} -> ${ip}`);
  socket.close();
});

socket.send(createQuery(name), port, server);

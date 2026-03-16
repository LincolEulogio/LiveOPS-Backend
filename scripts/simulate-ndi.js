const io = require('socket.io-client');
// URL del backend (ajustar si es diferente)
const socket = io('http://localhost:4000', {
  transports: ['websocket'],
});

// REEMPLAZA ESTO con un productionId real de tu URL actual (ej. /productions/[id])
const productionId = process.argv[2] || 'PRODUCTION_ID_AQUI';

socket.on('connect', () => {
  console.log('✅ Conectado al simulador de NDI');

  // 0. UNIRSE A LA SALA DE PRODUCCIÓN (Crucial)
  socket.emit('production.join', { productionId, userId: 'simulator-bot' });

  // 1. Simular Bridge Online
  socket.emit('ndi.bridge_status', {
    productionId: productionId,
    bridgeName: 'LOCAL-OFFICE-BRIDGE',
    status: 'ONLINE',
  });

  // 2. Enviar Lista de Fuentes de prueba
  const mockSources = [
    {
      name: 'CAM-01-MAIN',
      ipAddress: '192.168.1.50',
      status: 'ONLINE',
      isPtz: true,
    },
    {
      name: 'CAM-02-WIDE',
      ipAddress: '192.168.1.51',
      status: 'ON_AIR',
      isPtz: true,
    },
    {
      name: 'GFX-RENDER-01',
      ipAddress: '192.168.1.100',
      status: 'ONLINE',
      isPtz: false,
    },
    {
      name: 'MACBOOK-CAP',
      ipAddress: '192.168.1.25',
      status: 'OFFLINE',
      isPtz: false,
    },
  ];

  setInterval(() => {
    console.log('📡 Enviando actualización de fuentes NDI...');
    socket.emit('ndi.sources_received', {
      productionId: productionId,
      sources: mockSources,
    });
  }, 5000);

  // Escuchar comandos desde la UI
  socket.on('ndi.tally_control', (data) => {
    console.log(`🔴 TALLY RECIBIDO: ${data.sourceName} -> ${data.tallyState}`);
  });

  socket.on('ndi.ptz_command', (data) => {
    console.log(
      `🎮 PTZ MOVIDO: ${data.sourceName} -> ${data.action} (${data.speed})`,
    );
  });
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado');
});

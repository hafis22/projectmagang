require('dotenv').config();            // baris paling atas
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/dashboard')
const mqtt = require('mqtt');
const db = require('./db');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = 5000;

// ===== CORS dan Middleware Configuration =====
// Perbaiki CORS untuk Google OAuth
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Sesuaikan dengan port frontend Anda
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Headers untuk mengatasi Cross-Origin-Opener-Policy
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api', sensorRoutes);
app.use('/api', historyRoutes);

// ===== Test Database Connection =====
app.get('/api/test-db', async (req, res) => {
  try {
    db.query('SELECT 1 as test', (err, results) => {
      if (err) {
        console.error('❌ Database connection error:', err);
        res.status(500).json({ 
          error: 'Database connection failed', 
          details: err.message 
        });
      } else {
        console.log('✅ Database connection OK');
        res.json({ 
          message: 'Database connection OK', 
          data: results 
        });
      }
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({ 
      error: 'Database test failed', 
      details: error.message 
    });
  }
});

// ===== MQTT Configuration yang Diperbaiki =====
const mqttConfigs = [
  {
    name: 'WebSocket Secure (Original)',
    url: process.env.MQTT_URL, // wss://mqtt.permataindonesia.com:8083
    options: {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      connectTimeout: 30000,
      reconnectPeriod: 0, // Disable auto reconnect, kita handle manual
      keepalive: 60,
      clean: true,
      protocolVersion: 4,
      rejectUnauthorized: false, // Important untuk self-signed cert
      ca: null, // Accept any certificate
      checkServerIdentity: () => undefined // Skip hostname verification
    }
  },
  {
    name: 'WebSocket (No SSL)',
    url: 'ws://mqtt.permataindonesia.com:8083',
    options: {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      connectTimeout: 30000,
      reconnectPeriod: 0,
      keepalive: 60,
      clean: true,
      protocolVersion: 4
    }
  },
  {
    name: 'Standard MQTT Port',
    url: 'mqtt://mqtt.permataindonesia.com:1883',
    options: {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      connectTimeout: 30000,
      reconnectPeriod: 0,
      keepalive: 60,
      clean: true,
      protocolVersion: 4
    }
  }
];

let currentConfigIndex = 0;
let mqttClient;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

function connectMQTT() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('❌ Maksimum percobaan reconnect tercapai. Hentikan reconnect.');
    return;
  }

  const config = mqttConfigs[currentConfigIndex];
  console.log(`🔄 Mencoba koneksi dengan ${config.name} (Attempt ${reconnectAttempts + 1})...`);
  console.log(`📡 URL: ${config.url}`);
  
  // Bersihkan client sebelumnya jika ada
  if (mqttClient) {
    mqttClient.removeAllListeners();
    mqttClient.end(true);
  }
  
  mqttClient = mqtt.connect(config.url, config.options);

  mqttClient.on('connect', () => {
    console.log('✅ MQTT Terhubung ke Permata Indonesia Broker');
    isConnected = true;
    reconnectAttempts = 0; // Reset counter setelah berhasil connect
    
    // Subscribe setelah berhasil connect
    mqttClient.subscribe('data/portable/saved', { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Gagal subscribe:', err);
      } else {
        console.log('✅ Subscribe ke topik data/portable/saved berhasil');
      }
    });
  });

  mqttClient.on('error', (err) => {
    console.error(`❌ Error MQTT (${config.name}):`, err.message);
    isConnected = false;
    
    // Jika error connection, coba config berikutnya
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.log('🔄 Connection error detected, mencoba konfigurasi berikutnya...');
      
      // Tutup koneksi saat ini
      if (mqttClient) {
        mqttClient.end(true);
      }
      
      // Coba config berikutnya
      setTimeout(() => {
        currentConfigIndex = (currentConfigIndex + 1) % mqttConfigs.length;
        if (currentConfigIndex === 0) {
          reconnectAttempts++;
          console.log(`🔄 Semua konfigurasi sudah dicoba, restart dari awal... (Attempt ${reconnectAttempts})`);
        }
        connectMQTT();
      }, 5000); // Tunggu 5 detik sebelum coba config berikutnya
    }
  });

  mqttClient.on('close', () => {
    console.log('⚠️ MQTT connection closed');
    isConnected = false;
  });

  mqttClient.on('offline', () => {
    console.log('⚠️ MQTT offline');
    isConnected = false;
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });

  mqttClient.on('disconnect', () => {
    console.log('⚠️ MQTT disconnected');
    isConnected = false;
  });

  mqttClient.on('message', (topic, message) => {
    console.log(`📨 Pesan diterima [${topic}]: ${message.toString()}`);

    try {
      const payload = JSON.parse(message.toString());
      const { resultName, timestamp, sensorData } = payload;

      // Validasi data
      if (!resultName || !timestamp || !sensorData) {
        console.warn('⚠️ Data tidak lengkap:', payload);
        return;
      }

      // 1️⃣ Insert ke sensor_entries
      const entryQuery = `
        INSERT INTO sensor_entries (koordinat, created_at)
        VALUES (?, ?)
      `;
      
      db.query(
        entryQuery,
        [resultName, new Date(timestamp)],
        (err, entryResult) => {
          if (err) {
            console.error('❌ Gagal insert sensor_entries:', err);
            return;
          }

          const entryId = entryResult.insertId;
          console.log('✅ sensor_entries.id =', entryId);

          // 2️⃣ Siapkan data untuk sensor_value
          const values = Object.entries(sensorData)
            .filter(([key, val]) => val !== undefined && val !== null)
            .map(([key, val]) => [
              entryId,
              key,
              val.toString()
            ]);

          if (values.length === 0) {
            console.warn('⚠️ Tidak ada data sensor yang valid');
            return;
          }

          const valueQuery = `
            INSERT INTO sensor_value (id_sensor_entries, keterangan_sensor, nilai_sensor)
            VALUES ?
          `;

          db.query(valueQuery, [values], (err2, valueResult) => {
            if (err2) {
              console.error('❌ Gagal insert sensor_value:', err2);
            } else {
              console.log(
                `✅ ${valueResult.affectedRows} baris dimasukkan ke sensor_value`
              );
            }
          });
        }
      );
    } catch (e) {
      console.warn('⚠️ Payload bukan JSON valid:', e.message);
      console.warn('⚠️ Raw message:', message.toString());
    }
  });

  // Timeout untuk connection attempt
  const connectionTimeout = setTimeout(() => {
    if (!isConnected) {
      console.log('⏰ Connection timeout, mencoba konfigurasi berikutnya...');
      mqttClient.end(true);
      
      currentConfigIndex = (currentConfigIndex + 1) % mqttConfigs.length;
      if (currentConfigIndex === 0) {
        reconnectAttempts++;
      }
      
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(connectMQTT, 3000);
      }
    }
  }, 35000); // 35 detik timeout

  mqttClient.on('connect', () => {
    clearTimeout(connectionTimeout);
  });
}

// Inisialisasi koneksi MQTT hanya jika environment variables tersedia
if (process.env.MQTT_URL && process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
  console.log('🔧 Memulai koneksi MQTT...');
  connectMQTT();
} else {
  console.warn('⚠️ MQTT environment variables tidak tersedia. Skip MQTT connection.');
}

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    message: 'Terjadi kesalahan server internal',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint tidak ditemukan',
    path: req.originalUrl
  });
});

// ===== Test endpoints =====
app.get('/', (req, res) => {
  res.json({
    message: 'API berjalan di port 5000',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api',
      history: '/api',
      mqttStatus: '/mqtt-status',
      testDb: '/api/test-db'
    }
  });
});

// Health check untuk MQTT
app.get('/mqtt-status', (req, res) => {
  res.json({ 
    connected: isConnected,
    status: isConnected ? 'Connected' : 'Disconnected',
    currentConfig: mqttConfigs[currentConfigIndex]?.name || 'Unknown',
    reconnectAttempts: reconnectAttempts,
    maxAttempts: maxReconnectAttempts
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
  
  if (mqttClient && isConnected) {
    console.log('🔌 Closing MQTT connection...');
    mqttClient.end(true);
  }
  
  if (db && db.end) {
    console.log('🗄️ Closing database connection...');
    db.end();
  }
  
  console.log('✅ Cleanup completed. Exiting...');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Jalankan server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${db ? 'Connected' : 'Not configured'}`);
});

// Set server timeout
server.timeout = 60000; // 60 detik

module.exports = app;

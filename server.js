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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api', sensorRoutes);
app.use('/api', historyRoutes);

const mqttClient = mqtt.connect(process.env.MQTT_URL, {
  username: 'superAdmNyamuk1',
  password: 'hYqS9+*zDTxYN3bQSTPzistq',
  rejectUnauthorized: false
});

mqttClient.on('connect', () => {
  console.log('MQTT Terhubung ke Permata Indonesia Broker');
  mqttClient.subscribe('data/portable/saved', err => {
    if (err) console.error('Gagal subscribe:', err);
    else console.log('Subscribe ke topik sensor/data berhasil');
  });
});

mqttClient.on('error', err => {
  console.error('Error MQTT:', err);
});

mqttClient.on('message', (topic, message) => {
  console.log(`Pesan diterima [${topic}]: ${message.toString()}`);

  try {
    const payload = JSON.parse(message.toString());
    const { resultName, timestamp, sensorData } = payload;

    // 1️⃣ Insert ke sensor_entries
    const entryQuery = `
      INSERT INTO sensor_entries (koordinat, created_at)
      VALUES (?, ?)
    `;
    db.query(
      entryQuery,
      [resultName, new Date(timestamp)], // created_at DATETIME
      (err, entryResult) => {
        if (err) {
          console.error('Gagal insert sensor_entries:', err);
          return;
        }

        const entryId = entryResult.insertId;
        console.log('sensor_entries.id =', entryId);

        // 2️⃣ Siapkan data untuk sensor_value
        const values = Object.entries(sensorData).map(([key, val]) => [
          entryId,
          key,
          val.toString()
        ]);

        const valueQuery = `
          INSERT INTO sensor_value (id_sensor_entries, keterangan_sensor, nilai_sensor)
          VALUES ?
        `;

        db.query(valueQuery, [values], (err2, valueResult) => {
          if (err2) {
            console.error('Gagal insert sensor_value:', err2);
          } else {
            console.log(
              `${valueResult.affectedRows} baris dimasukkan ke sensor_value`
            );
          }
        });
      }
    );
  } catch (e) {
    console.warn('Payload bukan JSON valid:', e.message);
  }
});



// ===== Test endpoint =====
app.get('/', (req, res) => {
  res.send('API berjalan di port 5000');
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

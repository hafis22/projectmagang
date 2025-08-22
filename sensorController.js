// controllers/sensorController.js
const db = require('../db');

// Ambil entry terbaru (sudah kamu punya)
exports.getLatestEntry = async (req, res) => {
  try {
    const [entries] = await db.promise().query(
      `SELECT id, koordinat, created_at
       FROM sensor_entries
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (entries.length === 0) {
      return res.status(404).json({ message: 'Tidak ada data sensor_entries' });
    }
    const entry = entries[0];
    const [values] = await db.promise().query(
      `SELECT keterangan_sensor, nilai_sensor
       FROM sensor_value
       WHERE id_sensor_entries = ?`,
      [entry.id]
    );
    return res.json({
      id: entry.id,
      koordinat: entry.koordinat,
      created_at: entry.created_at,
      values
    });
  } catch (err) {
    console.error('Error fetching latest sensor entry:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// Ambil N entry terakhir (history)
exports.getHistory = async (req, res) => {
  try {
    // 1️⃣ Ambil hingga 100 entry terbaru
    const [entries] = await db.promise().query(
      `SELECT id, koordinat, created_at
       FROM sensor_entries
       ORDER BY created_at DESC
       LIMIT 100`
    );
    if (entries.length === 0) {
      return res.json([]); // kosong saja
    }

    // 2️⃣ Ambil semua nilai sensor untuk entry di atas
    const entryIds = entries.map(e => e.id);
    const [values] = await db.promise().query(
      `SELECT id_sensor_entries, keterangan_sensor, nilai_sensor
       FROM sensor_value
       WHERE id_sensor_entries IN (?)`,
      [entryIds]
    );

    // 3️⃣ Gabungkan values ke dalam masing-masing entry
    const history = entries.map(entry => ({
      id: entry.id,
      koordinat: entry.koordinat,
      created_at: entry.created_at,
      values: values
        .filter(v => v.id_sensor_entries === entry.id)
        .map(v => ({
          keterangan_sensor: v.keterangan_sensor,
          nilai_sensor: v.nilai_sensor
        }))
    }));

    return res.json(history);
  } catch (err) {
    console.error('Error fetching sensor history:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

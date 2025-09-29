// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'database'
});

db.connect(err => {
  if (err) throw err;
  console.log('Koneksi ke MySQL berhasil');
});

module.exports = db;

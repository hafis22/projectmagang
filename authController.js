// controllers/authController.js
const db = require('../db'); // koneksi database MySQL
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  const { email, username, password } = req.body;

  // Validasi input
  if (!email || !username || !password) {
    return res.status(400).json({ message: 'Semua field harus diisi' });
  }

  try {
    // Cek apakah email sudah ada
    const [existingUser] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan user ke database
    await db.promise().query(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashedPassword]
    );

    res.status(201).json({ message: 'Registrasi berhasil' });
  } catch (err) {
    console.error('Error saat registrasi:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'username tidak ditemukan' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Password salah' });
    }

    // Buat token (contoh pakai JWT)
    const token = jwt.sign({ id: user.id, username: user.username }, 'rahasia_super_amannn', {
      expiresIn: '1d'
    });

    res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      }
    });
  } catch (err) {
    console.error('Error saat login:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  register,
  login
};

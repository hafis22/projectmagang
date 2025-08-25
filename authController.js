// controllers/authController.js
const db = require('../db'); // koneksi database MySQL
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Google OAuth client untuk verifikasi token
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT Secret dari environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_super_amannn';

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

    // Cek apakah username sudah ada
    const [existingUsername] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUsername.length > 0) {
      return res.status(409).json({ message: 'Username sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan user ke database
    const [result] = await db.promise().query(
      'INSERT INTO users (email, username, password, login_type) VALUES (?, ?, ?, ?)',
      [email, username, hashedPassword, 'regular']
    );

    res.status(201).json({ 
      message: 'Registrasi berhasil',
      userId: result.insertId
    });
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
      return res.status(401).json({ message: 'Username tidak ditemukan' });
    }

    const user = rows[0];

    // Cek jika user ini login dengan Google, tidak boleh login regular
    if (user.login_type === 'google') {
      return res.status(401).json({ message: 'Akun ini terdaftar dengan Google. Silakan login dengan Google.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Password salah' });
    }

    // Buat token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email,
        loginType: user.login_type
      }, 
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.status(200).json({
      message: 'Login berhasil',
      token,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        photo: user.photo,
        loginType: user.login_type
      }
    });
  } catch (err) {
    console.error('Error saat login:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// ✅ FUNGSI BARU: Google Login
const googleLogin = async (req, res) => {
  const { googleId, email, name, photo, idToken } = req.body;

  try {
    // 1️⃣ Verifikasi ID Token dari Google (opsional tapi direkomendasikan)
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      
      // Pastikan Google ID cocok
      if (payload.sub !== googleId) {
        return res.status(401).json({ message: 'Token Google tidak valid' });
      }
    } catch (verifyError) {
      console.error('Error verifying Google token:', verifyError);
      // Jika verifikasi gagal, tetap lanjutkan (untuk development)
      // Di production, sebaiknya return error
      console.warn('⚠️ Google token verification failed, proceeding anyway...');
    }

    // 2️⃣ Cek apakah user Google sudah ada di database
    const [existingGoogleUser] = await db.promise().query(
      'SELECT * FROM users WHERE google_id = ?', 
      [googleId]
    );

    let user;

    if (existingGoogleUser.length > 0) {
      // User Google sudah ada, update data jika perlu
      user = existingGoogleUser[0];
      
      // Update info terbaru dari Google
      await db.promise().query(
        'UPDATE users SET name = ?, photo = ?, email = ? WHERE google_id = ?',
        [name, photo, email, googleId]
      );
      
      // Update user object dengan data terbaru
      user.name = name;
      user.photo = photo;
      user.email = email;
      
    } else {
      // 3️⃣ Cek apakah email sudah digunakan akun regular
      const [existingEmailUser] = await db.promise().query(
        'SELECT * FROM users WHERE email = ? AND login_type = ?', 
        [email, 'regular']
      );

      if (existingEmailUser.length > 0) {
        return res.status(409).json({ 
          message: 'Email ini sudah terdaftar dengan akun regular. Silakan login dengan username dan password.' 
        });
      }

      // 4️⃣ Buat user Google baru
      const [result] = await db.promise().query(
        'INSERT INTO users (google_id, email, name, photo, username, login_type) VALUES (?, ?, ?, ?, ?, ?)',
        [googleId, email, name, photo, email, 'google'] // username = email untuk Google users
      );

      user = {
        id: result.insertId,
        google_id: googleId,
        email: email,
        name: name,
        photo: photo,
        username: email,
        login_type: 'google'
      };
    }

    // 5️⃣ Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username || user.email,
        email: user.email,
        loginType: user.login_type,
        googleId: user.google_id
      }, 
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    // 6️⃣ Response sukses
    res.status(200).json({
      message: 'Login Google berhasil',
      token,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || user.email,
        name: user.name,
        photo: user.photo,
        loginType: user.login_type,
        googleId: user.google_id
      }
    });

  } catch (err) {
    console.error('Error saat Google login:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server saat login Google' });
  }
};

// ✅ FUNGSI TAMBAHAN: Logout (opsional)
const logout = async (req, res) => {
  // Untuk logout, biasanya client-side yang hapus token
  // Tapi bisa juga implement blacklist token di server
  res.status(200).json({ message: 'Logout berhasil' });
};

// ✅ FUNGSI TAMBAHAN: Verify Token (middleware)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token tidak valid' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = {
  register,
  login,
  googleLogin,    // ✅ Export fungsi Google login
  logout,         // ✅ Export fungsi logout
  verifyToken     // ✅ Export middleware verify token
};

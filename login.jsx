import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import API from '../api';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert('Login gagal. Periksa username/password.');
    }
  };

  const handleGoogleLogin = async credentialResponse => {
    try {
      // Kirim token Google ke backend untuk diverifikasi
      const res = await API.post('/auth/google', {
        token: credentialResponse.credential,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert('Login Google gagal.');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>IoT Vanili Login</h2>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Login</button>

        {/* Login dengan Google */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => alert('Login Google gagal')}
          />
        </div>

        <p style={styles.registerText}>
          Belum punya akun?{' '}
          <Link to="/register" style={styles.registerLink}>
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f7fafc',  // Changed to match dashboard background
    fontFamily: 'Inter'  // Added font family to match dashboard
  },
  form: {
    padding: 40,  // Increased padding
    background: '#cbd5e0',  // Changed to match dashboard card color
    borderRadius: 16,  // Increased border radius to match dashboard
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',  // Changed shadow to match dashboard
    border: '1.5px solid #a0aec0',  // Added border to match dashboard
    display: 'flex',
    flexDirection: 'column',
    width: 380,  // Increased width
    maxWidth: '90vw'  // Added responsive max width
  },
  title: {
    marginBottom: 30,  // Increased margin
    textAlign: 'center',
    color: '#1e293b',  // Changed to match dashboard text color
    fontSize: 24,  // Increased font size
    fontWeight: '600',  // Added font weight
    fontFamily: 'Inter'  // Added font family
  },
  input: {
    padding: '14px 16px',  // Increased padding
    marginBottom: 18,  // Increased margin
    border: '1.5px solid #a0aec0',  // Changed border to match dashboard
    borderRadius: 8,  // Increased border radius
    fontSize: 14,
    background: '#f7fafc',  // Added background color
    color: '#1e293b',  // Added text color
    fontFamily: 'Inter',  // Added font family
    transition: 'all 0.3s ease',  // Added transition
    outline: 'none'  // Remove default outline
  },
  button: {
    padding: '14px 20px',  // Increased padding
    background: '#80cee1',  // Changed to match dashboard primary color
    color: '#1e293b',  // Changed text color to match dashboard
    border: 'none',
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer',
    fontWeight: '600',  // Increased font weight
    fontSize: 16,  // Increased font size
    fontFamily: 'Inter',  // Added font family
    transition: 'all 0.3s ease',  // Added transition
    boxShadow: '0 2px 4px rgba(128, 206, 225, 0.3)',  // Added shadow
    marginBottom: 10  // Added margin bottom
  },
  registerText: {
    marginTop: 20,  // Increased margin
    fontSize: 14,
    textAlign: 'center',
    color: '#1e293b',  // Changed text color
    fontFamily: 'Inter'  // Added font family
  },
  registerLink: {
    color: '#4db3d9',  // Changed to match dashboard accent color
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'color 0.3s ease'  // Added transition
  },
};

export default Login;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WeatherIcon from "./WeatherIcon.jsx";

const OPENWEATHER_API_KEY = '806fa7ef250a2be79044fbdd5120036b';
const DEFAULT_LAT = -8.128262;
const DEFAULT_LON = 113.722259;

function Dashboard() {
  const [sensorData, setSensorData] = useState({ koordinat: '—', created_at: null, values: [] });
  const [weatherData, setWeatherData] = useState(null);
  const navigate = useNavigate();

  const fetchWeather = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      const data = await res.json();
      setWeatherData({
        suhu: data.main.temp,
        kondisi: data.weather[0].description,
        kelembaban: data.main.humidity,
        icon: data.weather[0].icon,
      });
    } catch (err) {
      console.error('Gagal ambil data cuaca:', err);
    }
  };

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/lastsensor');
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setSensorData(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const [latStr, lonStr] = sensorData.koordinat.split(',').map(k => k.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const valid = !isNaN(lat) && !isNaN(lon);
    const useLat = valid ? lat : DEFAULT_LAT;
    const useLon = valid ? lon : DEFAULT_LON;
    fetchWeather(useLat, useLon);
    const weatherInterval = setInterval(() => fetchWeather(useLat, useLon), 600000);
    return () => clearInterval(weatherInterval);
  }, [sensorData.koordinat]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return navigate('/login');
    }
  }, [navigate]);

  const timeLabel = sensorData.created_at
    ? new Date(sensorData.created_at).toLocaleTimeString()
    : '—:—:—';

  const dateLabel = sensorData.created_at
    ? new Date(sensorData.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  const handleNavigateToHistory = () => {
    navigate('/history');
  };

  const handleNavigateToProfile = () => {
    alert('Halaman Profile belum tersedia');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getSensorValue = (key) => {
    const found = sensorData.values.find(v => v.keterangan_sensor === key);
    return found ? found.nilai_sensor : '—';
  };

  return (
    <div style={styles.container}>
      {/* Overlay transparan */}
      <div style={styles.overlay}></div>

      {/* Top Navigation Bar */}
      <div style={styles.topNav}>
        <div style={styles.logo}>
          <h2 style={styles.logoText}>IoT Vanili Dashboard</h2>
        </div>
        <div style={styles.navMenu}>
          <div style={styles.navItem} onClick={handleNavigateToHistory}>
            <span style={styles.navText}>History Sensor</span>
          </div>
          <div style={styles.navItem} onClick={handleNavigateToProfile}>
            <span style={styles.navText}>Profile</span>
          </div>
          <div style={styles.logoutItem} onClick={handleLogout}>
            <span style={styles.logoutText}>Logout</span>
          </div>
        </div>
      </div>

        {/* Weather Box */}
        {weatherData && (
          <div style={styles.weatherBox}>
            <WeatherIcon code={weatherData.icon} size={60} />
            <div style={styles.weatherInfo}>
              <strong style={styles.weatherText}>{weatherData.kondisi.toUpperCase()}</strong>
              <div style={styles.weatherText}>Suhu: {weatherData.suhu} °C</div>
              <div style={styles.weatherText}>Kelembaban: {weatherData.kelembaban} %</div>
            </div>
          </div>
        )}

        <div style={styles.coordBox}>
          <div><strong>Koordinat:</strong> {sensorData.koordinat}</div>
          <div><strong>Tanggal:</strong> {dateLabel} | <strong>Waktu:</strong> {timeLabel}</div>
        </div>

        {/* Original Grid Cards */}
        <div style={styles.gridContainer}>
          <div style={styles.subCard}>
            <h3 style={styles.subTitle}>Data Lingkungan</h3>
            <div style={styles.item}><strong>Temperature:</strong> {getSensorValue('temperature')} °C</div>
            <div style={styles.item}><strong>Humidity:</strong> {getSensorValue('humidity')} %</div>
            <div style={styles.item}><strong>Light:</strong> {getSensorValue('light')} lux</div>
          </div>

          <div style={styles.subCard}>
            <h3 style={styles.subTitle}>Data Nutrisi</h3>
            {sensorData.values.filter(v => ['ph','ec','nitrogen','phosphorus','kalium'].includes(v.keterangan_sensor))
              .map(v => (
                <div key={v.keterangan_sensor} style={styles.item}>
                  <strong>{v.keterangan_sensor.charAt(0).toUpperCase()+v.keterangan_sensor.slice(1)}:</strong> {v.nilai_sensor}
                </div>
            ))}
          </div>
        </div>

        <div style={styles.quickActionBtn} onClick={handleNavigateToHistory}>
        Lihat History Detail
        </div>
      </div>
  );
}

const styles = {
  container: { 
    minHeight: '100vh', 
    fontFamily: 'Inter',
    backgroundImage: "url('/images/bgdaun.jpg')",
    backgroundSize: 'cover',
    backgroundRepeat: 'repeat',
    backgroundPosition: 'center',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)', // overlay transparan
    zIndex: 0,
  },
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    background: ' #80cee1',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(128, 206, 225, 0.3)',
    borderRadius: '0px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  logo: { display: 'flex', alignItems: 'center' },
  logoText: { margin: 0, fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  navMenu: { display: 'flex', gap: 30, alignItems: 'center' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 0,
    padding: '10px 15px', borderRadius: 8, cursor: 'pointer',
    transition: 'all 0.3s ease', backgroundColor: '#80cee1',
  },
  logoutItem: {
    display: 'flex', alignItems: 'center', gap: 0,
    padding: '10px 15px', borderRadius: 8, cursor: 'pointer',
    transition: 'all 0.3s ease', backgroundColor: '#fc8181',
    border: '2px solid #fc8181',
  },
  navText: { fontSize: 16, fontFamily: 'Inter', fontWeight: '500', color: '#1e293b' },
  logoutText: { fontSize: 16, fontFamily: 'Inter', fontWeight: '500', color: '#ffffff' },
  weatherBox: { 
    background: '#cbd5e0', borderRadius: 16, padding: 24,
    display: 'flex', alignItems: 'center', border: '1.5px solid #a0aec0',
    marginBottom: 24, maxWidth: 400, margin: '0 auto 24px', zIndex: 1, position: 'relative',
  },
  weatherInfo: { marginLeft: 20 },
  weatherText: { fontSize: 16, color: '#1e293b', marginBottom: 6 },
  coordBox: { 
    textAlign: 'center', marginTop: 20, fontSize: 16, color: '#1e293b',
    background: '#cbd5e0', border: '1.5px solid #a0aec0',
    padding: '20px', borderRadius: '12px', maxWidth: '600px',
    margin: '20px auto', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 1, position: 'relative',
  },
  gridContainer: { display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginTop: 32, zIndex: 1, position: 'relative' },
  subCard: { 
    background: '#cbd5e0', padding: 28, fontSize: 18, borderRadius: 16,
    border: '1.5px solid #a0aec0', minWidth: 300, flex: 1, maxWidth: '450px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 1, position: 'relative',
  },
  subTitle: { marginTop: 0, marginBottom: 20, fontSize: 18, color: '#1e293b', fontWeight: '600', paddingBottom: 12 },
  item: { padding: '14px 18px', borderRadius: 8, marginBottom: 12, color: '#4db3d9' },
  quickActionBtn: { 
    position: 'fixed', bottom: 30, right: 30,
    background: ' #68d391', color: '#1e293b',
    padding: '16px 24px', borderRadius: '28px', cursor: 'pointer',
    fontSize: '16px', fontWeight: '600', transition: 'all 0.3s ease',
    zIndex: 500, boxShadow: '0 6px 25px rgba(128, 206, 225, 0.4)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
  }
};

export default Dashboard;
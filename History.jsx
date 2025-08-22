import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';

// Calendar Component
const Calendar = ({ selectedDates, onDateSelect, availableDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month - create dates in local timezone
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };
  
  const formatDateKey = (date) => {
    // Format tanggal dalam timezone lokal, bukan UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const isDateAvailable = (date) => {
    return availableDates.includes(formatDateKey(date));
  };
  
  const isDateSelected = (date) => {
    return selectedDates.includes(formatDateKey(date));
  };
  
  const handleDateClick = (date) => {
    if (isDateAvailable(date)) {
      const dateKey = formatDateKey(date);
      console.log('Clicked date:', date, 'Date key:', dateKey);
      console.log('Available dates:', availableDates);
      onDateSelect(dateKey);
    }
  };
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  // Get available years and months from data
  const getAvailableMonthsYears = () => {
    const monthsYears = new Set();
    availableDates.forEach(dateStr => {
      const [year, month] = dateStr.split('-');
      monthsYears.add(`${year}-${month}`);
    });
    return Array.from(monthsYears).sort((a, b) => b.localeCompare(a));
  };
  
  const availableMonthsYears = getAvailableMonthsYears();
  
  const handleMonthYearSelect = (monthYear) => {
    const [year, month] = monthYear.split('-');
    setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1));
    setShowMonthPicker(false);
  };
  
  const days = getDaysInMonth(currentMonth);
  
  return (
    <div style={calendarStyles.container}>
      <div style={calendarStyles.header}>
        <button onClick={goToPreviousMonth} style={calendarStyles.navButton}>←</button>
        <div style={calendarStyles.monthSelector}>
          <button 
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            style={calendarStyles.monthButton}
          >
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()} ▼
          </button>
          {showMonthPicker && (
            <div style={calendarStyles.monthDropdown}>
              {availableMonthsYears.map(monthYear => {
                const [year, month] = monthYear.split('-');
                const monthName = monthNames[parseInt(month) - 1];
                return (
                  <div
                    key={monthYear}
                    style={calendarStyles.monthOption}
                    onClick={() => handleMonthYearSelect(monthYear)}
                    onMouseEnter={(e) => e.target.style.background = '#80cee1'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    {monthName} {year}
                  </div>
                );
              })}
              {availableMonthsYears.length === 0 && (
                <div style={calendarStyles.noDataOption}>Tidak ada data</div>
              )}
            </div>
          )}
        </div>
        <button onClick={goToNextMonth} style={calendarStyles.navButton}>→</button>
      </div>
      
      <div style={calendarStyles.dayNames}>
        {dayNames.map(day => (
          <div key={day} style={calendarStyles.dayName}>{day}</div>
        ))}
      </div>
      
      <div style={calendarStyles.daysGrid}>
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} style={calendarStyles.emptyDay}></div>;
          }
          
          const available = isDateAvailable(date);
          const selected = isDateSelected(date);
          
          return (
            <div
              key={index}
              style={{
                ...calendarStyles.day,
                ...(available ? calendarStyles.availableDay : calendarStyles.unavailableDay),
                ...(selected ? calendarStyles.selectedDay : {})
              }}
              onClick={() => handleDateClick(date)}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
      
      <div style={calendarStyles.legend}>
        <div style={calendarStyles.legendItem}>
          <div style={{...calendarStyles.legendColor, ...calendarStyles.availableDay}}></div>
          <span>Tersedia</span>
        </div>
        <div style={calendarStyles.legendItem}>
          <div style={{...calendarStyles.legendColor, ...calendarStyles.selectedDay}}></div>
          <span>Dipilih</span>
        </div>
        <div style={calendarStyles.legendItem}>
          <div style={{...calendarStyles.legendColor, ...calendarStyles.unavailableDay}}></div>
          <span>Tidak ada data</span>
        </div>
      </div>
    </div>
  );
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [filterDates, setFilterDates] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error('Gagal ambil history:', err));
  }, []);

  const availableDates = useMemo(() => {
    const dates = new Set();
    history.forEach(entry => {
      // Parse tanggal dari server dan format dalam timezone lokal
      const serverDate = new Date(entry.created_at);
      const year = serverDate.getFullYear();
      const month = String(serverDate.getMonth() + 1).padStart(2, '0');
      const day = String(serverDate.getDate()).padStart(2, '0');
      const localDateKey = `${year}-${month}-${day}`;
      dates.add(localDateKey);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [history]);

  const sensorKeys = useMemo(() => {
    const keys = new Set();
    history.forEach(entry => entry.values.forEach(v => keys.add(v.keterangan_sensor)));
    return Array.from(keys);
  }, [history]);

  const filtered = useMemo(() => {
    if (filterDates.length === 0) return history;
    return history.filter(entry => {
      // Parse tanggal dari server dan format dalam timezone lokal
      const serverDate = new Date(entry.created_at);
      const year = serverDate.getFullYear();
      const month = String(serverDate.getMonth() + 1).padStart(2, '0');
      const day = String(serverDate.getDate()).padStart(2, '0');
      const entryDateKey = `${year}-${month}-${day}`;
      return filterDates.includes(entryDateKey);
    });
  }, [history, filterDates]);

  const handleDateSelect = (date) => {
    setFilterDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const clearFilters = () => setFilterDates([]);

  const exportToExcel = () => {
    const formatted = filtered.map(entry => ({
      koordinat: entry.koordinat,
      created_at: entry.created_at,
      ...Object.fromEntries(entry.values.map(v => [v.keterangan_sensor, v.nilai_sensor]))
    }));
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer]), 'sensor_history.xlsx');
  };

  return (
    <div style={styles.fullWrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>History Sensor</h2>
        <div style={styles.controls}>
          <div style={styles.filterContainer}>
            <div style={styles.filterHeader}>
              <button 
                onClick={() => setShowCalendar(!showCalendar)} 
                style={styles.calendarToggleBtn}
              >
              {showCalendar ? 'Tutup Kalender' : 'Kalender'}
              </button>
              <button onClick={clearFilters} style={styles.clearBtn}>Reset Filter</button>
              {filterDates.length > 0 && (
                <span style={styles.selectedCount}>
                  {filterDates.length} Tanggal dipilih
                </span>
              )}
            </div>
            
            {showCalendar && (
              <div style={styles.calendarWrapper}>
                <Calendar 
                  selectedDates={filterDates}
                  onDateSelect={handleDateSelect}
                  availableDates={availableDates}
                />
              </div>
            )}
            
            {filterDates.length > 0 && (
              <div style={styles.selectedDates}>
                <strong>Tanggal dipilih:</strong>
                <div style={styles.selectedDatesList}>
                  {filterDates.sort((a, b) => b.localeCompare(a)).map(date => (
                    <span key={date} style={styles.selectedDateTag}>
                      {new Date(date).toLocaleDateString('id-ID', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                      <button 
                        onClick={() => handleDateSelect(date)}
                        style={styles.removeTag}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div style={styles.actionButtons}>
            <button onClick={exportToExcel} style={styles.exportBtnInline}>Unduh Excel</button>
            <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>Dashboard</button>
          </div>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, width: '15%' }}>Koordinat</th>
              <th style={{ ...styles.th, width: '20%' }}>Waktu</th>
              {sensorKeys.map(key => (
                <th key={key} style={styles.th}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={2 + sensorKeys.length} style={styles.noData}>Tidak ada data.</td></tr>
            ) : (
              filtered.map((entry, idx) => (
                <tr key={idx} style={idx % 2 === 0 ? styles.evenRow : styles.oddRow}>
                  <td style={styles.td}>{entry.koordinat}</td>
                  <td style={styles.td}>{new Date(entry.created_at).toLocaleString()}</td>
                  {sensorKeys.map(key => {
                    const val = entry.values.find(v => v.keterangan_sensor === key);
                    return <td key={key} style={styles.td}>{val ? val.nilai_sensor : '-'}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  fullWrapper: {
    position: 'fixed', 
    top: 0, 
    left: 0,
    width: '100%', 
    height: '100%', 
    background: '#f7fafc',  // Changed to match dashboard background
    padding: 30,
    boxSizing: 'border-box', 
    overflowY: 'auto', 
    zIndex: 1000,
    fontFamily: 'Inter'  // Added font family to match dashboard
  },
  header: { 
    marginBottom: 20 
  },
  title: { 
    fontSize: 24, 
    margin: 0, 
    marginBottom: 10, 
    color: '#1e293b'  // Changed to match dashboard text color
  },
  controls: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    gap: 20 
  },
  filterContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 12,
    minWidth: '400px'
  },
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  calendarToggleBtn: { 
    padding: '12px 20px',  // Increased padding
    background: '#68d391',  // Changed to match dashboard green
    color: '#1e293b',  // Changed text color
    border: 'none', 
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer', 
    fontSize: 14,
    fontWeight: '500',  // Added font weight
    transition: 'all 0.3s ease',  // Added transition
    boxShadow: '0 2px 4px rgba(104, 211, 145, 0.3)'  // Added shadow
  },
  clearBtn: { 
    padding: '12px 20px',  // Increased padding
    background: '#cbd5e0',  // Changed to match dashboard card color
    border: '1.5px solid #a0aec0',  // Changed border to match dashboard
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer', 
    fontSize: 14,
    color: '#1e293b',  // Changed text color
    fontWeight: '500',  // Added font weight
    transition: 'all 0.3s ease'  // Added transition
  },
  selectedCount: {
    fontSize: 14,
    color: '#4db3d9',  // Changed to match dashboard accent color
    fontWeight: 'bold'
  },
  calendarWrapper: {
    background: '#cbd5e0',  // Changed to match dashboard card color
    border: '1.5px solid #a0aec0',  // Changed border to match dashboard
    borderRadius: 16,  // Increased border radius to match dashboard
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',  // Changed shadow
    zIndex: 1001
  },
  selectedDates: {
    padding: 20,  // Increased padding
    background: '#cbd5e0',  // Changed to match dashboard card color
    borderRadius: 12,  // Increased border radius
    border: '1.5px solid #a0aec0',  // Changed border to match dashboard
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'  // Added shadow
  },
  selectedDatesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,  // Increased gap
    marginTop: 12  // Increased margin
  },
  selectedDateTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',  // Increased padding
    background: '#80cee1',  // Changed to match dashboard primary color
    color: '#1e293b',  // Changed text color
    borderRadius: 16,  // Increased border radius
    fontSize: 12,
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(128, 206, 225, 0.3)'  // Added shadow
  },
  removeTag: {
    background: 'none',
    border: 'none',
    color: '#1e293b',  // Changed text color
    cursor: 'pointer',
    fontSize: 16,  // Increased font size
    fontWeight: 'bold',
    padding: 0,
    marginLeft: 4
  },
  actionButtons: { 
    display: 'flex', 
    gap: 12  // Increased gap
  },
  backBtn: { 
    padding: '12px 20px',  // Increased padding
    background: '#cbd5e0',  // Changed to match dashboard card color
    color: '#1e293b',  // Changed text color
    border: '1.5px solid #a0aec0',  // Changed border to match dashboard
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer', 
    fontSize: 14,
    fontWeight: '500',  // Added font weight
    transition: 'all 0.3s ease'  // Added transition
  },
  exportBtnInline: { 
    padding: '12px 20px',  // Increased padding
    background: '#80cee1',  // Changed to match dashboard primary color
    color: '#1e293b',  // Changed text color
    border: 'none', 
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer', 
    fontSize: 14,
    fontWeight: '500',  // Added font weight
    transition: 'all 0.3s ease',  // Added transition
    boxShadow: '0 2px 4px rgba(128, 206, 225, 0.3)'  // Added shadow
  },
  tableWrapper: { 
    overflowX: 'auto', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    borderRadius: 16,
    background: '#cbd5e0',
    border: '1.5px solid #a0aec0',
    overflow: 'hidden'  // Important for radius to work properly
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse'  // Changed to collapse for seamless look
  },
  headerRow: { 
    background: '#80cee1',  // Changed to match dashboard primary color
    color: '#1e293b'  // Changed text color
  },
  th: { 
    padding: '16px 20px',
    textAlign: 'left', 
    fontWeight: '600',
    fontSize: 16,
    color: '#1e293b',
    borderBottom: '2px solid #a0aec0',
    borderRight: '1px solid #a0aec0'  // Add right border for column separation
  },
  td: { 
    padding: '16px 20px',
    background: 'transparent',
    color: '#1e293b',
    fontSize: 14,
    borderBottom: '1px solid #a0aec0',
    borderRight: '1px solid #a0aec0'  // Add right border for column separation
  },
  evenRow: { 
    background: 'transparent'  // Changed background
  },
  oddRow: { 
    background: 'transparent'  // Changed background
  },
  noData: { 
    textAlign: 'center', 
    padding: 30,
    color: '#4db3d9',
    fontSize: 16,
    fontWeight: '500',
    background: 'transparent',  // Remove separate background
    borderBottom: 'none'  // Remove border for no data row
  }
};

const calendarStyles = {
  container: {
    padding: 20,  // Increased padding
    fontFamily: 'Inter'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20  // Increased margin
  },
  navButton: {
    background: '#80cee1',  // Changed to match dashboard primary color
    color: '#1e293b',  // Changed text color
    border: 'none',
    padding: '10px 14px',  // Increased padding
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 'bold',
    transition: 'all 0.3s ease',  // Added transition
    boxShadow: '0 2px 4px rgba(128, 206, 225, 0.3)'  // Added shadow
  },
  monthTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b'  // Changed text color
  },
  monthSelector: {
    position: 'relative',
  },
  monthButton: {
    background: '#a0aec0',  // Changed background
    border: '1.5px solid #a0aec0',  // Changed border
    padding: '10px 16px',  // Increased padding
    borderRadius: 8,  // Increased border radius
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',  // Changed text color
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.3s ease'  // Added transition
  },
  monthDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#cbd5e0',  // Changed background
    border: '1.5px solid #a0aec0',  // Changed border
    borderRadius: 8,  // Increased border radius
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',  // Changed shadow
    zIndex: 1002,
    maxHeight: '200px',
    overflowY: 'auto'
  },
  monthOption: {
    padding: '12px 16px',  // Increased padding
    cursor: 'pointer',
    fontSize: 14,
    borderBottom: '1px solid #a0aec0',  // Changed border color
    transition: 'background-color 0.2s',
    color: '#1e293b'  // Added text color
  },
  noDataOption: {
    padding: '12px 16px',  // Increased padding
    fontSize: 14,
    color: '#4db3d9',  // Changed color
    textAlign: 'center'
  },
  dayNames: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,  // Increased gap
    marginBottom: 12  // Increased margin
  },
  dayName: {
    textAlign: 'center',
    padding: '10px 4px',  // Increased padding
    fontWeight: 'bold',
    fontSize: 12,
    color: '#1e293b',  // Changed text color
    background: '#a0aec0'  // Changed background
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,  // Increased gap
    marginBottom: 20  // Increased margin
  },
  day: {
    textAlign: 'center',
    padding: '10px 4px',  // Increased padding
    cursor: 'pointer',
    fontSize: 14,
    minHeight: '36px',  // Increased height
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    borderRadius: 6  // Added border radius
  },
  emptyDay: {
    minHeight: '36px'  // Increased height
  },
  availableDay: {
    background: '#f7fafc',  // Changed background
    color: '#1e293b',  // Changed text color
    border: '1px solid #80cee1'  // Changed border
  },
  unavailableDay: {
    background: '#e2e8f0',  // Changed background
    color: '#a0aec0',  // Changed text color
    cursor: 'not-allowed'
  },
  selectedDay: {
    background: '#80cee1',  // Changed to match dashboard primary color
    color: '#1e293b',  // Changed text color
    fontWeight: 'bold',
    border: '2px solid #4db3d9'  // Changed border color
  },
  legend: {
    display: 'flex',
    justifyContent: 'space-around',
    fontSize: 12,
    color: '#1e293b'  // Changed text color
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6  // Increased gap
  },
  legendColor: {
    width: 14,  // Increased size
    height: 14,  // Increased size
    borderRadius: 3  // Increased border radius
  }
};
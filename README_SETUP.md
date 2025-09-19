# Hospital Monitoring System - MQTT + PostgreSQL Setup

## 🚀 Setup Instructions

### 1. Database Setup

```bash
# Login ke PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hospital_monitoring_system;

# Exit dan run setup script
\q
psql -U postgres -d hospital_monitoring_system -f database_setup.sql
```

### 2. Environment Variables

File `.env` sudah dikonfigurasi dengan:

```
# MQTT Configuration
VITE_APP_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospital_monitoring_system
DB_USER=postgres
DB_PASS=1234
```

### 3. Run Development Server

```bash
npm run dev
```

## 📊 How It Works

### Data Flow Architecture

```
MQTT Broker → Frontend (Real-time) → Charts
     ↓
Nitro Plugin → Buffer → Daily Save → PostgreSQL
                                         ↓
                                Frontend (Historical) → Charts
```

### Filter Logic

- **Real-time**: Data langsung dari MQTT, update per detik di chart
- **1 Jam / 24 Jam / 7 Hari / 30 Hari**: Data dari PostgreSQL berdasarkan filter

### Automatic Database Save

- MQTT data disimpan ke buffer di memory
- Setiap hari jam 00:00 → data disimpan ke PostgreSQL
- Buffer di-clear setelah save

## 🧪 Testing

### 1. Test Database Connection

```bash
# Check API endpoints
curl http://localhost:3000/api/hospitals
curl http://localhost:3000/api/current/rs-a
curl http://localhost:3000/api/history/rs-a?hours=24
```

### 2. Test MQTT Data

- Buka dashboard
- Pilih filter "Real-time"
- Klik "Test MQTT" untuk kirim data sample
- Data akan muncul real-time di chart

### 3. Test Historical Data

- Pilih filter "1 Jam" atau "24 Jam"
- Data akan diload dari PostgreSQL
- Loading indicator akan muncul

## 📱 Frontend Features

### Real-time Mode

- Filter: "Real-time"
- Data source: MQTT langsung
- Update: Per detik
- Storage: Buffer in memory

### Historical Mode

- Filter: "1 Jam", "24 Jam", "7 Hari", "30 Hari"
- Data source: PostgreSQL
- Update: On filter change
- Storage: Persistent database

## 🗄️ Database Schema

### Tables:

1. **hospitals** - Data rumah sakit
2. **electricity_readings** - Data voltase listrik
3. **water_readings** - Data debit air
4. **patient_readings** - Data jumlah pasien
5. **ph_readings** - Data pH level

### API Endpoints:

- `GET /api/hospitals` - List all hospitals
- `GET /api/current/:hospitalCode` - Current readings
- `GET /api/history/:hospitalCode?hours=24` - Historical data
- `POST /api/save-data` - Manual save to database

## 🔧 Configuration

### MQTT Topics:

- `/ruangMawar` → rs-a (RSUD Bendan - Ruang Jlamprang)
- `/ruangMelati` → rs-b (RSUD Bendan - Ruang Truntum)

### MQTT Message Format:

```json
{
  "electricity": 245.5,
  "water": 37.2,
  "pasien": 105,
  "ph": 7.0
}
```

### Daily Save Schedule:

- Cron: `0 0 * * *` (Every day at 00:00)
- Saves latest data from buffer to PostgreSQL
- Clears buffer after save

## 🚨 Troubleshooting

### Database Connection Issues:

1. Check PostgreSQL service running
2. Verify credentials in `.env`
3. Ensure database exists
4. Check network connectivity

### MQTT Connection Issues:

1. Check internet connection
2. Verify broker URL in `.env`
3. Check browser console for errors

### Historical Data Not Loading:

1. Check database has data
2. Verify API endpoints working
3. Check browser network tab
4. Ensure correct hospital code

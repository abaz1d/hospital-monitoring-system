# FILTER & EXPORT SYSTEM TEST GUIDE

## 🧪 Testing Filter System

### 1. Real-time Filter

- **Expected**: Menggunakan data MQTT langsung
- **Test**: Pilih "Real-time" di dropdown filter
- **Result**: Data seharusnya update setiap beberapa detik dari MQTT

### 2. Today Filter

- **Expected**: Data dari awal hari ini sampai sekarang dari database
- **Test**: Pilih "Today" di dropdown filter
- **Result**: Chart menampilkan data hari ini dari database

### 3. This Week Filter

- **Expected**: Data dari awal minggu ini sampai sekarang
- **Test**: Pilih "This Week" di dropdown filter
- **Result**: Chart menampilkan data seminggu terakhir

### 4. This Month Filter

- **Expected**: Data dari awal bulan ini sampai sekarang
- **Test**: Pilih "This Month" di dropdown filter
- **Result**: Chart menampilkan data sebulan terakhir

### 5. This Year Filter

- **Expected**: Data dari awal tahun ini sampai sekarang
- **Test**: Pilih "This Year" di dropdown filter
- **Result**: Chart menampilkan data setahun terakhir

### 6. Custom Date Range Filter

- **Expected**: Data berdasarkan tanggal yang dipilih user
- **Test**:
  1. Pilih "Custom Date Range" di dropdown
  2. Pilih start date dan end date
  3. Klik "Apply"
- **Result**: Chart menampilkan data sesuai range tanggal

## 📊 Testing Export Excel

### Export Features:

- ✅ **Excel Only** (PDF dan Image dihapus)
- ✅ **Current Values Summary** dengan status (HIGH/LOW/NORMAL)
- ✅ **Statistical Analysis** (Average, Min, Max, Std Dev)
- ✅ **Complete Historical Data** berdasarkan filter aktif
- ✅ **Smart File Naming** dengan hospital code dan filter type

### Test Cases:

1. **Real-time Export**: Pilih Real-time → Export → Should contain current MQTT data
2. **Historical Export**: Pilih filter historical → Export → Should contain database data
3. **Custom Range Export**: Pilih custom date → Export → Should contain data for selected range
4. **Large Dataset**: Pilih "This Year" → Export → Should handle large dataset efficiently

### Expected Excel Content:

```
HOSPITAL MONITORING SYSTEM - DATA EXPORT
==========================================
Exported on: 20/09/2024 14:30:25
Hospital: RSUD Bendan - Ruang Jlamprang
Filter: This Week
Total Records: 168

CURRENT VALUES SUMMARY
------------------------------
Parameter | Current Value | Unit | Status | Max Threshold
Daya Listrik | 387.45 | Volt | NORMAL | 500
Debit Air | 42.33 | L/min | NORMAL | 100
Jumlah Pasien | 23 | Orang | NORMAL | 50
pH Level | 7.15 | pH | NORMAL | 6.5-8.5 (Normal Range)

STATISTICAL ANALYSIS
-------------------------
Parameter | Average | Minimum | Maximum | Standard Dev
Daya Listrik (V) | 385.23 | 298.45 | 487.12 | 45.67
Debit Air (L/min) | 41.78 | 22.34 | 78.90 | 12.45
Jumlah Pasien | 22.5 | 12 | 45 | 8.34
pH Level | 7.12 | 6.78 | 7.89 | 0.23

DETAILED HISTORICAL DATA
------------------------------
No | Timestamp | Daya Listrik (V) | Debit Air (L/min) | Jumlah Pasien | pH Level | Notes
1 | 15/09/2024 08:00 | 387.45 | 42.33 | 23 | 7.15 | Normal
2 | 15/09/2024 09:00 | 395.67 | 45.78 | 25 | 7.23 | Normal
...
```

## 🎯 Expected Behavior

### Filter Workflow:

1. **User selects filter** → `updateTimeFilter()` called
2. **If Real-time** → Use MQTT data directly
3. **If Historical** → Call `loadDataByFilter()`
4. **Load from database** → Call appropriate API endpoint
5. **Update charts** → Convert database format to chart format
6. **Export** → Use current filtered data for Excel export

### Data Flow:

```
[User Filter Selection]
        ↓
[updateTimeFilter()]
        ↓
[loadDataByFilter()]
        ↓
[API: /api/history/RS-A?hours=24 OR startDate=X&endDate=Y]
        ↓
[Database Query]
        ↓
[convertDatabaseToChartData()]
        ↓
[Update Charts & Gauges]
        ↓
[Export: Use filtered data for Excel]
```

## ✅ Success Criteria

1. **Filter switching works smoothly** between real-time and historical
2. **Database queries execute efficiently** for different time ranges
3. **Charts update properly** with correct data based on filter
4. **Excel export contains accurate data** matching current filter
5. **File names are descriptive** (e.g., `MonitoringData_RS-A_Today_20240920_1430.csv`)
6. **Export includes comprehensive analysis** (summary, statistics, detailed data)
7. **No PDF/Image export buttons** visible in UI
8. **Loading states work properly** during data fetching

-- Test database setup for hospital monitoring system

-- 1. Create database (if not exists)
-- You need to run this as postgres superuser first:
-- CREATE DATABASE hospital_monitoring_system;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    hospital_code VARCHAR(10) UNIQUE NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    mqtt_topic VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electricity_readings (
    id BIGSERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    voltage_value DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS water_readings (
    id BIGSERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    flow_rate DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_readings (
    id BIGSERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    patient_count INTEGER NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ph_readings (
    id BIGSERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    ph_value DECIMAL(4,2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_ph_range CHECK (ph_value >= 0 AND ph_value <= 14)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_electricity_hospital_time ON electricity_readings(hospital_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_hospital_time ON water_readings(hospital_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_hospital_time ON patient_readings(hospital_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ph_hospital_time ON ph_readings(hospital_id, recorded_at DESC);

-- 4. Insert sample hospitals
INSERT INTO hospitals (hospital_code, hospital_name, mqtt_topic, location, is_active) VALUES
('rs-a', 'RSUD Bendan - Ruang Jlamprang', '/ruangMawar', 'Gedung A Lantai 1', true),
('rs-b', 'RSUD Bendan - Ruang Truntum', '/ruangMelati', 'Gedung A Lantai 2', true),
('rs-c', 'RSUD Bendan - Ruang Anggrek', '/ruangAnggrek', 'Gedung B Lantai 1', false),
('rs-d', 'RSUD Bendan - Ruang Dahlia', '/ruangDahlia', 'Gedung B Lantai 2', false),
('rs-e', 'RSUD Bendan - Ruang Kenanga', '/ruangKenanga', 'Gedung C Lantai 1', false)
ON CONFLICT (hospital_code) DO NOTHING;

-- 5. Insert sample data for testing
INSERT INTO electricity_readings (hospital_id, voltage_value, recorded_at) VALUES
-- RS-A data
(1, 245.50, NOW() - INTERVAL '1 hour'),
(1, 247.20, NOW() - INTERVAL '30 minutes'),
(1, 250.10, NOW()),
-- RS-B data
(2, 230.80, NOW() - INTERVAL '1 hour'),
(2, 235.60, NOW() - INTERVAL '30 minutes'),
(2, 240.30, NOW()),
-- RS-C data
(3, 220.50, NOW() - INTERVAL '1 hour'),
(3, 225.20, NOW() - INTERVAL '30 minutes'),
(3, 230.10, NOW()),
-- RS-D data
(4, 210.80, NOW() - INTERVAL '1 hour'),
(4, 215.60, NOW() - INTERVAL '30 minutes'),
(4, 220.30, NOW()),
-- RS-E data
(5, 200.50, NOW() - INTERVAL '1 hour'),
(5, 205.20, NOW() - INTERVAL '30 minutes'),
(5, 210.10, NOW());

INSERT INTO water_readings (hospital_id, flow_rate, recorded_at) VALUES
-- RS-A data
(1, 35.5, NOW() - INTERVAL '1 hour'),
(1, 37.2, NOW() - INTERVAL '30 minutes'),
(1, 38.8, NOW()),
-- RS-B data
(2, 28.4, NOW() - INTERVAL '1 hour'),
(2, 30.1, NOW() - INTERVAL '30 minutes'),
(2, 32.5, NOW()),
-- RS-C data
(3, 25.5, NOW() - INTERVAL '1 hour'),
(3, 27.2, NOW() - INTERVAL '30 minutes'),
(3, 28.8, NOW()),
-- RS-D data
(4, 22.4, NOW() - INTERVAL '1 hour'),
(4, 24.1, NOW() - INTERVAL '30 minutes'),
(4, 25.5, NOW()),
-- RS-E data
(5, 18.5, NOW() - INTERVAL '1 hour'),
(5, 20.2, NOW() - INTERVAL '30 minutes'),
(5, 21.8, NOW());

INSERT INTO patient_readings (hospital_id, patient_count, recorded_at) VALUES
-- RS-A data
(1, 85, NOW() - INTERVAL '1 hour'),
(1, 92, NOW() - INTERVAL '30 minutes'),
(1, 105, NOW()),
-- RS-B data
(2, 45, NOW() - INTERVAL '1 hour'),
(2, 48, NOW() - INTERVAL '30 minutes'),
(2, 52, NOW()),
-- RS-C data
(3, 35, NOW() - INTERVAL '1 hour'),
(3, 38, NOW() - INTERVAL '30 minutes'),
(3, 42, NOW()),
-- RS-D data
(4, 25, NOW() - INTERVAL '1 hour'),
(4, 28, NOW() - INTERVAL '30 minutes'),
(4, 32, NOW()),
-- RS-E data
(5, 15, NOW() - INTERVAL '1 hour'),
(5, 18, NOW() - INTERVAL '30 minutes'),
(5, 22, NOW());

INSERT INTO ph_readings (hospital_id, ph_value, recorded_at) VALUES
-- RS-A data
(1, 7.2, NOW() - INTERVAL '1 hour'),
(1, 7.0, NOW() - INTERVAL '30 minutes'),
(1, 6.8, NOW()),
-- RS-B data
(2, 7.5, NOW() - INTERVAL '1 hour'),
(2, 7.3, NOW() - INTERVAL '30 minutes'),
(2, 7.1, NOW()),
-- RS-C data
(3, 6.8, NOW() - INTERVAL '1 hour'),
(3, 6.9, NOW() - INTERVAL '30 minutes'),
(3, 7.0, NOW()),
-- RS-D data
(4, 7.8, NOW() - INTERVAL '1 hour'),
(4, 7.6, NOW() - INTERVAL '30 minutes'),
(4, 7.4, NOW()),
-- RS-E data
(5, 8.1, NOW() - INTERVAL '1 hour'),
(5, 7.9, NOW() - INTERVAL '30 minutes'),
(5, 7.7, NOW());

-- 6. Verify data
SELECT 'Hospitals' as table_name, COUNT(*) as record_count FROM hospitals
UNION ALL
SELECT 'Electricity Readings', COUNT(*) FROM electricity_readings
UNION ALL
SELECT 'Water Readings', COUNT(*) FROM water_readings
UNION ALL
SELECT 'Patient Readings', COUNT(*) FROM patient_readings
UNION ALL
SELECT 'pH Readings', COUNT(*) FROM ph_readings;

-- 7. Test query for current data
SELECT 
  h.hospital_name,
  h.hospital_code,
  h.mqtt_topic,
  (SELECT voltage_value FROM electricity_readings e WHERE e.hospital_id = h.id ORDER BY e.recorded_at DESC LIMIT 1) as electricity,
  (SELECT flow_rate FROM water_readings w WHERE w.hospital_id = h.id ORDER BY w.recorded_at DESC LIMIT 1) as water,
  (SELECT patient_count FROM patient_readings p WHERE p.hospital_id = h.id ORDER BY p.recorded_at DESC LIMIT 1) as pasien,
  (SELECT ph_value FROM ph_readings ph WHERE ph.hospital_id = h.id ORDER BY ph.recorded_at DESC LIMIT 1) as ph
FROM hospitals h
WHERE h.is_active = true;
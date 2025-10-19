import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDatabase() {
  if (!pool) {
    console.log('Initializing database connection pool');
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'hospital_monitoring_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '1234',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err);
    });
  }

  return pool;
}

export async function saveSensorDataToDatabase(
  hospitalCode: string,
  electricity: number,
  water: number,
  pasien: number,
  ph?: number
) {
  const pool = getDatabase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hospitalResult = await client.query('SELECT id FROM hospitals WHERE hospital_code = $1', [hospitalCode]);

    if (hospitalResult.rows.length === 0) {
      throw new Error(`Hospital with code ${hospitalCode} not found`);
    }

    const hospitalId = hospitalResult.rows[0].id;
    const timestamp = new Date();

    await client.query(
      'INSERT INTO electricity_readings (hospital_id, voltage_value, recorded_at) VALUES ($1, $2, $3)',
      [hospitalId, electricity, timestamp]
    );

    await client.query('INSERT INTO water_readings (hospital_id, flow_rate, recorded_at) VALUES ($1, $2, $3)', [
      hospitalId,
      water,
      timestamp
    ]);

    await client.query('INSERT INTO patient_readings (hospital_id, patient_count, recorded_at) VALUES ($1, $2, $3)', [
      hospitalId,
      pasien,
      timestamp
    ]);

    if (ph !== undefined) {
      await client.query('INSERT INTO ph_readings (hospital_id, ph_value, recorded_at) VALUES ($1, $2, $3)', [
        hospitalId,
        ph,
        timestamp
      ]);
    }

    await client.query('COMMIT');
    console.log(`✅ Data saved to database for hospital ${hospitalCode}`);

    return { success: true, timestamp };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving sensor data to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getHistoricalData(hospitalCode: string, hours: number = 24) {
  const pool = getDatabase();
  const client = await pool.connect();

  try {
    const hospitalResult = await client.query('SELECT id FROM hospitals WHERE hospital_code = $1', [hospitalCode]);

    if (hospitalResult.rows.length === 0) {
      throw new Error(`Hospital with code ${hospitalCode} not found`);
    }

    const hospitalId = hospitalResult.rows[0].id;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [electricityData, waterData, patientData, phData] = await Promise.all([
      client.query(
        'SELECT voltage_value as value, recorded_at as timestamp FROM electricity_readings WHERE hospital_id = $1 AND recorded_at >= $2 ORDER BY recorded_at ASC',
        [hospitalId, since]
      ),
      client.query(
        'SELECT flow_rate as value, recorded_at as timestamp FROM water_readings WHERE hospital_id = $1 AND recorded_at >= $2 ORDER BY recorded_at ASC',
        [hospitalId, since]
      ),
      client.query(
        'SELECT patient_count as value, recorded_at as timestamp FROM patient_readings WHERE hospital_id = $1 AND recorded_at >= $2 ORDER BY recorded_at ASC',
        [hospitalId, since]
      ),
      client.query(
        'SELECT ph_value as value, recorded_at as timestamp FROM ph_readings WHERE hospital_id = $1 AND recorded_at >= $2 ORDER BY recorded_at ASC',
        [hospitalId, since]
      )
    ]);

    return {
      electricity: electricityData.rows,
      water: waterData.rows,
      pasien: patientData.rows,
      ph: phData.rows
    };
  } catch (error) {
    console.error('❌ Error fetching historical data:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getHistoricalDataByDateRange(hospitalCode: string, startDate: string, endDate: string) {
  const pool = getDatabase();
  const client = await pool.connect();

  try {
    const hospitalResult = await client.query('SELECT id FROM hospitals WHERE hospital_code = $1', [hospitalCode]);

    if (hospitalResult.rows.length === 0) {
      throw new Error(`Hospital with code ${hospitalCode} not found`);
    }

    const hospitalId = hospitalResult.rows[0].id;

    // Convert dates to proper format for PostgreSQL
    const startDateTime = new Date(startDate + 'T00:00:00Z');
    const endDateTime = new Date(endDate + 'T23:59:59Z');

    console.log(`📅 Fetching data from ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);

    const [electricityData, waterData, patientData, phData] = await Promise.all([
      client.query(
        'SELECT voltage_value as value, recorded_at as timestamp FROM electricity_readings WHERE hospital_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at ASC',
        [hospitalId, startDateTime, endDateTime]
      ),
      client.query(
        'SELECT flow_rate as value, recorded_at as timestamp FROM water_readings WHERE hospital_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at ASC',
        [hospitalId, startDateTime, endDateTime]
      ),
      client.query(
        'SELECT patient_count as value, recorded_at as timestamp FROM patient_readings WHERE hospital_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at ASC',
        [hospitalId, startDateTime, endDateTime]
      ),
      client.query(
        'SELECT ph_value as value, recorded_at as timestamp FROM ph_readings WHERE hospital_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at ASC',
        [hospitalId, startDateTime, endDateTime]
      )
    ]);

    return {
      electricity: electricityData.rows,
      water: waterData.rows,
      pasien: patientData.rows,
      ph: phData.rows
    };
  } catch (error) {
    console.error('❌ Error fetching historical data by date range:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getCurrentData(hospitalCode: string) {
  const pool = getDatabase();
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT 
        h.hospital_name,
        h.hospital_code,
        h.mqtt_topic,
        (SELECT voltage_value FROM electricity_readings e WHERE e.hospital_id = h.id ORDER BY e.recorded_at DESC LIMIT 1) as electricity,
        (SELECT flow_rate FROM water_readings w WHERE w.hospital_id = h.id ORDER BY w.recorded_at DESC LIMIT 1) as water,
        (SELECT patient_count FROM patient_readings p WHERE p.hospital_id = h.id ORDER BY p.recorded_at DESC LIMIT 1) as pasien,
        (SELECT ph_value FROM ph_readings ph WHERE ph.hospital_id = h.id ORDER BY ph.recorded_at DESC LIMIT 1) as ph,
        GREATEST(
          (SELECT recorded_at FROM electricity_readings e WHERE e.hospital_id = h.id ORDER BY e.recorded_at DESC LIMIT 1),
          (SELECT recorded_at FROM water_readings w WHERE w.hospital_id = h.id ORDER BY w.recorded_at DESC LIMIT 1),
          (SELECT recorded_at FROM patient_readings p WHERE p.hospital_id = h.id ORDER BY p.recorded_at DESC LIMIT 1),
          (SELECT recorded_at FROM ph_readings ph WHERE ph.hospital_id = h.id ORDER BY ph.recorded_at DESC LIMIT 1)
        ) as last_updated
      FROM hospitals h
      WHERE h.hospital_code = $1 AND h.is_active = true
    `,
      [hospitalCode]
    );

    if (result.rows.length === 0) {
      throw new Error(`Hospital with code ${hospitalCode} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error fetching current data:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getAllHospitals() {
  const pool = getDatabase();
  const client = await pool.connect();

  try {
    // First check if new columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hospitals' 
      AND column_name IN ('kdbagian', 'bagian_mapping')
    `);

    const hasKdbagian = columnCheck.rows.some((row) => row.column_name === 'kdbagian');
    const hasBagianMapping = columnCheck.rows.some((row) => row.column_name === 'bagian_mapping');

    // Build query based on available columns
    let query = `
      SELECT 
        hospital_code as id, 
        hospital_name as name, 
        mqtt_topic as topic, 
        location,
        ${hasKdbagian ? 'kdbagian,' : 'NULL as kdbagian,'}
        ${hasBagianMapping ? 'bagian_mapping,' : 'NULL as bagian_mapping,'}
        is_active as "isActive"
      FROM hospitals 
      ORDER BY hospital_code ASC
    `;

    const result = await client.query(query);

    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching hospitals:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function saveRealTimePatientData(hospitalCode: string, patientCount: number, date: string) {
  const pool = getDatabase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hospitalResult = await client.query('SELECT id FROM hospitals WHERE hospital_code = $1', [hospitalCode]);

    if (hospitalResult.rows.length === 0) {
      throw new Error(`Hospital with code ${hospitalCode} not found`);
    }

    const hospitalId = hospitalResult.rows[0].id;
    const timestamp = new Date(date + 'T' + new Date().toTimeString().split(' ')[0]);

    // Insert patient reading
    await client.query('INSERT INTO patient_readings (hospital_id, patient_count, recorded_at) VALUES ($1, $2, $3)', [
      hospitalId,
      patientCount,
      timestamp
    ]);

    await client.query('COMMIT');
    console.log(`✅ Saved real-time patient data: ${hospitalCode} = ${patientCount} patients`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving real-time patient data:', error);
    throw error;
  } finally {
    client.release();
  }
}

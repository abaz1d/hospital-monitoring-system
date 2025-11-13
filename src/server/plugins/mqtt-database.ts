import mqtt from 'mqtt';
import { saveSensorDataToDatabase } from '../utils/database';

// ================================================================================================
// 📝 TIME HELPER FUNCTIONS FOR EASY CONFIGURATION
// ================================================================================================
const minutes = (m: number) => m * 60 * 1000;
const hours = (h: number) => h * 60 * 60 * 1000;
const days = (d: number) => d * 24 * 60 * 60 * 1000;

// Store untuk data MQTT sementara (sebelum disimpan ke database)
const mqttDataBuffer: Array<{
  hospitalCode: string;
  electricity: number;
  water: number;
  pasien: number;
  ph?: number;
  timestamp: Date;
}> = [];

// Buffer untuk data pH terpisah (global sensor)
const phDataBuffer: Array<{
  ph: number;
  timestamp: Date;
}> = [];

export default async () => {
  console.log('🚀 Starting MQTT + Database plugin...');

  // MQTT Client setup
  const mqttClient = mqtt.connect(process.env.VITE_APP_MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt', {
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 5000,
    keepalive: 60
  });

  mqttClient.on('connect', () => {
    console.log('✅ MQTT Connected to broker');

    // Subscribe to all hospital topics
    mqttClient.subscribe('/ruangMawar', (err) => {
      if (!err) console.log('✅ Subscribed to /ruangMawar');
    });

    mqttClient.subscribe('/ruangMelati', (err) => {
      if (!err) console.log('✅ Subscribed to /ruangMelati');
    });

    // Subscribe to global pH sensor
    mqttClient.subscribe('/ph', (err) => {
      if (!err) console.log('✅ Subscribed to /ph (global sensor)');
    });
  });

  mqttClient.on('error', (err) => {
    console.error('❌ MQTT Error:', err);
  });

  // MQTT Message handler - simpan ke buffer dulu
  mqttClient.on('message', async (topic, message) => {
    try {
      console.log(`📨 MQTT message from ${topic}:`, message.toString());

      const data = JSON.parse(message.toString());
      const timestamp = new Date();

      if (topic === '/ph') {
        // Handle global pH sensor data
        if (typeof data.ph === 'number') {
          phDataBuffer.push({
            ph: data.ph,
            timestamp
          });

          console.log(`🧪 pH data buffered: ${data.ph}`);

          // Keep pH buffer manageable
          if (phDataBuffer.length > 500) {
            phDataBuffer.splice(0, 50);
          }
        }
      } else {
        // Handle hospital-specific data
        let hospitalCode = '';
        if (topic === '/ruangMawar') hospitalCode = 'rs-a';
        if (topic === '/ruangMelati') hospitalCode = 'rs-b';

        if (hospitalCode && data.electricity !== undefined && data.water !== undefined && data.pasien !== undefined) {
          // Normalize data (handle null/empty values)
          const normalizedData = {
            hospitalCode,
            electricity: Number(data.electricity || 0),
            water: Number(data.water || 0),
            pasien: Number(data.pasien || 0),
            ph: phDataBuffer.length > 0 ? phDataBuffer[phDataBuffer.length - 1].ph : null,
            timestamp
          };

          // Add to buffer (untuk real-time display tetap lancar)
          mqttDataBuffer.push(normalizedData);

          console.log(`📊 Hospital data buffered for ${hospitalCode}:`, normalizedData);

          // Keep buffer size manageable (max 1000 entries)
          if (mqttDataBuffer.length > 1000) {
            mqttDataBuffer.splice(0, 100); // Remove oldest 100 entries
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  });

  // ================================================================================================
  // 🕐 DATABASE SAVE INTERVAL CONFIGURATION
  // ================================================================================================
  // CHANGE THIS VALUE TO ADJUST HOW OFTEN DATA IS SAVED TO DATABASE
  // Use helper functions for easier configuration:
  //
  // Examples:
  // const SAVE_INTERVAL_MS = minutes(1);     // Every 1 minute
  // const SAVE_INTERVAL_MS = minutes(5);     // Every 5 minutes  <- CURRENT SETTING
  // const SAVE_INTERVAL_MS = minutes(30);    // Every 30 minutes
  // const SAVE_INTERVAL_MS = hours(1);       // Every 1 hour
  // const SAVE_INTERVAL_MS = hours(6);       // Every 6 hours
  // const SAVE_INTERVAL_MS = hours(24);      // Every 24 hours (1 day)
  // const SAVE_INTERVAL_MS = days(1);        // Every 1 day
  //
  const SAVE_INTERVAL_MS = minutes(5); // ⏰ CURRENT: Every 5 minutes
  // ================================================================================================

  // Auto-save to database based on interval above
  setInterval(async () => {
    console.log('⏰ Scheduled database save started...');

    if (mqttDataBuffer.length === 0) {
      console.log('📭 No hospital data to save');
      return;
    }

    // Group data by hospital for batch processing
    const dataByHospital = mqttDataBuffer.reduce(
      (acc, item) => {
        if (!acc[item.hospitalCode]) {
          acc[item.hospitalCode] = [];
        }
        acc[item.hospitalCode].push(item);
        return acc;
      },
      {} as Record<string, typeof mqttDataBuffer>
    );

    let savedCount = 0;
    let errorCount = 0;

    // Save data for each hospital
    for (const [hospitalCode, hospitalData] of Object.entries(dataByHospital)) {
      try {
        // Get the latest data point with the most recent pH reading
        const latestData = hospitalData[hospitalData.length - 1];
        const latestPh = phDataBuffer.length > 0 ? phDataBuffer[phDataBuffer.length - 1].ph : null;

        await saveSensorDataToDatabase(
          hospitalCode,
          latestData.electricity,
          latestData.water,
          latestData.pasien,
          latestPh
        );

        savedCount++;
        console.log(`✅ Saved data for ${hospitalCode}:`, {
          electricity: latestData.electricity,
          water: latestData.water,
          pasien: latestData.pasien,
          ph: latestPh
        });
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to save data for ${hospitalCode}:`, error);
      }
    }

    console.log(`📈 Database save completed: ${savedCount} hospitals saved, ${errorCount} errors`);

    // Clear buffers after successful save
    if (savedCount > 0) {
      mqttDataBuffer.length = 0;
      console.log('🧹 Hospital data buffer cleared');

      // Keep only recent pH data (last 10 readings for next save cycle)
      if (phDataBuffer.length > 10) {
        phDataBuffer.splice(0, phDataBuffer.length - 10);
        console.log('🧪 pH buffer trimmed to last 10 readings');
      }
    }
  }, SAVE_INTERVAL_MS);

  // Manual save function for testing
  const saveBufferToDatabase = async () => {
    console.log('🧪 Manual save to database...');

    if (mqttDataBuffer.length > 0) {
      const latestData = mqttDataBuffer[mqttDataBuffer.length - 1];

      try {
        await saveSensorDataToDatabase(
          latestData.hospitalCode,
          latestData.electricity,
          latestData.water,
          latestData.pasien,
          latestData.ph
        );
        console.log('✅ Manual save successful');

        // Remove saved item from buffer
        mqttDataBuffer.pop();
      } catch (error) {
        console.error('❌ Manual save failed:', error);
      }
    } else {
      console.log('📭 No data in buffer to save');
    }
  };

  // Status function for debugging
  const getMqttBufferStatus = () => {
    return {
      hospitalDataBuffer: mqttDataBuffer.length,
      phDataBuffer: phDataBuffer.length,
      lastHospitalData: mqttDataBuffer.length > 0 ? mqttDataBuffer[mqttDataBuffer.length - 1] : null,
      lastPhData: phDataBuffer.length > 0 ? phDataBuffer[phDataBuffer.length - 1] : null,
      isConnected: mqttClient.connected,
      saveIntervalMinutes: SAVE_INTERVAL_MS / (60 * 1000),
      status: 'Active - Buffering MQTT data and auto-saving to database'
    };
  };

  // Expose functions globally for testing and status
  (global as any).saveBufferToDatabase = saveBufferToDatabase;
  (global as any).getMqttBufferStatus = getMqttBufferStatus;

  console.log('✅ MQTT + Database plugin initialized');
  console.log(`⏰ Auto-save every ${SAVE_INTERVAL_MS / (60 * 1000)} minutes`);
  console.log('🔧 To change save interval, modify SAVE_INTERVAL_MS in mqtt-database.ts');
  console.log('🧪 Manual save available via: global.saveBufferToDatabase()');
  console.log('📊 Buffer status available via: global.getMqttBufferStatus()');
};

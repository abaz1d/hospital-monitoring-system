import mqtt from 'mqtt';
import { saveSensorDataToDatabase } from '../utils/database';

// Store untuk data MQTT sementara (sebelum disimpan ke database)
const mqttDataBuffer: Array<{
  hospitalCode: string;
  electricity: number;
  water: number;
  pasien: number;
  ph?: number;
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
      
      // Determine hospital code based on topic
      let hospitalCode = '';
      if (topic === '/ruangMawar') hospitalCode = 'rs-a';
      if (topic === '/ruangMelati') hospitalCode = 'rs-b';
      
      if (hospitalCode && data.electricity !== undefined && data.water !== undefined && data.pasien !== undefined) {
        // Add to buffer (untuk real-time display tetap lancar)
        mqttDataBuffer.push({
          hospitalCode,
          electricity: data.electricity,
          water: data.water,
          pasien: data.pasien,
          ph: data.ph,
          timestamp
        });

        console.log(`📊 Data buffered for ${hospitalCode}:`, data);
        
        // Keep buffer size manageable (max 1000 entries)
        if (mqttDataBuffer.length > 1000) {
          mqttDataBuffer.splice(0, 100); // Remove oldest 100 entries
        }
      }
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  });

  // Simple interval-based save (every hour for testing)
  // You can adjust this interval or implement proper cron later
  setInterval(async () => {
    console.log('⏰ Hourly database save check...');
    
    if (mqttDataBuffer.length === 0) {
      console.log('📭 No data to save');
      return;
    }

    // Group data by hospital for batch processing
    const dataByHospital = mqttDataBuffer.reduce((acc, item) => {
      if (!acc[item.hospitalCode]) {
        acc[item.hospitalCode] = [];
      }
      acc[item.hospitalCode].push(item);
      return acc;
    }, {} as Record<string, typeof mqttDataBuffer>);

    let savedCount = 0;
    let errorCount = 0;

    // Save data for each hospital
    for (const [hospitalCode, hospitalData] of Object.entries(dataByHospital)) {
      try {
        // Get the latest data point
        const latestData = hospitalData[hospitalData.length - 1];
        
        await saveSensorDataToDatabase(
          hospitalCode,
          latestData.electricity,
          latestData.water,
          latestData.pasien,
          latestData.ph
        );
        
        savedCount++;
        console.log(`✅ Saved data for ${hospitalCode}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to save data for ${hospitalCode}:`, error);
      }
    }

    console.log(`📈 Save completed: ${savedCount} saved, ${errorCount} errors`);
    
    // Clear buffer after saving
    mqttDataBuffer.length = 0;
    console.log('🧹 Buffer cleared');
  }, 60 * 60 * 1000); // Every hour (3600000 ms)

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

  // Expose manual save function globally for testing
  (global as any).saveBufferToDatabase = saveBufferToDatabase;

  console.log('✅ MQTT + Database plugin initialized');
  console.log('⏰ Auto-save every hour + manual save available');
};
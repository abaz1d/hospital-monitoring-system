import mqtt, { type MqttClient } from 'mqtt';
import { onMounted, onUnmounted, ref } from 'vue';

interface MqttMessage {
  electricity: number;
  water: number;
  pasien: number;
}

interface PhMessage {
  ph: number;
}

interface Hospital {
  id: string;
  name: string;
  topic: string;
  isActive: boolean; // Indicates if hospital data is available
}

export const useMqtt = () => {
  const client = ref<MqttClient | null>(null);
  const isConnected = ref(false);
  const connectionStatus = ref('Disconnected');
  const lastMessage = ref<MqttMessage | null>(null);
  const mqttData = ref<MqttMessage & { timestamp: number }>({
    electricity: 0,
    water: 0,
    pasien: 0,
    timestamp: Date.now()
  });

  // Separate pH data (global sensor)
  const phData = ref<{ ph: number; timestamp: number }>({
    ph: 0, // Start with 0, will be updated by MQTT
    timestamp: Date.now()
  });

  const error = ref<string | null>(null);

  // Hospital list configuration
  const hospitals = ref<Hospital[]>([
    { id: 'rs-a', name: 'RSUD Bendan - Ruang Jlamprang', topic: '/ruangMawar', isActive: true },
    { id: 'rs-b', name: 'RSUD Bendan - Ruang Truntum', topic: '/ruangMelati', isActive: true },
    { id: 'rs-c', name: 'RSUD Bendan - Ruang Anggrek', topic: '/ruangAnggrek', isActive: false },
    { id: 'rs-d', name: 'RSUD Bendan - Ruang Dahlia', topic: '/ruangDahlia', isActive: false },
    { id: 'rs-e', name: 'RSUD Bendan - Ruang Kenanga', topic: '/ruangKenanga', isActive: false }
  ]);

  const currentHospital = ref<Hospital>(hospitals.value[0]);
  const currentTopic = ref(currentHospital.value.topic);

  // MQTT Configuration - using SSL connection to HiveMQ
  const mqttConfig = {
    // Using WSS for browser compatibility (SSL WebSocket)
    broker: import.meta.env.VITE_APP_MQTT_BROKER_URL,
    clientId: `dashboard_client_${Math.random().toString(16).substr(2, 8)}`,
    options: {
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 5000,
      keepalive: 60
      // For public HiveMQ broker, no authentication needed
      // username: '',
      // password: ''
    }
  };

  const connect = () => {
    try {
      connectionStatus.value = 'Connecting...';
      error.value = null;

      console.log('Connecting to MQTT broker:', mqttConfig.broker);

      client.value = mqtt.connect(mqttConfig.broker, {
        ...mqttConfig.options,
        clientId: mqttConfig.clientId
      });

      // Connection successful
      client.value.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        isConnected.value = true;
        connectionStatus.value = 'Connected';
        error.value = null;

        // Subscribe to the current hospital topic
        client.value?.subscribe(currentTopic.value, (err) => {
          if (!err) {
            console.log(`✅ Subscribed to ${currentTopic.value}`);
          } else {
            console.error(`❌ Failed to subscribe to ${currentTopic.value}:`, err);
            error.value = `Subscribe error: ${err.message}`;
          }
        });

        // Subscribe to global pH sensor topic
        client.value?.subscribe('/ph', (err) => {
          if (!err) {
            console.log('✅ Subscribed to /ph (global sensor)');
          } else {
            console.error('❌ Failed to subscribe to /ph:', err);
            error.value = `pH Subscribe error: ${err.message}`;
          }
        });
      });

      // Connection error
      client.value.on('error', (err) => {
        console.error('❌ MQTT connection error:', err);
        isConnected.value = false;
        connectionStatus.value = 'Error';
        error.value = err.message || 'Connection error';
      });

      // Connection closed
      client.value.on('close', () => {
        console.log('🔌 MQTT connection closed');
        isConnected.value = false;
        connectionStatus.value = 'Disconnected';
      });

      // Connection offline
      client.value.on('offline', () => {
        console.log('📴 MQTT client offline');
        isConnected.value = false;
        connectionStatus.value = 'Offline';
      });

      // Reconnecting
      client.value.on('reconnect', () => {
        console.log('🔄 MQTT reconnecting...');
        connectionStatus.value = 'Reconnecting...';
      });

      // Message received
      client.value.on('message', (topic, message) => {
        try {
          console.log(`📨 Received message from ${topic}:`, message.toString());

          if (topic === currentTopic.value) {
            // Handle hospital-specific data (electricity, water, pasien)
            const data = JSON.parse(message.toString()) as MqttMessage;

            // Validate the message structure
            if (
              typeof data.electricity === 'number' &&
              typeof data.water === 'number' &&
              typeof data.pasien === 'number'
            ) {
              lastMessage.value = data;
              mqttData.value = {
                electricity: data.electricity,
                water: data.water,
                pasien: data.pasien,
                timestamp: Date.now()
              };

              console.log('✅ Hospital data updated:', mqttData.value);
            } else {
              console.warn('⚠️ Invalid hospital message format:', data);
              error.value = 'Invalid hospital message format';
            }
          } else if (topic === '/ph') {
            // Handle global pH sensor data
            const data = JSON.parse(message.toString()) as PhMessage;

            if (typeof data.ph === 'number') {
              phData.value = {
                ph: data.ph,
                timestamp: Date.now()
              };

              console.log('✅ pH data updated:', phData.value);
            } else {
              console.warn('⚠️ Invalid pH message format:', data);
              error.value = 'Invalid pH message format';
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing MQTT message:', parseError);
          error.value = `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
        }
      });
    } catch (connectionError) {
      console.error('❌ Failed to connect to MQTT broker:', connectionError);
      connectionStatus.value = 'Failed';
      error.value = connectionError instanceof Error ? connectionError.message : 'Connection failed';
    }
  };

  const disconnect = () => {
    if (client.value) {
      console.log('🔌 Disconnecting from MQTT broker');
      client.value.end();
      client.value = null;
      isConnected.value = false;
      connectionStatus.value = 'Disconnected';
    }
  };

  const publish = (message: MqttMessage) => {
    if (client.value && isConnected.value) {
      const payload = JSON.stringify(message);
      client.value.publish(currentTopic.value, payload, (err) => {
        if (err) {
          console.error('❌ Publish error:', err);
          error.value = `Publish error: ${err.message}`;
        } else {
          console.log('✅ Message published:', payload);
        }
      });
    } else {
      console.warn('⚠️ Cannot publish: MQTT client not connected');
      error.value = 'Not connected to MQTT broker';
    }
  };

  // Function to switch hospital
  const switchHospital = (hospital: Hospital) => {
    // Only allow switching to active hospitals
    if (!hospital.isActive) {
      console.warn(`⚠️ Cannot switch to inactive hospital: ${hospital.name}`);
      error.value = `${hospital.name} belum tersedia`;
      return;
    }

    if (client.value && isConnected.value) {
      // Unsubscribe from current topic
      client.value.unsubscribe(currentTopic.value, (err) => {
        if (!err) {
          console.log(`✅ Unsubscribed from ${currentTopic.value}`);
        } else {
          console.error(`❌ Failed to unsubscribe from ${currentTopic.value}:`, err);
        }
      });

      // Update current hospital and topic
      currentHospital.value = hospital;
      currentTopic.value = hospital.topic;

      // Subscribe to new topic
      client.value.subscribe(currentTopic.value, (err) => {
        if (!err) {
          console.log(`✅ Subscribed to ${currentTopic.value} for ${hospital.name}`);
        } else {
          console.error(`❌ Failed to subscribe to ${currentTopic.value}:`, err);
          error.value = `Subscribe error: ${err.message}`;
        }
      });

      // Reset hospital data when switching hospitals (pH remains global)
      mqttData.value = {
        electricity: 0,
        water: 0,
        pasien: 0,
        timestamp: Date.now()
      };
    } else {
      // If not connected, just update the hospital for when connection is established
      currentHospital.value = hospital;
      currentTopic.value = hospital.topic;
    }
  };

  // Test function to publish sample hospital data
  const publishTestData = () => {
    const testData: MqttMessage = {
      electricity: Math.floor(Math.random() * 100) + 200,
      water: Math.floor(Math.random() * 50) + 20,
      pasien: Math.floor(Math.random() * 30) + 10
    };
    publish(testData);
  };

  // Test function to publish sample pH data
  const publishTestPhData = () => {
    const testPhData: PhMessage = {
      ph: Math.round((Math.random() * 6 + 4) * 100) / 100 // pH 4.00 - 10.00
    };

    if (client.value && isConnected.value) {
      const payload = JSON.stringify(testPhData);
      client.value.publish('/ph', payload, (err) => {
        if (err) {
          console.error('❌ pH Publish error:', err);
          error.value = `pH Publish error: ${err.message}`;
        } else {
          console.log('✅ pH Message published:', payload);
        }
      });
    } else {
      console.warn('⚠️ Cannot publish pH: MQTT client not connected');
      error.value = 'Not connected to MQTT broker';
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    client,
    isConnected,
    connectionStatus,
    mqttData,
    phData, // Global pH data
    lastMessage,
    error,

    // Hospital management
    hospitals,
    currentHospital,
    currentTopic,

    // Methods
    connect,
    disconnect,
    publish,
    publishTestData,
    publishTestPhData, // pH test function
    switchHospital,

    // Config (for debugging)
    mqttConfig
  };
};

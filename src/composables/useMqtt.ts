import mqtt, { type MqttClient } from 'mqtt';
import { onMounted, onUnmounted, ref } from 'vue';

interface MqttMessage {
  electricity: number;
  water: number;
  pasien: number;
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
  const error = ref<string | null>(null);

  // MQTT Configuration - using SSL connection to HiveMQ
  const mqttConfig = {
    // Using WSS for browser compatibility (SSL WebSocket)
    broker: 'wss://broker.hivemq.com:8884/mqtt',
    topic: '/ruangMawar',
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

        // Subscribe to the topic
        client.value?.subscribe(mqttConfig.topic, (err) => {
          if (!err) {
            console.log(`✅ Subscribed to ${mqttConfig.topic}`);
          } else {
            console.error(`❌ Failed to subscribe to ${mqttConfig.topic}:`, err);
            error.value = `Subscribe error: ${err.message}`;
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

          if (topic === mqttConfig.topic) {
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

              console.log('✅ Data updated:', mqttData.value);
            } else {
              console.warn('⚠️ Invalid message format:', data);
              error.value = 'Invalid message format';
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
      client.value.publish(mqttConfig.topic, payload, (err) => {
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

  // Test function to publish sample data
  const publishTestData = () => {
    const testData: MqttMessage = {
      electricity: Math.floor(Math.random() * 100) + 200,
      water: Math.floor(Math.random() * 50) + 20,
      pasien: Math.floor(Math.random() * 30) + 10
    };
    publish(testData);
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
    lastMessage,
    error,

    // Methods
    connect,
    disconnect,
    publish,
    publishTestData,

    // Config (for debugging)
    mqttConfig
  };
};

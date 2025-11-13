interface StoredMqttData {
  hospitalCode: string;
  electricity: number;
  water: number;
  pasien: number;
  ph?: number;
  timestamp: number;
}

export const useLocalStorage = () => {
  const STORAGE_KEY = 'hospital_mqtt_data';
  const MAX_STORAGE_ITEMS = 100; // Limit items in localStorage

  // Get stored data from localStorage
  const getStoredData = (): StoredMqttData[] => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error reading from localStorage:', error);
      return [];
    }
  };

  // Store data to localStorage
  const storeData = (data: StoredMqttData) => {
    if (typeof window === 'undefined') return;

    try {
      const currentData = getStoredData();

      // Add new data
      currentData.push(data);

      // Keep only the latest MAX_STORAGE_ITEMS
      if (currentData.length > MAX_STORAGE_ITEMS) {
        currentData.splice(0, currentData.length - MAX_STORAGE_ITEMS);
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
      console.log('💾 Data stored to localStorage:', data);
    } catch (error) {
      console.error('❌ Error storing to localStorage:', error);
    }
  };

  // Bulk store multiple data points
  const bulkStoreData = (dataArray: StoredMqttData[]) => {
    if (typeof window === 'undefined' || dataArray.length === 0) return;

    try {
      const currentData = getStoredData();

      // Add all new data
      currentData.push(...dataArray);

      // Keep only the latest MAX_STORAGE_ITEMS
      if (currentData.length > MAX_STORAGE_ITEMS) {
        currentData.splice(0, currentData.length - MAX_STORAGE_ITEMS);
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
      console.log(`💾 Bulk stored ${dataArray.length} items to localStorage`);
    } catch (error) {
      console.error('❌ Error bulk storing to localStorage:', error);
    }
  };

  // Clear stored data
  const clearStoredData = () => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      console.log('🧹 Cleared localStorage data');
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  };

  // Get data count in storage
  const getStoredDataCount = (): number => {
    return getStoredData().length;
  };

  // Get data for specific hospital
  const getStoredDataForHospital = (hospitalCode: string): StoredMqttData[] => {
    return getStoredData().filter((item) => item.hospitalCode === hospitalCode);
  };

  // Get latest data for hospital
  const getLatestStoredData = (hospitalCode?: string): StoredMqttData | null => {
    const data = hospitalCode ? getStoredDataForHospital(hospitalCode) : getStoredData();
    return data.length > 0 ? data[data.length - 1] : null;
  };

  // Send stored data to server (for backup/sync)
  const syncStoredDataToServer = async (): Promise<boolean> => {
    const storedData = getStoredData();

    if (storedData.length === 0) {
      console.log('📭 No stored data to sync');
      return true;
    }

    try {
      console.log(`🔄 Syncing ${storedData.length} stored items to server...`);

      // Group by hospital for efficient syncing
      const dataByHospital = storedData.reduce(
        (acc, item) => {
          if (!acc[item.hospitalCode]) {
            acc[item.hospitalCode] = [];
          }
          acc[item.hospitalCode].push(item);
          return acc;
        },
        {} as Record<string, StoredMqttData[]>
      );

      let syncCount = 0;
      let errorCount = 0;

      // Send data for each hospital
      for (const [hospitalCode, hospitalData] of Object.entries(dataByHospital)) {
        try {
          // Get the latest data point for this hospital
          const latestData = hospitalData[hospitalData.length - 1];

          const response = await $fetch('/api/save-data', {
            method: 'POST',
            body: {
              hospitalCode,
              electricity: latestData.electricity,
              water: latestData.water,
              pasien: latestData.pasien,
              ph: latestData.ph
            }
          });

          if (response.success) {
            syncCount++;
            console.log(`✅ Synced data for ${hospitalCode}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to sync data for ${hospitalCode}:`, error);
        }
      }

      console.log(`📈 Sync completed: ${syncCount} synced, ${errorCount} errors`);

      // Clear stored data after successful sync
      if (syncCount > 0 && errorCount === 0) {
        clearStoredData();
        return true;
      }

      return syncCount > 0;
    } catch (error) {
      console.error('❌ Error syncing stored data:', error);
      return false;
    }
  };

  // Auto-sync functionality
  const startAutoSync = (intervalMinutes: number = 10) => {
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`🔄 Starting auto-sync every ${intervalMinutes} minutes`);

    const syncInterval = setInterval(async () => {
      await syncStoredDataToServer();
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(syncInterval);
      console.log('🛑 Auto-sync stopped');
    };
  };

  return {
    // Storage operations
    storeData,
    bulkStoreData,
    getStoredData,
    clearStoredData,

    // Query operations
    getStoredDataCount,
    getStoredDataForHospital,
    getLatestStoredData,

    // Sync operations
    syncStoredDataToServer,
    startAutoSync,

    // Constants
    MAX_STORAGE_ITEMS
  };
};

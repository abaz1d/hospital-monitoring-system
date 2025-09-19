interface DatabaseData {
  electricity: Array<{ value: number; timestamp: string }>;
  water: Array<{ value: number; timestamp: string }>;
  pasien: Array<{ value: number; timestamp: string }>;
  ph: Array<{ value: number; timestamp: string }>;
}

interface CurrentData {
  hospital_name: string;
  hospital_code: string;
  mqtt_topic: string;
  electricity: number;
  water: number;
  pasien: number;
  ph: number;
  last_updated: string;
}

export const useDatabase = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Get current data from database
  const getCurrentFromDatabase = async (hospitalCode: string): Promise<CurrentData | null> => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ success: boolean; data: CurrentData }>(`/api/current/${hospitalCode}`);
      return data;
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to fetch current data';
      console.error('❌ Error fetching current data:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Get historical data from database
  const getHistoricalFromDatabase = async (hospitalCode: string, hours: number = 24): Promise<DatabaseData | null> => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ success: boolean; data: DatabaseData }>(
        `/api/history/${hospitalCode}?hours=${hours}`
      );
      return data;
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to fetch historical data';
      console.error('❌ Error fetching historical data:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Get all hospitals
  const getHospitalsFromDatabase = async () => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ success: boolean; data: any[] }>('/api/hospitals');
      return data;
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to fetch hospitals';
      console.error('❌ Error fetching hospitals:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Save data to database (manual save)
  const saveToDatabase = async (
    hospitalCode: string,
    electricity: number,
    water: number,
    pasien: number,
    ph?: number
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ success: boolean; data: any }>('/api/save-data', {
        method: 'POST',
        body: {
          hospitalCode,
          electricity,
          water,
          pasien,
          ph
        }
      });
      return data;
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to save data';
      console.error('❌ Error saving data:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    loading,
    error,

    // Methods
    getCurrentFromDatabase,
    getHistoricalFromDatabase,
    getHospitalsFromDatabase,
    saveToDatabase
  };
};

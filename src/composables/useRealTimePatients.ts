import { computed, ref } from 'vue';

interface PatientApiResponse {
  kdbagian: string;
  bagian: string;
  tanggal: string;
  jumlah: number;
}

interface HospitalPatientData {
  hospitalCode: string;
  hospitalName: string;
  kdbagian: string;
  totalPatients: number;
  date: string;
  breakdown: PatientApiResponse[];
}

export const useRealTimePatients = () => {
  const patientData = ref<HospitalPatientData[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  // Get patient count for specific hospital
  const getPatientCount = (hospitalCode: string): number => {
    const hospital = patientData.value.find((h) => h.hospitalCode === hospitalCode);
    return hospital?.totalPatients || 0;
  };

  // Get breakdown for specific hospital
  const getPatientBreakdown = (hospitalCode: string): PatientApiResponse[] => {
    const hospital = patientData.value.find((h) => h.hospitalCode === hospitalCode);
    return hospital?.breakdown || [];
  };

  // Fetch real-time patient data
  const fetchPatientData = async (date?: string) => {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      console.log(`🏥 Fetching real-time patient data for ${targetDate}`);

      const response = await $fetch(`/api/patients/realtime?date=${targetDate}`);

      if (response.success && response.data) {
        patientData.value = response.data;
        lastUpdated.value = new Date();
        console.log(`✅ Updated patient data for ${response.data.length} hospitals`);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch patient data:', err);
      error.value = err.message || 'Failed to fetch patient data';

      // Set empty data if external API fails
      patientData.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-refresh data every 5 minutes
  const autoRefreshInterval = ref<NodeJS.Timeout | null>(null);

  const startAutoRefresh = () => {
    if (autoRefreshInterval.value) {
      clearInterval(autoRefreshInterval.value);
    }

    // Fetch immediately
    fetchPatientData();

    // Set up auto-refresh every 5 minutes
    autoRefreshInterval.value = setInterval(
      () => {
        fetchPatientData();
      },
      5 * 60 * 1000
    );

    console.log('🔄 Started auto-refresh for patient data (5 min interval)');
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval.value) {
      clearInterval(autoRefreshInterval.value);
      autoRefreshInterval.value = null;
      console.log('⏹️ Stopped auto-refresh for patient data');
    }
  };

  // Computed properties
  const totalPatients = computed(() => {
    return patientData.value.reduce((sum, hospital) => sum + hospital.totalPatients, 0);
  });

  const isDataFresh = computed(() => {
    if (!lastUpdated.value) return false;
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.value.getTime()) / (1000 * 60);
    return diffMinutes < 10; // Consider data fresh if less than 10 minutes old
  });

  return {
    // State
    patientData: readonly(patientData),
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastUpdated: readonly(lastUpdated),

    // Computed
    totalPatients,
    isDataFresh,

    // Methods
    getPatientCount,
    getPatientBreakdown,
    fetchPatientData,
    startAutoRefresh,
    stopAutoRefresh
  };
};

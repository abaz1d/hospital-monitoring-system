<template>
  <div class="dashboard-content min-h-screen bg-white">
    <!-- Header -->
    <div class="sticky top-0 z-50 border-b border-gray-200">
      <div class="w-full bg-blue-500 p-1 text-center text-xl font-bold text-white">
        " MONALISA " Monitoring Air, Listrik, dan Sanitasi RSUD Bendan Kota Pekalongan
      </div>
      <div class="bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4">
        <div class="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <!-- Left Section -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            <!-- Hamburger Button for Hospital List -->
            <UButton
              icon="i-heroicons-bars-3"
              variant="ghost"
              size="lg"
              @click="showHospitalList = true"
              :title="`Switch Hospital - Current: ${currentHospital.name}`"
            />

            <div class="flex items-center space-x-2">
              <h1 class="text-lg font-semibold text-gray-900 sm:text-xl">{{ currentHospital.name }}</h1>
            </div>
          </div>

          <!-- Right Section -->
          <!-- Time Filter -->

          <div class="flex items-center justify-between space-x-2 sm:space-x-4">
            <!-- Time Filter -->
            <div class="flex items-center space-x-2">
              <USelectMenu v-model="selectedTimeFilter" :items="timeFilters" class="w-auto" />

              <!-- Date Range Picker (only show when custom is selected) -->
              <div v-if="selectedTimeFilter?.value === 'custom'" class="flex items-center space-x-2">
                <UPopover>
                  <UButton variant="outline" size="sm" :label="dateRangeText" icon="i-heroicons-calendar-days" />
                  <template #content>
                    <div class="w-80 p-4">
                      <div class="space-y-4">
                        <div>
                          <label class="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                          <input
                            v-model="customDateRange.start"
                            type="date"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                          <input
                            v-model="customDateRange.end"
                            type="date"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div class="flex justify-end space-x-2">
                          <UButton variant="outline" size="sm" @click="clearDateRange"> Clear </UButton>
                          <UButton size="sm" @click="applyDateRange"> Apply </UButton>
                        </div>
                      </div>
                    </div>
                  </template>
                </UPopover>
              </div>
            </div>
            <div class="flex items-center space-x-2 rounded-md border px-2 py-1 sm:px-3">
              <div :class="['h-2 w-2 rounded-full', isConnected ? 'animate-pulse bg-green-500' : 'bg-red-500']"></div>
              <span class="text-xs font-medium text-gray-700 sm:text-sm">
                <span class="hidden sm:inline">{{ connectionStatus }}</span>
                <span class="sm:hidden">{{ isConnected ? 'Online' : 'Offline' }}</span>
              </span>
            </div>

            <!-- Refresh Button -->
            <UButton variant="outline" color="neutral" @click="refreshData" size="sm" class="flex-shrink-0">
              <UIcon name="i-heroicons-arrow-path" />
              <span class="ml-1">Refresh</span>
            </UButton>

            <!-- Export Button with Popover -->
            <UPopover>
              <UButton
                variant="outline"
                color="primary"
                size="sm"
                class="flex-shrink-0"
                :loading="isDataPaused"
                :disabled="isDataPaused"
              >
                <UIcon name="i-heroicons-arrow-down-tray" />
                <span class="ml-1 hidden sm:inline">{{ isDataPaused ? 'Exporting...' : 'Export' }}</span>
                <span class="ml-1 sm:hidden">{{ isDataPaused ? '...' : 'Export' }}</span>
                <UIcon name="i-heroicons-chevron-down" class="ml-1 h-4 w-4" />
              </UButton>

              <template #content>
                <div class="p-2">
                  <div class="space-y-1">
                    <!-- Excel Export -->
                    <UButton
                      variant="ghost"
                      color="neutral"
                      size="sm"
                      @click="exportToExcel"
                      :disabled="isDataPaused"
                      class="w-full justify-start"
                    >
                      <UIcon name="i-heroicons-table-cells" class="mr-2" />
                      Export Excel
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </div>
    </div>

    <!-- Hospital Selection Slideover -->
    <USlideover v-model:open="showHospitalList" side="left">
      <template #content>
        <UCard class="flex flex-1 flex-col">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base leading-6 font-semibold text-gray-900"></h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark-20-solid"
                @click="showHospitalList = false"
              />
            </div>
          </template>

          <div class="max-h-[calc(100vh-150px)] flex-1 space-y-2 overflow-y-auto px-1">
            <!-- Loading State -->
            <div v-if="isLoadingHospitals" class="flex items-center justify-center py-8">
              <div class="text-center">
                <div
                  class="border-primary-200 border-t-primary-600 mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4"
                ></div>
                <p class="text-sm text-gray-500">Loading hospitals...</p>
              </div>
            </div>

            <!-- Hospital List -->
            <div
              v-else
              v-for="hospital in hospitals"
              :key="hospital.id"
              @click="hospital.isActive ? selectHospital(hospital) : null"
              :class="[
                'rounded-lg border p-4 transition-all duration-200',
                hospital.isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                hospital.isActive && currentHospital.id === hospital.id
                  ? 'border-primary-500 bg-primary-50 ring-primary-500 ring-1'
                  : hospital.isActive
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50'
              ]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p :class="['font-medium', hospital.isActive ? 'text-gray-900' : 'text-gray-400']">
                    {{ hospital.name }}
                  </p>
                  <p v-if="!hospital.isActive" class="mt-1 text-xs text-gray-400">Belum Tersedia</p>
                </div>
                <div class="flex items-center space-x-2">
                  <!-- Active/Inactive Status -->
                  <div :class="['h-2 w-2 rounded-full', hospital.isActive ? 'bg-green-500' : 'bg-gray-300']"></div>

                  <!-- Selected Indicator -->
                  <div
                    v-if="hospital.isActive && currentHospital.id === hospital.id"
                    class="text-primary-600 flex items-center"
                  >
                    <UIcon name="i-heroicons-check-circle-solid" class="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="!isLoadingHospitals && hospitals.length === 0" class="py-8 text-center">
              <UIcon name="i-heroicons-building-office-2" class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-2 text-sm font-medium text-gray-900">No hospitals found</h3>
              <p class="mt-1 text-sm text-gray-500">No hospitals are available in the database.</p>
            </div>

            <!-- pH Gauge Section -->
            <div class="mt-6 border-t border-gray-200 pt-4">
              <UCard>
                <template #header>
                  <h3 class="text-sm font-semibold text-gray-900">pH Monitor</h3>
                  <p class="text-xs text-gray-500">Global Sensor</p>
                </template>

                <div class="space-y-4">
                  <!-- pH Gauge -->
                  <div class="text-center">
                    <ClientOnly>
                      <highcharts :options="gaugeOptions.ph" :style="{ height: '150px', width: '100%' }" />
                    </ClientOnly>
                  </div>

                  <!-- pH Status Indicator -->
                  <div class="text-center">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        phStatus.color
                      ]"
                    >
                      {{ phStatus.label }}
                    </span>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-500">
                Status:
                <span :class="isConnected ? 'text-green-600' : 'text-red-600'">
                  {{ connectionStatus }}
                </span>
              </div>
            </div>
          </template>
        </UCard>
      </template>
    </USlideover>

    <ClientOnly>
      <div class="bg-gray-50 p-6">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <!-- Left Side - Parameters -->
          <div class="lg:col-span-1">
            <UCard class="h-fit">
              <template #header>
                <h2 class="text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">Parameter</h2>
              </template>

              <!-- Voltase Listrik Gauge -->
              <div class="mb-6">
                <h3 class="mb-2 text-center text-sm font-medium text-gray-700">Daya Listrik</h3>
                <ClientOnly>
                  <highcharts :options="gaugeOptions.voltase" :style="{ height: '150px', width: '100%' }" />
                </ClientOnly>
              </div>

              <!-- Debit Air Gauge -->
              <div class="mb-6">
                <h3 class="mb-2 text-center text-sm font-medium text-gray-700">Debit Air</h3>
                <ClientOnly>
                  <highcharts :options="gaugeOptions.debitAir" :style="{ height: '150px', width: '100%' }" />
                </ClientOnly>
              </div>

              <!-- Jumlah Pasien Gauge -->
              <div class="">
                <h3 class="mb-2 text-center text-sm font-medium text-gray-700">Jumlah Pasien</h3>
                <ClientOnly>
                  <highcharts :options="gaugeOptions.jumlahPasien" :style="{ height: '150px', width: '100%' }" />
                </ClientOnly>
              </div>
            </UCard>
          </div>

          <!-- Right Side - Line Chart -->
          <div class="lg:col-span-3">
            <UCard class="h-fit">
              <template #header>
                <h2 class="text-lg font-semibold text-gray-900 sm:text-xl dark:text-white">Grafik</h2>
              </template>

              <div lass="h-[400px] sm:h-[500px] lg:h-[700px]">
                <ClientOnly>
                  <highcharts :options="lineChartOptions" />
                </ClientOnly>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const {
  data,
  selectedTimeFilter,
  isRealTimeEnabled,
  gaugeOptions,
  lineChartOptions,
  timeFilters,
  updateTimeFilter,
  toggleRealTime,
  refreshData,
  // MQTT related
  isConnected,
  connectionStatus,
  useMqttData,
  toggleDataSource,
  mqttError,
  publishTestData,
  publishTestPhData, // pH test function
  // Hospital management
  hospitals,
  currentHospital,
  switchHospital,
  isLoadingHospitals,
  // Export functionality
  exportToExcel,
  isDataPaused
} = useDashboard();

// Slideover state
const showHospitalList = ref(false);

// Date range picker state
const customDateRange = ref({
  start: '',
  end: ''
});

// Computed untuk menampilkan text date range
const dateRangeText = computed(() => {
  if (customDateRange.value.start && customDateRange.value.end) {
    return `${customDateRange.value.start} - ${customDateRange.value.end}`;
  }
  return 'Select Date Range';
});

// Computed untuk pH status dengan color coding
const phStatus = computed(() => {
  const phValue = data.value?.ph?.current || 7.0;

  if (phValue < 6.5) {
    return {
      label: 'Asam',
      color: 'bg-red-100 text-red-800'
    };
  } else if (phValue > 8.5) {
    return {
      label: 'Basa',
      color: 'bg-blue-100 text-blue-800'
    };
  } else {
    return {
      label: 'Normal',
      color: 'bg-green-100 text-green-800'
    };
  }
});

// Function to select hospital
const selectHospital = (hospital: any) => {
  switchHospital(hospital);
  showHospitalList.value = false;
};

// Handle time filter change
const onTimeFilterChange = (newValue: any) => {
  if (newValue?.value === 'custom') {
    // Set default date range to today
    const today = new Date().toISOString().split('T')[0];
    customDateRange.value.start = today;
    customDateRange.value.end = today;
  }
  updateTimeFilter(newValue);
};

// Apply custom date range
const applyDateRange = () => {
  if (customDateRange.value.start && customDateRange.value.end) {
    // Calculate hours between dates
    const startDate = new Date(customDateRange.value.start);
    const endDate = new Date(customDateRange.value.end);
    const hoursDiff = Math.abs(endDate.getTime() - startDate.getTime()) / 36e5;

    // Update the filter with custom hours and date range
    const customFilter = {
      label: `Custom (${customDateRange.value.start} - ${customDateRange.value.end})`,
      value: 'custom',
      hours: Math.ceil(hoursDiff),
      dateRange: {
        start: customDateRange.value.start,
        end: customDateRange.value.end
      }
    };

    updateTimeFilter(customFilter);
  }
};

// Clear date range
const clearDateRange = () => {
  customDateRange.value.start = '';
  customDateRange.value.end = '';
};

// Watch for changes in selectedTimeFilter
watch(selectedTimeFilter, (newValue) => {
  if (newValue) {
    // Handle custom filter setup
    if (newValue.value === 'custom' && !customDateRange.value.start) {
      const today = new Date().toISOString().split('T')[0];
      customDateRange.value.start = today;
      customDateRange.value.end = today;
    }
    updateTimeFilter(newValue);
  }
});
</script>

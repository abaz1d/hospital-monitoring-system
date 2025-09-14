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
            <!-- MQTT Status Indicator -->
            <USelectMenu v-model="selectedTimeFilter" :items="timeFilters" class="w-auto" />
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

                    <!-- PDF Export -->
                    <UButton
                      variant="ghost"
                      color="neutral"
                      size="sm"
                      @click="exportToPDF"
                      :disabled="isDataPaused"
                      class="w-full justify-start"
                    >
                      <UIcon name="i-heroicons-document-text" class="mr-2" />
                      Export PDF
                    </UButton>

                    <!-- Image Export -->
                    <UButton
                      variant="ghost"
                      color="neutral"
                      size="sm"
                      @click="exportToImage"
                      :disabled="isDataPaused"
                      class="w-full justify-start"
                    >
                      <UIcon name="i-heroicons-photo" class="mr-2" />
                      Export Image
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
              <h3 class="text-base leading-6 font-semibold text-gray-900">Pilih Rumah Sakit</h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark-20-solid"
                @click="showHospitalList = false"
              />
            </div>
          </template>

          <div class="flex-1 space-y-2">
            <!-- Hospital List -->
            <div
              v-for="hospital in hospitals"
              :key="hospital.id"
              @click="selectHospital(hospital)"
              :class="[
                'cursor-pointer rounded-lg border p-4 transition-all duration-200',
                currentHospital.id === hospital.id
                  ? 'border-primary-500 bg-primary-50 ring-primary-500 ring-1'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              ]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900">{{ hospital.name }}</p>
                </div>
                <div v-if="currentHospital.id === hospital.id" class="text-primary-600 flex items-center">
                  <UIcon name="i-heroicons-check-circle-solid" class="h-5 w-5" />
                </div>
              </div>
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
  // Hospital management
  hospitals,
  currentHospital,
  switchHospital,
  // Export functionality
  exportToExcel,
  exportToPDF,
  exportToImage,
  isDataPaused
} = useDashboard();

// Slideover state
const showHospitalList = ref(false);

// Function to select hospital
const selectHospital = (hospital: any) => {
  switchHospital(hospital);
  showHospitalList.value = false;
};

// Watch for changes in selectedTimeFilter
watch(selectedTimeFilter, (newValue) => {
  if (newValue) {
    updateTimeFilter(newValue);
  }
});
</script>

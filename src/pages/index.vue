<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="h-2 w-2 rounded-full bg-green-500"></div>
            <h1 class="text-xl font-semibold text-gray-900">Rumah Sakit B</h1>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Time Filter -->
          <USelectMenu v-model="selectedTimeFilter" :items="timeFilters" class="w-40" />

          <!-- Real-time Toggle -->
          <UButton
            :variant="isRealTimeEnabled ? 'solid' : 'outline'"
            :color="isRealTimeEnabled ? 'success' : 'neutral'"
            @click="toggleRealTime"
            size="sm"
          >
            <UIcon name="i-heroicons-play" v-if="!isRealTimeEnabled" />
            <UIcon name="i-heroicons-pause" v-else />
            {{ isRealTimeEnabled ? 'Real-time ON' : 'Real-time OFF' }}
          </UButton>

          <!-- Refresh Button -->
          <UButton variant="outline" color="neutral" @click="refreshData" size="sm">
            <UIcon name="i-heroicons-arrow-path" />
            Refresh
          </UButton>
        </div>
      </div>
    </div>
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
                <h3 class="mb-2 text-center text-sm font-medium text-gray-700">Voltase Listrik</h3>
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
  refreshData
} = useDashboard();

// Watch for changes in selectedTimeFilter
watch(selectedTimeFilter, (newValue) => {
  if (newValue) {
    updateTimeFilter(newValue);
  }
});
</script>

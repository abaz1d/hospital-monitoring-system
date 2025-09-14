import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  generateDashboardData,
  getRealtimeUpdate,
  timeFilters,
  type DashboardData,
  type TimeFilter
} from '~/utils/dashboardData';
import { useMqtt } from './useMqtt';

export const useDashboard = () => {
  const data = ref<DashboardData>(generateDashboardData());
  const selectedTimeFilter = ref<TimeFilter>(timeFilters[1]); // Default to 'Per Hari' object
  const isRealTimeEnabled = ref(true);
  const refreshInterval = ref<number | null>(null);

  // MQTT Integration
  const {
    mqttData,
    isConnected,
    connectionStatus,
    error: mqttError,
    publishTestData,
    hospitals,
    currentHospital,
    switchHospital
  } = useMqtt();
  const useMqttData = ref(true); // Toggle untuk menggunakan MQTT atau dummy data

  // Watch MQTT data untuk update real-time
  watch(
    mqttData,
    (newMqttData) => {
      if (useMqttData.value && isConnected.value) {
        console.log('📊 Updating dashboard with MQTT data:', newMqttData);

        // Update current values dari MQTT
        data.value.voltaseListrik.current = newMqttData.electricity;
        data.value.debitAir.current = newMqttData.water;
        data.value.jumlahPasien.current = newMqttData.pasien;

        // Add to historical data
        const timestamp = newMqttData.timestamp;
        data.value.voltaseListrik.historical.push({
          timestamp,
          value: newMqttData.electricity
        });
        data.value.debitAir.historical.push({
          timestamp,
          value: newMqttData.water
        });
        data.value.jumlahPasien.historical.push({
          timestamp,
          value: newMqttData.pasien
        });

        // Keep only last 100 points for performance
        if (data.value.voltaseListrik.historical.length > 100) {
          data.value.voltaseListrik.historical = data.value.voltaseListrik.historical.slice(-100);
          data.value.debitAir.historical = data.value.debitAir.historical.slice(-100);
          data.value.jumlahPasien.historical = data.value.jumlahPasien.historical.slice(-100);
        }
      }
    },
    { deep: true }
  );

  // Toggle between MQTT and dummy data
  const toggleDataSource = () => {
    useMqttData.value = !useMqttData.value;
    console.log('🔄 Data source toggled to:', useMqttData.value ? 'MQTT' : 'Dummy');

    if (!useMqttData.value) {
      // Fallback to dummy data
      startRealTimeUpdates();
    } else {
      // Use MQTT data
      stopRealTimeUpdates();
    }
  };

  // Computed properties for chart configurations
  const gaugeOptions = computed(() => ({
    voltase: {
      chart: {
        type: 'solidgauge',
        height: '150px',
        backgroundColor: 'transparent'
      },
      title: null,
      credits: { enabled: false },
      pane: {
        center: ['50%', '85%'],
        size: '140%',
        startAngle: -90,
        endAngle: 90,
        background: {
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          borderRadius: 5,
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      exporting: { enabled: false },
      tooltip: { enabled: false },
      yAxis: {
        min: 0,
        max: data.value.voltaseListrik.max,
        stops: [
          [0.1, 'rgb(220, 38, 127)'], // bright magenta red for high contrast
          [0.5, 'rgb(220, 38, 127)'], // bright magenta red for high contrast
          [0.9, 'rgb(220, 38, 127)'] // bright magenta red for high contrast
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: null,
        tickAmount: 2,
        title: { text: null },
        labels: { y: 16, style: { color: '#6b7280', fontSize: '12px' } }
      },
      plotOptions: {
        solidgauge: {
          borderRadius: 3,
          dataLabels: {
            y: 5,
            borderWidth: 0,
            useHTML: true,
            format:
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">KwH</span></div>'
          }
        }
      },
      series: [
        {
          name: 'Voltase',
          data: [data.value.voltaseListrik.current],
          color: data.value.voltaseListrik.color
        }
      ]
    },

    debitAir: {
      chart: {
        type: 'solidgauge',
        height: '150px',
        backgroundColor: 'transparent'
      },
      title: null,
      credits: { enabled: false },
      pane: {
        center: ['50%', '85%'],
        size: '140%',
        startAngle: -90,
        endAngle: 90,
        background: {
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          borderRadius: 5,
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      exporting: { enabled: false },
      tooltip: { enabled: false },
      yAxis: {
        min: 0,
        max: data.value.debitAir.max,
        stops: [
          [0.1, 'rgb(37, 99, 235)'], // bright blue for high contrast
          [0.5, 'rgb(37, 99, 235)'], // bright blue for high contrast
          [0.9, 'rgb(37, 99, 235)'] // bright blue for high contrast
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: null,
        tickAmount: 2,
        title: { text: null },
        labels: { y: 16, style: { color: '#6b7280', fontSize: '12px' } }
      },
      plotOptions: {
        solidgauge: {
          borderRadius: 3,
          dataLabels: {
            y: 5,
            borderWidth: 0,
            useHTML: true,
            format:
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">L/min</span></div>'
          }
        }
      },
      series: [
        {
          name: 'Debit Air',
          data: [data.value.debitAir.current],
          color: data.value.debitAir.color
        }
      ]
    },

    jumlahPasien: {
      chart: {
        type: 'solidgauge',
        height: '150px',
        backgroundColor: 'transparent'
      },
      title: null,
      credits: { enabled: false },
      pane: {
        center: ['50%', '85%'],
        size: '140%',
        startAngle: -90,
        endAngle: 90,
        background: {
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          borderRadius: 5,
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      exporting: { enabled: false },
      tooltip: { enabled: false },
      yAxis: {
        min: 0,
        max: data.value.jumlahPasien.max,
        stops: [
          [0.1, 'rgb(34, 197, 94)'], // bright green for high contrast
          [0.5, 'rgb(34, 197, 94)'], // bright green for high contrast
          [0.9, 'rgb(34, 197, 94)'] // bright green for high contrast
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: null,
        tickAmount: 2,
        title: { text: null },
        labels: { y: 16, style: { color: '#6b7280', fontSize: '12px' } }
      },
      plotOptions: {
        solidgauge: {
          borderRadius: 3,
          dataLabels: {
            y: 5,
            borderWidth: 0,
            useHTML: true,
            format:
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">Orang</span></div>'
          }
        }
      },
      series: [
        {
          name: 'Jumlah Pasien',
          data: [data.value.jumlahPasien.current],
          color: data.value.jumlahPasien.color
        }
      ]
    }
  }));

  const lineChartOptions = computed(() => ({
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      height: '600px'
    },
    title: null,
    credits: { enabled: false },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: '#6b7280', fontSize: '12px' } },
      lineColor: '#d1d5db',
      tickColor: '#d1d5db',
      gridLineColor: '#f3f4f6'
    },
    yAxis: {
      title: { text: null },
      labels: { style: { color: '#6b7280', fontSize: '12px' } },
      gridLineColor: '#f3f4f6'
    },
    legend: {
      align: 'right',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemStyle: { color: '#374151', fontSize: '12px' },
      itemHoverStyle: { color: '#1f2937' }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      style: { color: '#374151', fontSize: '12px' },
      shared: true,
      crosshairs: true
    },
    plotOptions: {
      line: {
        dataLabels: { enabled: false },
        enableMouseTracking: true,
        lineWidth: 2,
        marker: {
          radius: 4,
          states: {
            hover: {
              radius: 6
            }
          }
        }
      }
    },
    series: [
      {
        name: 'electricity',
        color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
        data: data.value.voltaseListrik.historical.map((point) => [point.timestamp, point.value])
      },
      {
        name: 'water',
        color: 'rgb(37, 99, 235)', // bright blue for high contrast
        data: data.value.debitAir.historical.map((point) => [point.timestamp, point.value])
      },
      {
        name: 'pasien',
        color: 'rgb(34, 197, 94)', // bright green for high contrast
        data: data.value.jumlahPasien.historical.map((point) => [point.timestamp, point.value])
      }
    ]
  }));

  // Methods
  const updateTimeFilter = (filterValue: TimeFilter) => {
    selectedTimeFilter.value = filterValue;
    data.value = generateDashboardData(filterValue.value);
  };

  const toggleRealTime = () => {
    isRealTimeEnabled.value = !isRealTimeEnabled.value;
    console.log('🔄 Real-time toggled:', isRealTimeEnabled.value);

    if (isRealTimeEnabled.value && !useMqttData.value) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
  };

  const startRealTimeUpdates = () => {
    if (useMqttData.value) {
      console.log('⏭️ Skipping dummy updates - using MQTT data');
      return; // Don't start dummy updates if using MQTT
    }

    if (refreshInterval.value) clearInterval(refreshInterval.value);

    refreshInterval.value = setInterval(() => {
      const updates = getRealtimeUpdate();
      // Update current values for gauges
      data.value.voltaseListrik.current = updates.voltaseListrik?.current || data.value.voltaseListrik.current;
      data.value.debitAir.current = updates.debitAir?.current || data.value.debitAir.current;
      data.value.jumlahPasien.current = updates.jumlahPasien?.current || data.value.jumlahPasien.current;

      // Add new data point to historical data
      const now = Date.now();
      data.value.voltaseListrik.historical.push({ timestamp: now, value: data.value.voltaseListrik.current });
      data.value.debitAir.historical.push({ timestamp: now, value: data.value.debitAir.current });
      data.value.jumlahPasien.historical.push({ timestamp: now, value: data.value.jumlahPasien.current });

      // Keep only last 100 points for performance
      if (data.value.voltaseListrik.historical.length > 100) {
        data.value.voltaseListrik.historical = data.value.voltaseListrik.historical.slice(-100);
        data.value.debitAir.historical = data.value.debitAir.historical.slice(-100);
        data.value.jumlahPasien.historical = data.value.jumlahPasien.historical.slice(-100);
      }
    }, 5000) as any; // Update every 5 seconds
  };

  const stopRealTimeUpdates = () => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  };

  const refreshData = () => {
    data.value = generateDashboardData(selectedTimeFilter.value.value);
  };

  // Lifecycle
  onMounted(() => {
    if (isRealTimeEnabled.value && !useMqttData.value) {
      startRealTimeUpdates();
    }
  });

  onUnmounted(() => {
    stopRealTimeUpdates();
  });

  return {
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
    switchHospital
  };
};

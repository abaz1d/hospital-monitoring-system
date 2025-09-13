import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  generateDashboardData,
  getRealtimeUpdate,
  timeFilters,
  type DashboardData,
  type TimeFilter
} from '~/utils/dashboardData';

export const useDashboard = () => {
  const data = ref<DashboardData>(generateDashboardData());
  const selectedTimeFilter = ref<TimeFilter>(timeFilters[1]); // Default to 'Per Hari'
  const isRealTimeEnabled = ref(true);
  const refreshInterval = ref<number | null>(null);

  // Computed properties for chart configurations
  const gaugeOptions = computed(() => ({
    voltase: {
      chart: {
        type: 'solidgauge',
        height: 200,
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
          [0.1, '#ef4444'], // red for low voltage
          [0.5, '#eab308'], // yellow for medium
          [0.9, '#22c55e'] // green for high
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
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">V</span></div>'
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
        height: 200,
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
          [0.1, '#ef4444'], // red for low flow
          [0.5, '#eab308'], // yellow for medium
          [0.9, '#22c55e'] // green for good flow
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
        height: 200,
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
          [0.1, '#22c55e'], // green for low occupancy
          [0.5, '#eab308'], // yellow for medium
          [0.9, '#ef4444'] // red for high occupancy
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
      height: 400
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
        color: '#3b82f6',
        data: data.value.voltaseListrik.historical.map((point) => [point.timestamp, point.value])
      },
      {
        name: 'water',
        color: '#06b6d4',
        data: data.value.debitAir.historical.map((point) => [point.timestamp, point.value])
      },
      {
        name: 'pasien',
        color: '#f59e0b',
        data: data.value.jumlahPasien.historical.map((point) => [point.timestamp, point.value])
      }
    ]
  }));

  // Methods
  const updateTimeFilter = (filter: TimeFilter) => {
    selectedTimeFilter.value = filter;
    data.value = generateDashboardData(filter.value);
  };

  const toggleRealTime = () => {
    isRealTimeEnabled.value = !isRealTimeEnabled.value;
    if (isRealTimeEnabled.value) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
  };

  const startRealTimeUpdates = () => {
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
    }, 5000); // Update every 5 seconds
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
    if (isRealTimeEnabled.value) {
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
    refreshData
  };
};

// Dashboard dummy data for hospital monitoring system
export interface DashboardData {
  voltaseListrik: {
    current: number;
    max: number;
    unit: string;
    color: string;
    historical: Array<{ timestamp: number; value: number }>;
  };
  debitAir: {
    current: number;
    max: number;
    unit: string;
    color: string;
    historical: Array<{ timestamp: number; value: number }>;
  };
  jumlahPasien: {
    current: number;
    max: number;
    unit: string;
    color: string;
    historical: Array<{ timestamp: number; value: number }>;
  };
}

export interface TimeFilter {
  label: string;
  value: string;
  hours: number;
}

export const timeFilters: TimeFilter[] = [
  { label: 'Per Jam', value: 'hour', hours: 1 },
  { label: 'Per Hari', value: 'day', hours: 24 },
  { label: 'Per Bulan', value: 'month', hours: 24 * 30 },
  { label: '1 Tahun', value: 'year', hours: 24 * 365 },
  { label: 'All Time', value: 'all', hours: 0 }
];

// Generate realistic historical data
function generateHistoricalData(baseValue: number, variance: number, points: number, timeRange: number) {
  const data = [];
  const now = Date.now();
  const interval = (timeRange * 60 * 60 * 1000) / points; // Convert hours to milliseconds

  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * interval;
    const randomVariance = (Math.random() - 0.5) * variance;
    const value = Math.max(0, baseValue + randomVariance + Math.sin(i * 0.1) * (variance * 0.3));
    data.push({ timestamp, value: Math.round(value * 100) / 100 });
  }

  return data;
}

export function generateDashboardData(timeFilter: string = 'day'): DashboardData {
  const filter = timeFilters.find((f) => f.value === timeFilter) || timeFilters[1];
  const points =
    timeFilter === 'hour'
      ? 60
      : timeFilter === 'day'
        ? 48
        : timeFilter === 'month'
          ? 30
          : timeFilter === 'year'
            ? 12
            : 100;
  const hours = filter.hours || 24;

  return {
    voltaseListrik: {
      current: 353,
      max: 380,
      unit: 'V',
      color: '#ef4444',
      historical: generateHistoricalData(330, 50, points, hours)
    },
    debitAir: {
      current: 28,
      max: 50,
      unit: 'L/min',
      color: '#3b82f6',
      historical: generateHistoricalData(25, 15, points, hours)
    },
    jumlahPasien: {
      current: 19,
      max: 100,
      unit: 'Orang',
      color: '#22c55e',
      historical: generateHistoricalData(20, 8, points, hours)
    }
  };
}

// Real-time data simulation
export function getRealtimeUpdate(): Partial<DashboardData> {
  return {
    voltaseListrik: {
      current: Math.round((320 + Math.random() * 60) * 10) / 10,
      max: 380,
      unit: 'V',
      color: '#ef4444',
      historical: []
    },
    debitAir: {
      current: Math.round((20 + Math.random() * 20) * 10) / 10,
      max: 50,
      unit: 'L/min',
      color: '#3b82f6',
      historical: []
    },
    jumlahPasien: {
      current: Math.round(15 + Math.random() * 10),
      max: 100,
      unit: 'Orang',
      color: '#22c55e',
      historical: []
    }
  };
}

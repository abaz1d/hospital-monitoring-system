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
      current: Math.round((Math.random() * 50 + 200) * 100) / 100,
      max: 250,
      unit: 'V',
      color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
      historical: generateHistoricalData(220, 30, points, filter.hours)
    },
    debitAir: {
      current: Math.round((Math.random() * 20 + 30) * 100) / 100,
      max: 60,
      unit: 'L/min',
      color: 'rgb(37, 99, 235)', // bright blue for high contrast
      historical: generateHistoricalData(40, 15, points, filter.hours)
    },
    jumlahPasien: {
      current: Math.round(Math.random() * 50 + 80),
      max: 150,
      unit: 'orang',
      color: 'rgb(34, 197, 94)', // bright green for high contrast
      historical: generateHistoricalData(100, 30, points, filter.hours)
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
      color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
      historical: []
    },
    debitAir: {
      current: Math.round((20 + Math.random() * 20) * 10) / 10,
      max: 50,
      unit: 'L/min',
      color: 'rgb(37, 99, 235)', // bright blue for high contrast
      historical: []
    },
    jumlahPasien: {
      current: Math.round(15 + Math.random() * 10),
      max: 100,
      unit: 'Orang',
      color: 'rgb(34, 197, 94)', // bright green for high contrast
      historical: []
    }
  };
}

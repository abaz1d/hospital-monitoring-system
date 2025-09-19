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
  ph?: {
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
  { label: 'Real-time', value: 'realtime', hours: 0 },
  { label: '1 Jam', value: '1h', hours: 1 },
  { label: '24 Jam', value: '24h', hours: 24 },
  { label: '7 Hari', value: '7d', hours: 168 },
  { label: '30 Hari', value: '30d', hours: 720 }
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
      max: 500,
      unit: 'V',
      color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
      historical: generateHistoricalData(220, 30, points, filter.hours)
    },
    debitAir: {
      current: Math.round((Math.random() * 20 + 30) * 100) / 100,
      max: 100,
      unit: 'L/min',
      color: 'rgb(37, 99, 235)', // bright blue for high contrast
      historical: generateHistoricalData(40, 15, points, filter.hours)
    },
    jumlahPasien: {
      current: Math.round(Math.random() * 50 + 80),
      max: 200,
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
      max: 500,
      unit: 'V',
      color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
      historical: []
    },
    debitAir: {
      current: Math.round((20 + Math.random() * 20) * 10) / 10,
      max: 100,
      unit: 'L/min',
      color: 'rgb(37, 99, 235)', // bright blue for high contrast
      historical: []
    },
    jumlahPasien: {
      current: Math.round(15 + Math.random() * 10),
      max: 200,
      unit: 'Orang',
      color: 'rgb(34, 197, 94)', // bright green for high contrast
      historical: []
    }
  };
}

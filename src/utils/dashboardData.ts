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
  ph: {
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
  dateRange?: {
    start: string;
    end: string;
  };
}

export const timeFilters: TimeFilter[] = [
  { label: 'Real-time', value: 'realtime', hours: 0 },
  { label: 'Hari Ini', value: 'today', hours: 24 },
  { label: 'Minggu Ini', value: 'week', hours: 168 },
  { label: 'Bulan Ini', value: 'month', hours: 720 },
  { label: 'Tahun Ini', value: 'year', hours: 8760 },
  { label: 'Custom Range', value: 'custom', hours: 0 }
];

export function generateDashboardData(timeFilter: string = 'day'): DashboardData {
  const filter = timeFilters.find((f) => f.value === timeFilter) || timeFilters[1];

  // Return empty/null initial data
  return {
    voltaseListrik: {
      current: 0,
      max: 500,
      unit: 'V',
      color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
      historical: []
    },
    debitAir: {
      current: 0,
      max: 100,
      unit: 'L/min',
      color: 'rgb(37, 99, 235)', // bright blue for high contrast
      historical: []
    },
    jumlahPasien: {
      current: 0,
      max: 200,
      unit: 'orang',
      color: 'rgb(34, 197, 94)', // bright green for high contrast
      historical: []
    },
    ph: {
      current: 0,
      max: 14,
      unit: 'pH',
      color: 'rgb(168, 85, 247)', // bright purple for pH
      historical: []
    }
  };
}

// Real-time data simulation - starts with empty values
export function getRealtimeUpdate(): Partial<DashboardData> {
  return {
    voltaseListrik: {
      current: 0, // Will be updated by MQTT
      max: 500,
      unit: 'V',
      color: 'rgb(220, 38, 127)', // bright magenta red for high contrast
      historical: []
    },
    debitAir: {
      current: 0, // Will be updated by MQTT
      max: 100,
      unit: 'L/min',
      color: 'rgb(37, 99, 235)', // bright blue for high contrast
      historical: []
    },
    jumlahPasien: {
      current: 0, // Will be updated by MQTT
      max: 200,
      unit: 'Orang',
      color: 'rgb(34, 197, 94)', // bright green for high contrast
      historical: []
    },
    ph: {
      current: 0, // Will be updated by MQTT
      max: 14,
      unit: 'pH',
      color: 'rgb(168, 85, 247)', // bright purple for pH
      historical: []
    }
  };
}

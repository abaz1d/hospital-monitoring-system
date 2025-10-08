import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { generateDashboardData, timeFilters, type DashboardData, type TimeFilter } from '~/utils/dashboardData';
import { useDatabase } from './useDatabase';
import { useMqtt } from './useMqtt';

export const useDashboard = () => {
  const data = ref<DashboardData>(generateDashboardData());
  const selectedTimeFilter = ref<TimeFilter>(timeFilters[0]); // Default to 'Real-time'
  const isRealTimeEnabled = ref(true);
  const refreshInterval = ref<number | null>(null);

  // MQTT Integration
  const {
    mqttData,
    phData, // Global pH data
    isConnected,
    connectionStatus,
    error: mqttError,
    publishTestData,
    publishTestPhData, // pH test function
    hospitals,
    currentHospital,
    switchHospital
  } = useMqtt();

  // Database Integration
  const { loading: dbLoading, error: dbError, getHistoricalFromDatabase, getCurrentFromDatabase } = useDatabase();

  const useMqttData = ref(true); // Toggle untuk menggunakan MQTT atau dummy data

  // Export and pause functionality
  const isDataPaused = ref(false);
  const pausedData = ref<any>(null);

  // Data source management
  const isRealTimeMode = computed(() => selectedTimeFilter.value.value === 'realtime');
  const isCustomRangeMode = computed(() => selectedTimeFilter.value.value === 'custom');
  const isLoadingHistorical = ref(false);

  // Custom date range state
  const customDateRange = ref<{ start: Date; end: Date } | null>(null);
  const showDateRangePicker = ref(false);

  // Function to get hours based on filter type
  const getHoursFromFilter = (filterValue: string): number => {
    const now = new Date();

    switch (filterValue) {
      case 'today': {
        // From start of today to now
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.ceil((now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60));
      }
      case 'week': {
        // From start of this week to now
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return Math.ceil((now.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60));
      }
      case 'month': {
        // From start of this month to now
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60));
      }
      case 'year': {
        // From start of this year to now
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60));
      }
      case 'custom': {
        if (customDateRange.value) {
          return Math.ceil(
            (customDateRange.value.end.getTime() - customDateRange.value.start.getTime()) / (1000 * 60 * 60)
          );
        }
        return 24; // Default fallback
      }
      default:
        return selectedTimeFilter.value.hours;
    }
  };

  // Function to load data based on selected filter
  const loadDataByFilter = async () => {
    if (isRealTimeMode.value) {
      // Real-time mode: use MQTT data
      console.log('📡 Using real-time MQTT data');
      return;
    }

    // Historical mode: load from database
    console.log(`📊 Loading historical data for ${selectedTimeFilter.value.label}`);
    isLoadingHistorical.value = true;

    try {
      let historicalData;

      if (selectedTimeFilter.value.value === 'custom' && selectedTimeFilter.value.dateRange) {
        // Custom date range: use specific dates
        const { start, end } = selectedTimeFilter.value.dateRange;
        console.log(`📅 Custom date range: ${start} to ${end}`);

        // Call getHistoricalFromDatabase with date range
        historicalData = await getHistoricalFromDatabase(
          currentHospital.value.id,
          24, // default hours, will be overridden by date range
          {
            startDate: start,
            endDate: end
          }
        );
      } else {
        // Standard time filter: use hours
        const hours = getHoursFromFilter(selectedTimeFilter.value.value);
        historicalData = await getHistoricalFromDatabase(currentHospital.value.id, hours);
      }

      if (historicalData) {
        // Convert database format to dashboard format
        data.value = convertDatabaseToChartData(historicalData);
        console.log('✅ Historical data loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load historical data:', error);
    } finally {
      isLoadingHistorical.value = false;
    }
  };

  // Convert database data to chart format
  const convertDatabaseToChartData = (dbData: any): DashboardData => {
    const convertToChartSeries = (dataArray: any[], label: string) => {
      return dataArray.map((item) => ({
        timestamp: new Date(item.timestamp).getTime(),
        value: Number(item.value || 0)
      }));
    };

    return {
      voltaseListrik: {
        current: Number(dbData.electricity[dbData.electricity.length - 1]?.value || 0),
        max: 500,
        unit: 'V',
        color: '#3b82f6',
        historical: convertToChartSeries(dbData.electricity, 'Voltase')
      },
      debitAir: {
        current: Number(dbData.water[dbData.water.length - 1]?.value || 0),
        max: 100,
        unit: 'L/min',
        color: '#10b981',
        historical: convertToChartSeries(dbData.water, 'Debit Air')
      },
      jumlahPasien: {
        current: Number(dbData.pasien[dbData.pasien.length - 1]?.value || 0),
        max: 200,
        unit: 'Orang',
        color: '#f59e0b',
        historical: convertToChartSeries(dbData.pasien, 'Jumlah Pasien')
      },
      ph: {
        current: Number(dbData.ph[dbData.ph.length - 1]?.value || 0),
        max: 14,
        unit: 'pH',
        color: '#8b5cf6',
        historical: convertToChartSeries(dbData.ph, 'pH Level')
      }
    };
  };

  // Function to pause data updates for export
  const pauseDataForExport = () => {
    isDataPaused.value = true;
    // Capture current state
    pausedData.value = {
      voltaseListrik: { ...data.value.voltaseListrik },
      debitAir: { ...data.value.debitAir },
      jumlahPasien: { ...data.value.jumlahPasien },
      currentHospital: currentHospital.value.name,
      timestamp: new Date().toISOString()
    };
    console.log('⏸️ Data paused for export');
  };

  // Function to resume data updates
  const resumeDataUpdates = () => {
    isDataPaused.value = false;
    pausedData.value = null;
    console.log('▶️ Data updates resumed');
  };

  // Function to export data to Excel based on current filter
  const exportToExcel = async () => {
    pauseDataForExport();

    try {
      const timestamp = new Date();
      const formattedTimestamp = `${timestamp.getDate().toString().padStart(2, '0')}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getFullYear()} ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;

      let historicalData;
      let exportData;

      console.log('🔍 Debug - Current data structure:', {
        isRealTimeMode: isRealTimeMode.value,
        dataValue: data.value,
        voltaseListrik: data.value?.voltaseListrik,
        selectedFilter: selectedTimeFilter.value
      });

      // Safe number formatter
      const safeNumber = (value: any, defaultValue: number = 0): number => {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      const safeToFixed = (value: any, digits: number = 2, defaultValue: number = 0): string => {
        return safeNumber(value, defaultValue).toFixed(digits);
      }; // Get appropriate data based on current filter
      if (isRealTimeMode.value) {
        // Real-time mode: use current MQTT data with recent history
        exportData = {
          voltaseListrik: {
            current: Number(data.value.voltaseListrik?.current || 0),
            max: data.value.voltaseListrik?.max || 500,
            unit: data.value.voltaseListrik?.unit || 'V',
            color: data.value.voltaseListrik?.color || '#3b82f6',
            historical: data.value.voltaseListrik?.historical || []
          },
          debitAir: {
            current: Number(data.value.debitAir?.current || 0),
            max: data.value.debitAir?.max || 100,
            unit: data.value.debitAir?.unit || 'L/min',
            color: data.value.debitAir?.color || '#10b981',
            historical: data.value.debitAir?.historical || []
          },
          jumlahPasien: {
            current: Number(data.value.jumlahPasien?.current || 0),
            max: data.value.jumlahPasien?.max || 50,
            unit: data.value.jumlahPasien?.unit || 'Orang',
            color: data.value.jumlahPasien?.color || '#f59e0b',
            historical: data.value.jumlahPasien?.historical || []
          },
          ph: data.value.ph
            ? {
                current: Number(data.value.ph.current || 7),
                max: data.value.ph.max || 14,
                unit: data.value.ph.unit || 'pH',
                color: data.value.ph.color || '#8b5cf6',
                historical: data.value.ph.historical || []
              }
            : null,
          currentHospital: currentHospital.value.name,
          filterType: 'Real-time'
        };
      } else {
        // Historical mode: get data from database based on filter
        if (selectedTimeFilter.value.value === 'custom' && selectedTimeFilter.value.dateRange) {
          // Custom date range
          const { start, end } = selectedTimeFilter.value.dateRange;
          historicalData = await getHistoricalFromDatabase(currentHospital.value.id, 24, {
            startDate: start,
            endDate: end
          });
          exportData = {
            ...convertDatabaseToChartData(historicalData),
            currentHospital: currentHospital.value.name,
            filterType: `Custom Range (${start} - ${end})`
          };
        } else {
          // Standard time filter
          const hours = getHoursFromFilter(selectedTimeFilter.value.value);
          historicalData = await getHistoricalFromDatabase(currentHospital.value.id, hours);
          exportData = {
            ...convertDatabaseToChartData(historicalData),
            currentHospital: currentHospital.value.name,
            filterType: selectedTimeFilter.value.label
          };
        }
      }

      console.log('📊 Debug - Export data structure:', {
        exportData,
        voltaseListrikCurrent: exportData?.voltaseListrik?.current,
        voltaseListrikCurrentType: typeof exportData?.voltaseListrik?.current,
        phCurrent: exportData?.ph?.current,
        phCurrentType: typeof exportData?.ph?.current,
        hasHistoricalData: exportData?.voltaseListrik?.historical?.length || 0
      });

      // Create comprehensive CSV content
      const csvContent = [
        // Header Section
        ['HOSPITAL MONITORING SYSTEM - DATA EXPORT'],
        ['='.repeat(50)],
        ['Exported on:', formattedTimestamp],
        ['Hospital:', exportData.currentHospital],
        ['Filter:', exportData.filterType],
        ['Total Records:', exportData.voltaseListrik.historical?.length || 0],
        [''],

        // Summary Section
        ['CURRENT VALUES SUMMARY'],
        ['-'.repeat(30)],
        ['Parameter', 'Current Value', 'Unit', 'Status', 'Max Threshold'],
        [
          'Daya Listrik',
          safeToFixed(exportData.voltaseListrik.current, 2),
          'Volt',
          safeNumber(exportData.voltaseListrik.current) > 450
            ? 'HIGH'
            : safeNumber(exportData.voltaseListrik.current) < 300
              ? 'LOW'
              : 'NORMAL',
          exportData.voltaseListrik.max || 500
        ],
        [
          'Debit Air',
          safeToFixed(exportData.debitAir.current, 2),
          'L/min',
          safeNumber(exportData.debitAir.current) > 80
            ? 'HIGH'
            : safeNumber(exportData.debitAir.current) < 20
              ? 'LOW'
              : 'NORMAL',
          exportData.debitAir.max || 100
        ],
        [
          'Jumlah Pasien',
          safeNumber(exportData.jumlahPasien.current),
          'Orang',
          safeNumber(exportData.jumlahPasien.current) > 40
            ? 'HIGH'
            : safeNumber(exportData.jumlahPasien.current) < 10
              ? 'LOW'
              : 'NORMAL',
          exportData.jumlahPasien.max || 50
        ],
        [
          'pH Level',
          safeToFixed(exportData.ph?.current, 2),
          'pH',
          (() => {
            const phVal = safeNumber(exportData.ph?.current);
            return phVal < 6.5 ? 'ASAM' : phVal > 8.5 ? 'BASA' : 'NORMAL';
          })(),
          '6.5-8.5 (Normal Range)'
        ],
        [''],

        // Statistical Analysis
        ['STATISTICAL ANALYSIS'],
        ['-'.repeat(25)],
        ['Parameter', 'Average', 'Minimum', 'Maximum', 'Standard Dev']
      ];

      // Calculate statistics if historical data exists
      if (exportData.voltaseListrik?.historical && exportData.voltaseListrik.historical.length > 0) {
        const calculateStats = (data: any[]) => {
          const values = data.map((item) => safeNumber(item.value)).filter((val) => !isNaN(val));
          if (values.length === 0) {
            return { avg: '0.00', min: '0.00', max: '0.00', stdDev: '0.00' };
          }
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);
          return {
            avg: safeToFixed(avg, 2),
            min: safeToFixed(min, 2),
            max: safeToFixed(max, 2),
            stdDev: safeToFixed(stdDev, 2)
          };
        };

        const voltageStats = calculateStats(exportData.voltaseListrik.historical || []);
        const waterStats = calculateStats(exportData.debitAir.historical || []);
        const patientStats = calculateStats(exportData.jumlahPasien.historical || []);
        const phStats = exportData.ph?.historical ? calculateStats(exportData.ph.historical) : null;

        csvContent.push(
          ['Daya Listrik (V)', voltageStats.avg, voltageStats.min, voltageStats.max, voltageStats.stdDev],
          ['Debit Air (L/min)', waterStats.avg, waterStats.min, waterStats.max, waterStats.stdDev],
          ['Jumlah Pasien', patientStats.avg, patientStats.min, patientStats.max, patientStats.stdDev],
          ['pH Level', phStats?.avg || 'N/A', phStats?.min || 'N/A', phStats?.max || 'N/A', phStats?.stdDev || 'N/A']
        );
      }

      csvContent.push(
        [''],
        ['DETAILED HISTORICAL DATA'],
        ['-'.repeat(30)],
        ['No', 'Timestamp', 'Daya Listrik (V)', 'Debit Air (L/min)', 'Jumlah Pasien', 'pH Level', 'Notes']
      );

      // Add all historical data
      if (exportData.voltaseListrik?.historical && exportData.voltaseListrik.historical.length > 0) {
        exportData.voltaseListrik.historical.forEach((voltageEntry: any, index: number) => {
          const waterEntry = exportData.debitAir?.historical?.[index];
          const patientEntry = exportData.jumlahPasien?.historical?.[index];
          const phEntry = exportData.ph?.historical?.[index];

          const timestamp = new Date(voltageEntry.timestamp);
          const formattedTimestamp = `${timestamp.getDate().toString().padStart(2, '0')}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getFullYear()} ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;

          // Generate notes based on values
          const notes = [];
          const voltageVal = safeNumber(voltageEntry.value);
          const waterVal = safeNumber(waterEntry?.value);
          const patientVal = safeNumber(patientEntry?.value);
          const phVal = safeNumber(phEntry?.value);

          if (voltageVal > 450) notes.push('High Voltage');
          if (voltageVal < 300) notes.push('Low Voltage');
          if (waterVal < 20) notes.push('Low Water Flow');
          if (patientVal > 40) notes.push('High Patient Count');
          if (phVal < 6.5) notes.push('Acidic pH');
          if (phVal > 8.5) notes.push('Basic pH');

          csvContent.push([
            index + 1,
            formattedTimestamp,
            safeToFixed(voltageVal, 2),
            waterVal > 0 ? safeToFixed(waterVal, 2) : '-',
            patientVal > 0 ? patientVal : '-',
            phVal > 0 ? safeToFixed(phVal, 2) : '-',
            notes.join('; ') || 'Normal'
          ]);
        });
      } else {
        csvContent.push(['No historical data available']);
      }

      // Convert to CSV string with proper formatting
      const csvString = csvContent
        .map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell);
              return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
                ? `"${cellStr.replace(/"/g, '""')}"`
                : cellStr;
            })
            .join(',')
        )
        .join('\n');

      // Create and download file
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const hospitalCode = currentHospital.value.id || 'Hospital';
      const filterSuffix = selectedTimeFilter.value.value === 'custom' ? 'Custom' : selectedTimeFilter.value.value;
      const fileName = `MonitoringData_${hospitalCode}_${filterSuffix}_${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}_${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}.csv`;

      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`📥 Data exported successfully: ${fileName}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
    } finally {
      // Resume data updates after 3 seconds
      setTimeout(() => {
        resumeDataUpdates();
      }, 3000);
    }
  };

  // Function to export dashboard as PDF
  const exportToPDF = async () => {
    pauseDataForExport();

    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;

      const doc = new jsPDF();
      const timestamp = new Date();
      const exportData = pausedData.value;

      // Header
      doc.setFontSize(20);
      doc.text('Hospital Monitoring Report', 20, 20);

      doc.setFontSize(12);
      doc.text(`Hospital: ${exportData.currentHospital}`, 20, 35);
      doc.text(
        `Generated: ${timestamp.getDate().toString().padStart(2, '0')}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getFullYear()} ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`,
        20,
        45
      );

      // Current Data Summary
      doc.setFontSize(14);
      doc.text('Current Data Summary:', 20, 65);

      doc.setFontSize(11);
      doc.text(`Daya Listrik: ${exportData.voltaseListrik.current}V (Max: ${exportData.voltaseListrik.max}V)`, 20, 80);
      doc.text(`Debit Air: ${exportData.debitAir.current}L/min (Max: ${exportData.debitAir.max}L/min)`, 20, 90);
      doc.text(
        `Jumlah Pasien: ${exportData.jumlahPasien.current} Orang (Max: ${exportData.jumlahPasien.max} Orang)`,
        20,
        100
      );

      // Try to capture dashboard image
      try {
        const dashboardElement = document.querySelector('.dashboard-content');
        if (dashboardElement) {
          const canvas = await html2canvas(dashboardElement as HTMLElement, {
            scale: 0.5,
            logging: false,
            useCORS: true
          });

          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 20, 120, 170, 100);
        }
      } catch (imgError) {
        console.warn('Could not capture dashboard image:', imgError);
        doc.text('Dashboard visualization could not be captured', 20, 130);
      }

      // Save PDF
      doc.save(
        `hospital_monitoring_${exportData.currentHospital.replace(/\s+/g, '_')}_${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}.pdf`
      );

      console.log('📄 PDF exported successfully');
    } catch (error) {
      console.error('❌ PDF export failed:', error);
    } finally {
      setTimeout(() => {
        resumeDataUpdates();
      }, 2000);
    }
  };

  // Function to export dashboard as image
  const exportToImage = async () => {
    pauseDataForExport();

    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const timestamp = new Date();
      const exportData = pausedData.value;

      console.log('🖼️ Starting image export with html2canvas-pro...');

      // Wait a bit for pause to take effect
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for charts to fully render - increased delay for Highcharts
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Force Highcharts to redraw
      const highchartsElements = document.querySelectorAll('.highcharts-container');
      console.log(`Found ${highchartsElements.length} Highcharts containers`);

      // Trigger chart reflow for better capture
      if (window.Highcharts) {
        window.Highcharts.charts.forEach((chart) => {
          if (chart) {
            chart.reflow();
          }
        });
      }

      const dashboardElement = document.querySelector('.dashboard-content');
      if (!dashboardElement) {
        console.error('Dashboard element with class "dashboard-content" not found');
        throw new Error('Dashboard element not found');
      }

      console.log('📸 Capturing dashboard element...');

      // Get accurate dimensions including padding/margin
      const rect = dashboardElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(dashboardElement);

      console.log('Element dimensions:', {
        boundingRect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        scroll: {
          width: dashboardElement.scrollWidth,
          height: dashboardElement.scrollHeight
        },
        offset: {
          width: (dashboardElement as HTMLElement).offsetWidth,
          height: (dashboardElement as HTMLElement).offsetHeight
        },
        computed: {
          padding: computedStyle.padding,
          margin: computedStyle.margin
        }
      });

      // Use getBoundingClientRect for more accurate dimensions
      const captureWidth = Math.max(rect.width, dashboardElement.scrollWidth);
      const captureHeight = Math.max(rect.height, dashboardElement.scrollHeight);

      const canvas = await html2canvas(dashboardElement as HTMLElement, {
        scale: 1.5, // Reduced scale to avoid memory issues
        logging: false, // Disable logging for cleaner output
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: captureWidth,
        height: captureHeight,
        x: 0, // Ensure we start from the beginning
        y: 0, // Ensure we start from the top
        scrollX: 0,
        scrollY: 0,
        // html2canvas-pro should support modern CSS including oklch
        foreignObjectRendering: true, // Better SVG handling
        removeContainer: true,
        ignoreElements: (element) => {
          return (
            element.classList.contains('no-capture') || element.tagName === 'SCRIPT' || element.tagName === 'STYLE'
          );
        },
        onclone: (clonedDoc) => {
          // Additional processing for the cloned document
          console.log('📋 Processing cloned document...');

          // Force SVG elements to be visible
          const svgElements = clonedDoc.querySelectorAll('svg');
          svgElements.forEach((svg) => {
            svg.style.display = 'block';
            svg.style.visibility = 'visible';
            svg.style.opacity = '1';
            // Ensure SVG has proper dimensions
            if (!svg.getAttribute('width') && svg.parentElement) {
              const parent = svg.parentElement;
              svg.setAttribute('width', parent.offsetWidth.toString());
              svg.setAttribute('height', parent.offsetHeight.toString());
            }
          });

          // Process Highcharts containers specifically
          const highchartsContainers = clonedDoc.querySelectorAll('.highcharts-container');
          console.log(`🎯 Found ${highchartsContainers.length} Highcharts containers in clone`);

          highchartsContainers.forEach((container, index) => {
            console.log(`Processing Highcharts container ${index + 1}`);
            const svg = container.querySelector('svg');
            if (svg) {
              // Force SVG to be rendered properly
              svg.style.display = 'block';
              svg.style.visibility = 'visible';
              svg.style.width = '100%';
              svg.style.height = '100%';
            }
          });
        }
      });

      console.log('✅ Canvas created successfully');

      // Create download link immediately
      const link = document.createElement('a');
      const url = canvas.toDataURL('image/png');

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `hospital_monitoring_${exportData.currentHospital.replace(/\s+/g, '_')}_${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}.png`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('🖼️ Image exported successfully');
    } catch (error) {
      console.error('❌ Image export failed:', error);
      console.error('Error details:', error);

      // Try alternative method with simpler options
      try {
        console.log('🔄 Trying alternative html2canvas-pro method...');
        const html2canvas = (await import('html2canvas-pro')).default;
        const dashboardElement = document.querySelector('.dashboard-content');

        if (dashboardElement) {
          // Try with minimal configuration
          const canvas = await html2canvas(dashboardElement as HTMLElement, {
            scale: 1,
            logging: false,
            backgroundColor: '#ffffff',
            useCORS: false,
            allowTaint: false
          });

          const link = document.createElement('a');
          const url = canvas.toDataURL('image/png');

          link.setAttribute('href', url);
          link.setAttribute('download', `hospital_monitoring_fallback_${new Date().getTime()}.png`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          console.log('✅ Html2canvas-pro export successful');
        }
      } catch (fallbackError) {
        console.error('❌ Html2canvas-pro fallback also failed:', fallbackError);

        // Final fallback: show instruction to user
        const confirmManual = confirm(
          'Export image gagal. \n\n' +
            'Apakah Anda ingin mencoba export PDF sebagai alternatif? \n\n' +
            'Atau Anda bisa screenshot manual dengan menekan Ctrl+Shift+S (Windows) atau Cmd+Shift+4 (Mac)'
        );

        if (confirmManual) {
          // Trigger PDF export instead
          exportToPDF();
        }
      }
    } finally {
      setTimeout(() => {
        resumeDataUpdates();
      }, 2000);
    }
  };

  // Watch MQTT data untuk update real-time
  watch(
    mqttData,
    (newMqttData) => {
      // Skip update if data is paused for export
      if (isDataPaused.value) {
        console.log('⏸️ Data update skipped - paused for export');
        return;
      }

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
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">kWh</span></div>'
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
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">Pasien</span></div>'
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
    },

    ph: {
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
        max: data.value.ph.max,
        stops: [
          [0.1, 'rgb(168, 85, 247)'], // bright purple for pH
          [0.5, 'rgb(168, 85, 247)'], // bright purple for pH
          [0.9, 'rgb(168, 85, 247)'] // bright purple for pH
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
              '<div style="text-align:center"><span style="font-size:25px;color:#374151">{y}</span><br/><span style="font-size:12px;opacity:0.4">pH</span></div>'
          }
        }
      },
      series: [
        {
          name: 'pH Level',
          data: [data.value.ph.current],
          color: data.value.ph.color
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
    exporting: { enabled: false },
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
      },
      {
        name: 'pH',
        color: 'rgb(168, 85, 247)', // bright purple for pH
        data: data.value.ph.historical.map((point) => [point.timestamp, point.value])
      }
    ]
  }));

  // Methods
  const updateTimeFilter = async (filterValue: TimeFilter) => {
    selectedTimeFilter.value = filterValue;

    // Load data based on filter
    await loadDataByFilter();
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
      console.log('⏭️ Using MQTT data - no dummy updates needed');
      return; // Don't start dummy updates if using MQTT
    }

    console.log('📊 Real-time mode active - waiting for MQTT data or database load');
    // In real-time mode, data will remain 0 until MQTT updates or database loads
    // This ensures clean initial state
  };

  const stopRealTimeUpdates = () => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  };

  const refreshData = () => {
    if (isRealTimeMode.value) {
      data.value = generateDashboardData(selectedTimeFilter.value.value);
    } else {
      loadDataByFilter();
    }
  };

  // Watchers
  watch(selectedTimeFilter, async (newFilter) => {
    console.log(`🔄 Filter changed to: ${newFilter.label}`);
    await loadDataByFilter();
  });

  watch(currentHospital, async () => {
    console.log(`🏥 Hospital changed to: ${currentHospital.value.name}`);
    if (!isRealTimeMode.value) {
      await loadDataByFilter();
    }
  });

  // Watch MQTT data untuk real-time mode
  watch(mqttData, (newData) => {
    if (isRealTimeMode.value && useMqttData.value && !isDataPaused.value) {
      // Update current values from MQTT (hospital-specific data)
      data.value.voltaseListrik.current = newData.electricity;
      data.value.debitAir.current = newData.water;
      data.value.jumlahPasien.current = newData.pasien;

      // Add to historical data for real-time chart
      const timestamp = newData.timestamp;

      data.value.voltaseListrik.historical.push({ timestamp, value: newData.electricity });
      data.value.debitAir.historical.push({ timestamp, value: newData.water });
      data.value.jumlahPasien.historical.push({ timestamp, value: newData.pasien });

      // Keep only last 50 points for real-time chart performance
      if (data.value.voltaseListrik.historical.length > 50) {
        data.value.voltaseListrik.historical.shift();
        data.value.debitAir.historical.shift();
        data.value.jumlahPasien.historical.shift();
      }

      console.log('📊 Real-time hospital data updated from MQTT');
    }
  });

  // Watch pH data separately (global sensor)
  watch(phData, (newPhData) => {
    if (isRealTimeMode.value && useMqttData.value && !isDataPaused.value) {
      // Update pH current value
      if (data.value.ph) {
        data.value.ph.current = newPhData.ph;

        // Add to historical data for real-time chart
        const timestamp = newPhData.timestamp;
        data.value.ph.historical.push({ timestamp, value: newPhData.ph });

        // Keep only last 50 points for real-time chart performance
        if (data.value.ph.historical.length > 50) {
          data.value.ph.historical.shift();
        }

        console.log('📊 Real-time pH data updated from MQTT:', newPhData);
      }
    }
  });

  // Lifecycle
  onMounted(async () => {
    if (isRealTimeEnabled.value && !useMqttData.value) {
      startRealTimeUpdates();
    }

    // Load initial data based on filter
    await loadDataByFilter();
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
    publishTestPhData, // pH test function
    // Hospital management
    hospitals,
    currentHospital,
    switchHospital,
    // Export functionality
    exportToExcel,
    isDataPaused,
    // Database functionality
    dbLoading,
    dbError,
    isRealTimeMode,
    isLoadingHistorical,
    loadDataByFilter
  };
};

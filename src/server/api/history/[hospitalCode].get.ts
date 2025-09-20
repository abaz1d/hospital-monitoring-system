import { getHistoricalData, getHistoricalDataByDateRange } from '../../utils/database';

export default defineEventHandler(async (event) => {
  try {
    const hospitalCode = getRouterParam(event, 'hospitalCode');
    const query = getQuery(event);

    if (!hospitalCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Hospital code is required'
      });
    }

    // Check if date range is provided
    const startDate = query.startDate as string;
    const endDate = query.endDate as string;

    let data;
    let meta;

    if (startDate && endDate) {
      // Use date range query
      data = await getHistoricalDataByDateRange(hospitalCode, startDate, endDate);
      meta = {
        hospitalCode,
        startDate,
        endDate,
        queryType: 'dateRange'
      };
    } else {
      // Use hours query (default behavior)
      const hours = parseInt(query.hours as string) || 24;
      data = await getHistoricalData(hospitalCode, hours);
      meta = {
        hospitalCode,
        timeRange: hours,
        since: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        queryType: 'hours'
      };
    }

    return {
      success: true,
      data,
      meta
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch historical data'
    });
  }
});

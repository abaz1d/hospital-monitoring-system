import { getHistoricalData } from '../../utils/database';

export default defineEventHandler(async (event) => {
  try {
    const hospitalCode = getRouterParam(event, 'hospitalCode');
    const query = getQuery(event);
    const hours = parseInt(query.hours as string) || 24;

    if (!hospitalCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Hospital code is required'
      });
    }

    const data = await getHistoricalData(hospitalCode, hours);

    return {
      success: true,
      data,
      meta: {
        hospitalCode,
        timeRange: hours,
        since: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      }
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

import { getCurrentData } from '../../utils/database';

export default defineEventHandler(async (event) => {
  try {
    const hospitalCode = getRouterParam(event, 'hospitalCode');

    if (!hospitalCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Hospital code is required'
      });
    }

    const data = await getCurrentData(hospitalCode);

    return {
      success: true,
      data
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch current data'
    });
  }
});

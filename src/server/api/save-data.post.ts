import { saveSensorDataToDatabase } from '../utils/database';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    const { hospitalCode, electricity, water, pasien, ph } = body;

    if (!hospitalCode || electricity === undefined || water === undefined || pasien === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: hospitalCode, electricity, water, pasien'
      });
    }

    const result = await saveSensorDataToDatabase(hospitalCode, electricity, water, pasien, ph);

    return {
      success: true,
      message: 'Data saved successfully',
      data: result
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to save sensor data'
    });
  }
});

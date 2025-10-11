import { saveRealTimePatientData } from '../../utils/database';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { hospitalCode, patientCount, date } = body;

    if (!hospitalCode || typeof patientCount !== 'number' || !date) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: hospitalCode, patientCount, date'
      });
    }

    await saveRealTimePatientData(hospitalCode, patientCount, date);

    return {
      success: true,
      message: `Patient data saved for hospital ${hospitalCode}`,
      data: {
        hospitalCode,
        patientCount,
        date
      }
    };
  } catch (error: any) {
    console.error('❌ Error saving patient data:', error);

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to save patient data'
    });
  }
});

import { getAllHospitals } from '../utils/database';

export default defineEventHandler(async (event) => {
  try {
    const hospitals = await getAllHospitals();
    console.log('Fetched hospitals:', hospitals);
    return {
      success: true,
      data: hospitals
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch hospitals'
    });
  }
});

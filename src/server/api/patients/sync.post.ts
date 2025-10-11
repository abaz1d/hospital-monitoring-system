import { getAllHospitals, saveRealTimePatientData } from '../../utils/database';

interface PatientApiResponse {
  kdbagian: string;
  bagian: string;
  tanggal: string;
  jumlah: number;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const forceSync = query.force === 'true';

    console.log('🔄 Starting scheduled patient data sync...');

    const today = new Date().toISOString().split('T')[0];

    // Fetch data from external API
    const apiUrl = `https://bendanpublic.pekalongankota.go.id/ipsrs/${today}/${today}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch from patient API: ${response.status}`);
    }

    const data: PatientApiResponse[] = await response.json();
    console.log(`📊 Fetched ${data.length} patient records from API`);

    // Get hospitals with their mapping
    const hospitals = await getAllHospitals();
    let savedCount = 0;

    for (const hospital of hospitals) {
      try {
        let totalPatients = 0;

        if (hospital.bagian_mapping && hospital.bagian_mapping.length > 0) {
          // Use mapping to accumulate data
          const mappedData = data.filter(
            (item) => hospital.bagian_mapping.includes(item.kdbagian) && item.tanggal === today
          );
          totalPatients = mappedData.reduce((sum, item) => sum + item.jumlah, 0);
        } else if (hospital.kdbagian) {
          // Use exact match by kdbagian
          const exactMatch = data.filter((item) => item.kdbagian === hospital.kdbagian && item.tanggal === today);
          totalPatients = exactMatch.reduce((sum, item) => sum + item.jumlah, 0);
        }

        if (totalPatients > 0 || forceSync) {
          await saveRealTimePatientData(hospital.id, totalPatients, today);
          savedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to save data for hospital ${hospital.id}:`, error);
      }
    }

    console.log(`✅ Saved patient data for ${savedCount} hospitals`);

    return {
      success: true,
      message: `Synchronized patient data for ${savedCount} hospitals`,
      data: {
        date: today,
        hospitalsProcessed: hospitals.length,
        hospitalsSaved: savedCount,
        totalRecords: data.length
      }
    };
  } catch (error: any) {
    console.error('❌ Error in scheduled patient sync:', error);

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to sync patient data'
    });
  }
});

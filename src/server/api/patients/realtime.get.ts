import { getAllHospitals } from '../../utils/database';

interface PatientApiResponse {
  kdbagian: string;
  bagian: string;
  tanggal: string;
  jumlah: number;
}

interface HospitalPatientData {
  hospitalCode: string;
  hospitalName: string;
  kdbagian: string;
  totalPatients: number;
  date: string;
  breakdown: PatientApiResponse[];
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const targetDate = (query.date as string) || new Date().toISOString().split('T')[0]; // Default to today

    // Format date for API endpoint (YYYY-MM-DD)
    const startDate = targetDate;
    const endDate = targetDate;

    console.log(`📊 Fetching patient data for date: ${targetDate}`);

    // Fetch data from external API
    const apiUrl = `https://bendanpublic.pekalongankota.go.id/ipsrs/${startDate}/${endDate}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch from patient API: ${response.status} ${response.statusText}`);
    }

    const data: PatientApiResponse[] = await response.json();

    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid response from patient API');
    }

    console.log(`✅ Fetched ${data.length} patient records from API`);

    // Get hospitals with their mapping from database
    const hospitals = await getAllHospitals();

    // Process data for each hospital
    const hospitalData: HospitalPatientData[] = [];

    for (const hospital of hospitals) {
      if (!hospital.bagian_mapping || hospital.bagian_mapping.length === 0) {
        // If no mapping, try to find exact match by kdbagian
        const exactMatch = data.filter((item) => item.kdbagian === hospital.kdbagian && item.tanggal === targetDate);

        const totalPatients = exactMatch.reduce((sum, item) => sum + item.jumlah, 0);

        hospitalData.push({
          hospitalCode: hospital.id,
          hospitalName: hospital.name,
          kdbagian: hospital.kdbagian || '',
          totalPatients,
          date: targetDate,
          breakdown: exactMatch
        });
      } else {
        // Use mapping to accumulate data
        const mappedData = data.filter(
          (item) => hospital.bagian_mapping.includes(item.kdbagian) && item.tanggal === targetDate
        );

        const totalPatients = mappedData.reduce((sum, item) => sum + item.jumlah, 0);

        hospitalData.push({
          hospitalCode: hospital.id,
          hospitalName: hospital.name,
          kdbagian: hospital.kdbagian || '',
          totalPatients,
          date: targetDate,
          breakdown: mappedData
        });
      }
    }

    console.log(`📋 Processed patient data for ${hospitalData.length} hospitals`);

    return {
      success: true,
      data: hospitalData,
      meta: {
        date: targetDate,
        totalRecords: data.length,
        apiUrl
      }
    };
  } catch (error: any) {
    console.error('❌ Error fetching patient data:', error);

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch patient data'
    });
  }
});

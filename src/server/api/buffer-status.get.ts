export default defineEventHandler(async (event) => {
  try {
    // Get buffer status from global if available
    const bufferInfo = {
      serverTime: new Date().toISOString(),
      autoSaveInterval: '5 minutes',
      status: 'Buffer system active',
      message: 'MQTT data is being buffered and automatically saved to database every 5 minutes'
    };

    // Try to get actual buffer data if exposed globally
    if (typeof global !== 'undefined' && (global as any).getMqttBufferStatus) {
      const actualStatus = (global as any).getMqttBufferStatus();
      Object.assign(bufferInfo, actualStatus);
    }

    return {
      success: true,
      data: bufferInfo
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to get buffer status'
    });
  }
});

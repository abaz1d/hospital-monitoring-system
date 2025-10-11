<template>
  <div v-if="show" class="patient-loading">
    <div class="loading-header">
      <div class="loading-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div class="loading-text">
        <h4>Mengambil Data Pasien Real-Time</h4>
        <p>Sedang mengakses data dari RSUD Bendan...</p>
      </div>
    </div>

    <div class="loading-progress">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <small class="progress-text">{{ progressText }}</small>
    </div>

    <div class="hospital-skeleton">
      <div v-for="i in 5" :key="i" class="skeleton-hospital-card">
        <div class="skeleton-hospital-name"></div>
        <div class="skeleton-patient-count"></div>
        <div class="skeleton-status"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const progressSteps = [
  'Menghubungi server...',
  'Mengambil data rumah sakit...',
  'Memproses data pasien...',
  'Menyinkronkan data...',
  'Menyelesaikan...'
];

const currentStep = ref(0);

const progressText = computed(() => progressSteps[currentStep.value] || 'Loading...');

onMounted(() => {
  if (props.show) {
    startProgressAnimation();
  }
});

const startProgressAnimation = () => {
  currentStep.value = 0;
  const interval = setInterval(() => {
    currentStep.value = (currentStep.value + 1) % progressSteps.length;
  }, 800);

  // Clean up when component unmounts or loading finishes
  const cleanup = () => clearInterval(interval);

  // Watch for show prop changes
  const unwatch = watch(
    () => props.show,
    (newVal) => {
      if (!newVal) {
        cleanup();
        unwatch();
      }
    }
  );
};

// Watch for show prop changes to restart animation
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      startProgressAnimation();
    }
  }
);
</script>

<style scoped>
.patient-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.9), rgba(0, 86, 179, 0.9));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: white;
  padding: 2rem;
}

.loading-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  text-align: center;
}

.loading-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

.loading-icon svg {
  color: white;
  animation: rotate 2s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-text h4 {
  margin: 0 0 0.5rem 0;
  font-size: 24px;
  font-weight: 600;
}

.loading-text p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.loading-progress {
  width: 100%;
  max-width: 400px;
  margin-bottom: 3rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffffff, #e3f2fd, #ffffff);
  background-size: 200% 100%;
  animation: loading-progress 2s infinite;
  border-radius: 3px;
}

@keyframes loading-progress {
  0% {
    background-position: 200% 0;
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    background-position: -200% 0;
    width: 100%;
  }
}

.progress-text {
  display: block;
  text-align: center;
  opacity: 0.8;
  font-size: 14px;
  transition: opacity 0.3s ease;
}

.hospital-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 1000px;
}

.skeleton-hospital-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.skeleton-hospital-name,
.skeleton-patient-count,
.skeleton-status {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-hospital-name {
  height: 20px;
  margin-bottom: 1rem;
  width: 80%;
}

.skeleton-patient-count {
  height: 32px;
  margin-bottom: 0.5rem;
  width: 50%;
}

.skeleton-status {
  height: 16px;
  width: 60%;
}

@keyframes skeleton-loading {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.7;
  }
}

@media (max-width: 768px) {
  .patient-loading {
    padding: 1rem;
  }

  .loading-header {
    flex-direction: column;
    text-align: center;
  }

  .loading-text h4 {
    font-size: 20px;
  }

  .hospital-skeleton {
    grid-template-columns: 1fr;
  }
}
</style>

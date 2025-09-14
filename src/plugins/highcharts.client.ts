import { defineNuxtPlugin } from '#app';
import HighchartsVue from 'highcharts-vue';

// Import modules after Highcharts
import 'highcharts/highcharts-more';
// import 'highcharts/modules/export-data';
import 'highcharts/modules/exporting';
import 'highcharts/modules/solid-gauge';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(HighchartsVue);
});

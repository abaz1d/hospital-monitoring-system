import { defineNuxtPlugin } from "#app";
import HighchartsVue from "highcharts-vue";

import "highcharts/modules/sankey";
import "highcharts/modules/organization";
import "highcharts/modules/networkgraph";
import "highcharts/modules/exporting";
import "highcharts/modules/accessibility";

import "highcharts/modules/histogram-bellcurve";
import "highcharts/modules/map";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(HighchartsVue);
});

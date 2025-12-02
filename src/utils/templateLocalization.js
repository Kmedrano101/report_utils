const SUPPORTED_LOCALES = ['en', 'es'];

const TEMPLATE_TEXT_TRANSLATIONS = {
  '% of time': { es: '% del tiempo' },
  'Above Threshold (70 dB)': { es: 'Por encima del umbral (70 dB)' },
  Active: { es: 'Activos' },
  'Active Sensors': { es: 'Sensores activos' },
  'Average Consumption per Channel': { es: 'Consumo medio por canal' },
  'Average Level': { es: 'Nivel medio' },
  Avg: { es: 'Prom.' },
  'Avg Humidity': { es: 'Humedad promedio' },
  'Avg Sound Level': { es: 'Nivel sonoro promedio' },
  'Avg Temperature': { es: 'Temperatura promedio' },
  Building: { es: 'Edificio' },
  Channel: { es: 'Canal' },
  'Cold Zones': { es: 'Zonas frías' },
  'Cold Zones (Top 3 Lowest Temperature)': { es: 'Zonas frías (3 temperaturas más bajas)' },
  'Consumption Details': { es: 'Detalles de consumo' },
  'Consumption Details & Peak Loads': { es: 'Detalles de consumo y picos' },
  Deviation: { es: 'Desviación' },
  Duration: { es: 'Duración' },
  EUR: { es: 'EUR' },
  'Estimated Cost (Spain)': { es: 'Coste estimado (España)' },
  'Highest Noise Events': { es: 'Eventos de ruido más altos' },
  Hotspots: { es: 'Zonas calientes' },
  'Hotspots (Top 3 Highest Temperature)': { es: 'Zonas calientes (3 temperaturas más altas)' },
  'Key Metrics': { es: 'Métricas clave' },
  'Last Update': { es: 'Última actualización' },
  Location: { es: 'Ubicación' },
  MAX: { es: 'MÁX' },
  MIN: { es: 'MÍN' },
  Max: { es: 'Máx' },
  Min: { es: 'Mín' },
  Monitored: { es: 'Monitoreados' },
  'Noise Pollution Analysis - Noisiest Locations': { es: 'Análisis de contaminación acústica - Ubicaciones más ruidosas' },
  'Noise Statistics': { es: 'Estadísticas de ruido' },
  Noisiest: { es: 'Más ruidoso' },
  Offline: { es: 'Fuera de línea' },
  'Peak Level': { es: 'Nivel pico' },
  'Peak Load Events': { es: 'Eventos de carga pico' },
  'Peak Load Times & Values': { es: 'Horas y valores de carga pico' },
  'Peak Noise Events': { es: 'Eventos de ruido pico' },
  'Peak Value': { es: 'Valor pico' },
  Period: { es: 'Período' },
  'Power (kW)': { es: 'Potencia (kW)' },
  Quietest: { es: 'Más silencioso' },
  Rank: { es: 'Ranking' },
  Sensor: { es: 'Sensor' },
  'Sensor C1': { es: 'Sensor C1' },
  'Sensor C2': { es: 'Sensor C2' },
  'Sensor Temperature Details': { es: 'Detalles de temperatura por sensor' },
  Sensors: { es: 'Sensores' },
  'Sound Level Summary': { es: 'Resumen de nivel sonoro' },
  'Status Summary': { es: 'Resumen de estado' },
  'Temperature Analysis: Hotspots and Cold Zones': { es: 'Análisis de temperatura: Zonas calientes y frías' },
  Time: { es: 'Tiempo' },
  'Total Amperes': { es: 'Amperios totales' },
  'Total Consumption Summary': { es: 'Resumen de consumo total' },
  'Total Energy': { es: 'Energía total' },
  'Total Power': { es: 'Potencia total' },
  'Total Sensors': { es: 'Sensores totales' },
  dB: { es: 'dB' },
  kWh: { es: 'kWh' },
  '°C': { es: '°C' }
};

const REPORT_COPY = {
  hotspots: {
    headerTitle: { en: 'Hotspots and Cold Zones', es: 'Zonas calientes y frías' },
    headerSubtitle: { en: 'Temperature Analysis Report', es: 'Informe de análisis de temperatura' },
    footerText: { en: 'Madison - IoT Report', es: 'Madison - Reporte IoT' }
  },
  power: {
    headerTitle: { en: 'Power Consumption Analysis', es: 'Análisis de consumo energético' },
    headerSubtitle: { en: 'Energy Monitoring Report', es: 'Informe de monitoreo energético' },
    footerText: { en: 'Madison - IoT Report', es: 'Madison - Reporte IoT' }
  },
  noise: {
    headerTitle: { en: 'Sound Levels and Noise Pollution', es: 'Niveles de sonido y contaminación acústica' },
    headerSubtitle: { en: 'Noise Analysis Report', es: 'Informe de análisis de ruido' },
    footerText: { en: 'Madison - IoT Report', es: 'Madison - Reporte IoT' }
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');

const normalizeLocale = (locale = 'en') => {
  if (!locale) return 'en';
  const lower = locale.toLowerCase();
  return SUPPORTED_LOCALES.find(code => lower === code || lower.startsWith(`${code}-`)) || 'en';
};

const replaceTextSafely = (content, source, target) => {
  if (!target || target === source) return content;
  const escaped = escapeRegex(source);
  const boundary = source.length <= 3 ? `(?<![A-Za-z0-9_{])${escaped}(?![A-Za-z0-9_}])` : escaped;
  return content.replace(new RegExp(boundary, 'g'), target);
};

export const translateTemplateText = (svgContent, locale = 'en') => {
  const normalized = normalizeLocale(locale);
  if (normalized === 'en' || !svgContent) {
    return svgContent;
  }

  let result = svgContent;
  Object.entries(TEMPLATE_TEXT_TRANSLATIONS).forEach(([source, translations]) => {
    const target = translations[normalized];
    result = replaceTextSafely(result, source, target);
  });
  return result;
};

export const getReportCopy = (reportKey, locale = 'en') => {
  const normalized = normalizeLocale(locale);
  const copy = REPORT_COPY[reportKey];
  if (!copy) return {};

  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [key, value[normalized] || value.en])
  );
};

export const toLanguageTag = (locale = 'en') => {
  const normalized = normalizeLocale(locale);
  return normalized === 'es' ? 'es-ES' : 'en-US';
};

import { translateTemplateText } from './src/utils/templateLocalization.js';

const testText = 'This report analyzes temperature patterns across all monitored sensors to identify hotspots (areas with consistently high temperatures) and cold zones (areas with consistently low temperatures). The comfort zone is defined as temperatures between 20°C and 26°C, providing optimal conditions for occupancy and equipment operation.';

const template = `<text>${testText}</text>`;

console.log('Original:', testText);
console.log('\nTranslated to Spanish:');
const translated = translateTemplateText(template, 'es');
console.log(translated);

console.log('\nContains Spanish text:', translated.includes('Este informe'));

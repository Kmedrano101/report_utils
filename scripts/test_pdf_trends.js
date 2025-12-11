/**
 * Test PDF generation with trends chart
 */

import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:3000/api';

async function testPdfGeneration() {
  try {
    console.log('Testing PDF generation with trends chart...\n');

    const url = `${API_BASE}/reports/hotspots-coldzones`;
    const body = {
      startDate: '2025-12-10T00:00:00Z',
      endDate: '2025-12-11T00:00:00Z',
      source: 'external',
      format: 'pdf',
      layout: 'portrait',
      locale: 'en'
    };

    console.log(`Posting to: ${url}`);
    console.log(`Request body:`, body);
    console.log('\nGenerating PDF (this may take 5-10 seconds)...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${text}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`Response content-type: ${contentType}`);

    if (!contentType?.includes('application/pdf')) {
      console.error('❌ Response is not a PDF!');
      const text = await response.text();
      console.error('Response:', text.substring(0, 500));
      process.exit(1);
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfPath = '/tmp/hotspots_report_with_trends.pdf';

    await writeFile(pdfPath, Buffer.from(pdfBuffer));

    console.log('============================================================');
    console.log('✅ PDF generated successfully!');
    console.log('============================================================');
    console.log(`\nPDF saved to: ${pdfPath}`);
    console.log(`File size: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    console.log('\nOpen the PDF to verify the temperature trends chart is visible.');
    console.log('The chart should show 3 lines:');
    console.log('  🔥 Red line: Max Temperature');
    console.log('  📊 Green line: Average Temperature');
    console.log('  ❄️ Blue line: Min Temperature');
    console.log('  Plus a green shaded comfort zone (20-26°C)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPdfGeneration();

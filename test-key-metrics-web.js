/**
 * Test key metrics report generation from web page
 * Simulates user selecting dates and generating report
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

const API_BASE = 'http://localhost:3000';

async function testKeyMetricsFromWeb() {
    console.log('🌐 Testing Key Metrics Report Generation from Web Page\n');
    console.log('=' .repeat(70));

    try {
        // Test 1: Last 7 days (default)
        console.log('\n📊 Test 1: Generate report for last 7 days...');
        const endDate = new Date();
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const response1 = await fetch(`${API_BASE}/api/reports/key-metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                layout: 'landscape',  // Default horizontal
                pageSize: 'a4',
                format: 'pdf',
                source: 'external'
            })
        });

        if (!response1.ok) {
            const errorText = await response1.text();
            throw new Error(`Test 1 failed: ${response1.status}\n${errorText}`);
        }

        const pdf1Buffer = await response1.arrayBuffer();
        const pdf1Path = join(process.cwd(), 'key-metrics-7days.pdf');
        await writeFile(pdf1Path, Buffer.from(pdf1Buffer));

        console.log(`✅ Last 7 days report saved: ${pdf1Path}`);
        console.log(`   Size: ${(pdf1Buffer.byteLength / 1024).toFixed(2)} KB`);

        // Test 2: Last 30 days
        console.log('\n📊 Test 2: Generate report for last 30 days...');
        const startDate30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const response2 = await fetch(`${API_BASE}/api/reports/key-metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: startDate30.toISOString(),
                endDate: endDate.toISOString(),
                layout: 'landscape',
                pageSize: 'a4',
                format: 'pdf',
                source: 'external'
            })
        });

        if (!response2.ok) {
            const errorText = await response2.text();
            throw new Error(`Test 2 failed: ${response2.status}\n${errorText}`);
        }

        const pdf2Buffer = await response2.arrayBuffer();
        const pdf2Path = join(process.cwd(), 'key-metrics-30days.pdf');
        await writeFile(pdf2Path, Buffer.from(pdf2Buffer));

        console.log(`✅ Last 30 days report saved: ${pdf2Path}`);
        console.log(`   Size: ${(pdf2Buffer.byteLength / 1024).toFixed(2)} KB`);

        // Test 3: Vertical layout
        console.log('\n📊 Test 3: Generate vertical layout report...');

        const response3 = await fetch(`${API_BASE}/api/reports/key-metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                layout: 'portrait',  // Vertical
                pageSize: 'a4',
                format: 'pdf',
                source: 'external'
            })
        });

        if (!response3.ok) {
            const errorText = await response3.text();
            throw new Error(`Test 3 failed: ${response3.status}\n${errorText}`);
        }

        const pdf3Buffer = await response3.arrayBuffer();
        const pdf3Path = join(process.cwd(), 'key-metrics-vertical.pdf');
        await writeFile(pdf3Path, Buffer.from(pdf3Buffer));

        console.log(`✅ Vertical layout report saved: ${pdf3Path}`);
        console.log(`   Size: ${(pdf3Buffer.byteLength / 1024).toFixed(2)} KB`);

        // Test 4: HTML preview
        console.log('\n🌐 Test 4: Generate HTML preview...');

        const response4 = await fetch(`${API_BASE}/api/reports/key-metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                layout: 'landscape',
                format: 'html',
                source: 'external'
            })
        });

        if (!response4.ok) {
            const errorText = await response4.text();
            throw new Error(`Test 4 failed: ${response4.status}\n${errorText}`);
        }

        const htmlContent = await response4.text();
        const htmlPath = join(process.cwd(), 'key-metrics-preview.html');
        await writeFile(htmlPath, htmlContent);

        console.log(`✅ HTML preview saved: ${htmlPath}`);

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('🎉 All tests passed successfully!\n');
        console.log('📋 Generated files:');
        console.log('  1. key-metrics-7days.pdf (Horizontal, Last 7 days)');
        console.log('  2. key-metrics-30days.pdf (Horizontal, Last 30 days)');
        console.log('  3. key-metrics-vertical.pdf (Vertical, Last 7 days)');
        console.log('  4. key-metrics-preview.html (HTML preview)');
        console.log('\n✨ Ready for use from web page!');
        console.log('=' .repeat(70));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

testKeyMetricsFromWeb();

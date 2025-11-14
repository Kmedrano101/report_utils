# Test Template Usage Guide

## Overview

The `report_test.svg` template is a pre-designed A4 report layout created with Inkscape. It's located in `src/templates/svg/report_test.svg` and provides a professional, ready-to-use template for IoT reports.

## Template Details

- **File**: `src/templates/svg/report_test.svg`
- **Size**: A4 (210mm × 297mm)
- **Format**: SVG (Scalable Vector Graphics)
- **Created with**: Inkscape 1.2.2
- **File size**: ~529KB (789 lines)
- **Features**:
  - Pre-designed layout and graphics
  - Professional color scheme (green gradient theme)
  - Copyright symbol
  - Source attribution text

## How to Use

### From the Web UI

1. Navigate to the **Reports** tab
2. Select **"Test Template (report_test.svg)"** from the Report Type dropdown
3. Choose your desired output format (PDF or HTML)
4. Select date range (Start Date and End Date)
5. Optionally, select specific sensors to include
6. Click **"Generate Report"**

The report will be generated using the test template and downloaded automatically.

### Via API

**Endpoint**: `POST /api/reports/test-template`

**Request Body**:
```json
{
  "startDate": "2025-11-05T00:00:00Z",
  "endDate": "2025-11-12T23:59:59Z",
  "format": "pdf",
  "sensorIds": ["SENSOR-001", "SENSOR-002"]
}
```

**Response**: PDF binary data or HTML based on the `format` parameter

**Example with cURL**:
```bash
curl -X POST http://localhost:3000/api/reports/test-template \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-05T00:00:00Z",
    "endDate": "2025-11-12T23:59:59Z",
    "format": "pdf"
  }' \
  --output samples/reports/test-report.pdf
```

**Example with HTML format**:
```bash
curl -X POST http://localhost:3000/api/reports/test-template \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-05T00:00:00Z",
    "endDate": "2025-11-12T23:59:59Z",
    "format": "html"
  }' \
  --output test-report.html
```

## Architecture

### Backend Flow

```
User Request
    ↓
reportController.generateTestTemplateReport()
    ↓
iotDataService.getSensors() / getKPIs()
    ↓
svgTemplateService.generateTestReport()
    ↓
svgTemplateService.loadTemplate('report_test.svg')
    ↓
svgTemplateService.generateHtmlWithSvg()
    ↓
pdfGenerationService.generatePdfFromHtml()
    ↓
PDF Response
```

### Code Locations

| Component | File | Method |
|-----------|------|--------|
| Route | `src/routes/reportRoutes.js` | Line 13 |
| Controller | `src/controllers/reportController.js` | Lines 61-139 |
| Template Service | `src/services/svgTemplateService.js` | Lines 103-134 |
| UI Dropdown | `public/index.html` | Lines 425-430 |
| UI Handler | `public/js/app.js` | Lines 520-524 |

## Customization

### Current State

The template is returned as-is from the SVG file. It contains:
- Pre-designed graphics and layout
- Static text: "Source: CHAMELEON livestock collar"
- Green gradient color scheme
- Copyright symbol

### Adding Dynamic Data

To add dynamic data placeholders to the template:

1. **Edit the SVG file** (`src/templates/svg/report_test.svg`) using Inkscape or a text editor
2. **Add placeholder text** using the `{{placeholder}}` syntax:
   ```xml
   <text>{{report_title}}</text>
   <text>{{generation_date}}</text>
   <text>{{sensor_count}}</text>
   ```

3. **Update the service** to replace placeholders:
   ```javascript
   // In svgTemplateService.js
   async generateTestReport(reportData) {
       const template = await this.loadTemplate('report_test.svg');

       const data = {
           report_title: reportData.title,
           generation_date: new Date().toLocaleString(),
           sensor_count: reportData.sensors.length,
           // ... add more placeholders
       };

       return this.replacePlaceholders(template, data);
   }
   ```

### Adding Data Overlays

For complex data (tables, charts), you can add SVG groups dynamically:

```javascript
async generateTestReport(reportData) {
    let template = await this.loadTemplate('report_test.svg');

    // Generate sensor rows
    const sensorRows = this.generateSensorRows(reportData.sensors, 500);

    // Insert before closing </svg> tag
    template = template.replace('</svg>', `${sensorRows}</svg>`);

    return template;
}
```

## Output Formats

### PDF Output
- **Generated via**: Puppeteer (headless Chrome)
- **Page Size**: A4 (210mm × 297mm)
- **Orientation**: Portrait
- **DPI**: 300 (for print quality)
- **File naming**: `test-report-YYYY-MM-DD.pdf`

### HTML Output
- **Contains**: Full HTML page with embedded SVG
- **Includes**: Chart.js library for potential data visualization
- **Viewport**: Responsive, optimized for A4 print
- **Opens**: In new browser window/tab

## Performance

- **Template Caching**: Enabled by default
- **First Load**: ~50-100ms (loads from disk)
- **Subsequent Loads**: ~1-5ms (from memory cache)
- **PDF Generation**: ~1-3 seconds (depends on content complexity)
- **Database Queries**: ~100-500ms (depends on sensor count and date range)

## Troubleshooting

### Template Not Loading

**Error**: `Failed to load template: report_test.svg`

**Solutions**:
1. Verify file exists: `ls src/templates/svg/report_test.svg`
2. Check file permissions: `chmod 644 src/templates/svg/report_test.svg`
3. Clear template cache (restart server)

### PDF Generation Fails

**Error**: `PDF generation failed on server`

**Solutions**:
1. Check Puppeteer is initialized: `curl http://localhost:3000/health`
2. Verify sufficient memory (PDF generation uses ~100MB)
3. Check logs: `tail -f logs/app.log`

### Blank or Incomplete PDF

**Possible causes**:
1. SVG file too large (current: 529KB, limit: varies)
2. Missing fonts or resources
3. CORS issues with external resources

**Solutions**:
1. Optimize SVG file size (remove unused elements)
2. Embed fonts in SVG
3. Use local resources instead of external URLs

## Best Practices

1. **Template Design**: Keep SVG file size under 1MB for optimal performance
2. **Caching**: Use template caching in production (default: enabled)
3. **Data Volume**: Limit sensor data to fit within the page layout
4. **Testing**: Always test with both PDF and HTML formats
5. **Versioning**: Keep template versions if you make significant changes

## Future Enhancements

Potential improvements for the test template:

- [ ] Add placeholder replacement for dynamic text
- [ ] Add sensor data table overlay
- [ ] Add KPI metric cards
- [ ] Add time-series charts using Chart.js
- [ ] Add conditional sections based on data availability
- [ ] Add multi-page support for large datasets
- [ ] Add configurable color themes
- [ ] Add company logo placeholder

## Related Documentation

- [PDF Template README](PDF_TEMPLATE_README.md) - Main PDF system documentation
- [SVG Template Service](../src/services/svgTemplateService.js) - Service implementation
- [Report Controller](../src/controllers/reportController.js) - API endpoints
- [Inkscape Documentation](https://inkscape.org/doc/) - For SVG editing

## Support

For questions or issues with the test template:

1. Check server logs for detailed error messages
2. Verify template file integrity
3. Test with minimal data first
4. Review SVG structure in a text editor or Inkscape
5. Compare with working templates (e.g., `iot-summary-report.svg`)

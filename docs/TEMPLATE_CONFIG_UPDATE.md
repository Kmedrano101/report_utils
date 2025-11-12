# Template Configuration Update

## Overview

The PDF template configuration has been updated to use **Title** and **Subtitle** text inputs instead of color themes, and the logo URL option has been removed. The `report_test.svg` template now supports dynamic placeholders.

## Changes Made

### 1. UI Configuration (`public/index.html`)

**Removed:**
- ❌ Color Theme dropdown selector
- ❌ Logo URL input field

**Added:**
- ✅ **Report Title** text input (default: "IoT Sensor Summary Report")
- ✅ **Report Subtitle** text input (default: "Real-time monitoring and analytics")

**Kept:**
- ✅ Page Orientation (Portrait/Landscape)
- ✅ Page Size (A4/Letter/Legal)
- ✅ Footer Text

### 2. JavaScript Functions (`public/js/app.js`)

**Updated Functions:**

**`loadPDFConfig()`** - Lines 697-706
```javascript
// Now loads:
document.getElementById('pdfTitle').value = config.reportTitle || 'IoT Sensor Summary Report';
document.getElementById('pdfSubtitle').value = config.reportSubtitle || 'Real-time monitoring and analytics';

// Removed:
// - pdfTheme
// - pdfLogoUrl
```

**`savePDFConfig()`** - Lines 784-806
```javascript
// Now saves:
reportTitle: title || 'IoT Sensor Summary Report',
reportSubtitle: subtitle || 'Real-time monitoring and analytics',

// Logo disabled:
logo: { enabled: false, url: '/images/logo.png' }
```

**`previewPDFTemplate()`** - Lines 729-743
```javascript
// Now uses values from form inputs:
const title = document.getElementById('pdfTitle').value || 'IoT Sensor Summary Report';
const subtitle = document.getElementById('pdfSubtitle').value || 'Real-time monitoring and analytics';
```

**`generateReport()`** - Lines 521-533
```javascript
// For test-template, now sends configuration:
body.reportTitle = config.reportTitle || document.getElementById('pdfTitle')?.value;
body.reportSubtitle = config.reportSubtitle || document.getElementById('pdfSubtitle')?.value;
body.footerText = config.footer?.text || document.getElementById('pdfFooterText')?.value;
```

**Removed Functions:**
- ❌ `applyPDFTheme()` - No longer needed

### 3. PDF Configuration Module (`public/js/pdf-config.js`)

**Updated Default Config:**
```javascript
this.defaultConfig = {
    reportTitle: 'IoT Sensor Summary Report',        // NEW
    reportSubtitle: 'Real-time monitoring and analytics',  // NEW
    theme: 'professional-blue',                      // Kept for backward compatibility
    layout: 'portrait',
    pageSize: 'a4',
    // ...
    footer: {
        text: 'Madison - IoT Report'
    },
    logo: {
        enabled: false,                              // CHANGED: Disabled by default
        url: '/images/logo.png',
        position: 'left'
    }
}
```

### 4. SVG Template (`src/templates/svg/report_test.svg`)

**Added Placeholders:**
- `{{reportTitle}}` - Replaces "Source: CHAMELEON livestock collar" text (line ~460)

**Backup Created:**
- Original saved as: `src/templates/svg/report_test.svg.backup`

### 5. Template Service (`src/services/svgTemplateService.js`)

**Updated `generateTestReport()`** - Lines 108-172

**New Features:**
1. Accepts `title`, `subtitle`, and `footerText` parameters
2. Replaces placeholders in template using `replacePlaceholders()`
3. Adds text overlays for subtitle, footer, and generation date
4. Text overlays positioned at:
   - Subtitle: `x="105" y="40"` (centered, top)
   - Footer text: `x="10" y="290"` (bottom left)
   - Generation date: `x="200" y="290"` (bottom right)

**Example Usage:**
```javascript
const svgContent = await svgTemplateService.generateTestReport({
    title: 'My Custom Report Title',
    subtitle: 'My Custom Subtitle',
    footerText: 'Company Name - Report',
    startDate,
    endDate,
    sensors,
    kpis
});
```

### 6. Report Controller (`src/controllers/reportController.js`)

**Updated `generateTestTemplateReport()`** - Lines 94-110

**Now Extracts from Request Body:**
```javascript
const {
    reportTitle = 'IoT Sensor Summary Report',
    reportSubtitle = 'Real-time monitoring and analytics',
    footerText = 'Madison - IoT Report'
} = req.body;
```

**Passes to Template Service:**
```javascript
const svgContent = await svgTemplateService.generateTestReport({
    title: reportTitle,
    subtitle: reportSubtitle,
    footerText: footerText,
    startDate,
    endDate,
    sensors,
    kpis
});
```

## Configuration Flow

```
User Input (UI)
    ↓
Title: pdfTitle (input field)
Subtitle: pdfSubtitle (input field)
Footer: pdfFooterText (input field)
    ↓
savePDFConfig() → PDFConfig.updateConfig()
    ↓
Stored in: window.pdfConfig & localStorage
    ↓
generateReport() → API Request
    ↓
POST /api/reports/test-template
{
    reportTitle: "...",
    reportSubtitle: "...",
    footerText: "..."
}
    ↓
reportController.generateTestTemplateReport()
    ↓
svgTemplateService.generateTestReport()
    ↓
1. replacePlaceholders(template, data)
   - Replaces {{reportTitle}} in SVG
2. Add text overlays for subtitle and footer
    ↓
PDF Generated with Custom Text
```

## Usage

### From Web UI

1. Navigate to **Reports** tab
2. Click on **Template Configuration** section
3. Enter your custom values:
   - **Report Title**: Main heading for the report
   - **Report Subtitle**: Secondary heading below title
   - **Page Orientation**: Portrait or Landscape
   - **Page Size**: A4, Letter, or Legal
   - **Footer Text**: Company name or custom text
4. Click **"Save Configuration"**
5. Click **"Preview Template"** to see changes
6. Select **"Test Template (report_test.svg)"** from Report Type
7. Click **"Generate Report"**

### Configuration Storage

Settings are saved in:
- **Browser**: `localStorage` (key: `pdfConfig`)
- **Session**: `window.pdfConfig` object

### Default Values

```javascript
{
    reportTitle: 'IoT Sensor Summary Report',
    reportSubtitle: 'Real-time monitoring and analytics',
    layout: 'portrait',
    pageSize: 'a4',
    footer: {
        text: 'Madison - IoT Report'
    }
}
```

## API Changes

### Request Body

**Before:**
```json
{
    "startDate": "2025-11-05T00:00:00Z",
    "endDate": "2025-11-12T23:59:59Z",
    "format": "pdf"
}
```

**After (Test Template):**
```json
{
    "startDate": "2025-11-05T00:00:00Z",
    "endDate": "2025-11-12T23:59:59Z",
    "format": "pdf",
    "reportTitle": "My Custom Title",
    "reportSubtitle": "My Custom Subtitle",
    "footerText": "Company - Report Name"
}
```

## Text Overlay Positioning

The SVG coordinate system for A4 (210mm × 297mm):

```
(0,0) ┌────────────────────────────┐ (210,0)
      │                            │
      │  Subtitle (105, 40)        │
      │  ↓ Centered top            │
      │                            │
      │                            │
      │  [Report Content]          │
      │                            │
      │                            │
      │  Footer (10, 290) ← →      │
      │  Date (200, 290)           │
(0,297)└────────────────────────────┘ (210,297)
```

**Font Sizes:**
- Subtitle: 6pt (visible but not overwhelming)
- Footer text: 4pt (standard footer size)
- Generation date: 4pt

**Colors:**
- Subtitle: `#666666` (medium gray)
- Footer: `#333333` (dark gray)

## Backward Compatibility

The following are maintained for compatibility:
- `theme` property (stored but not used for test template)
- `logo.url` property (stored but logo disabled)
- Color theme configurations (available for other templates)

## Testing

### Manual Testing Steps

1. **Configure Title/Subtitle**:
   - Enter custom title: "Environmental Monitoring"
   - Enter custom subtitle: "Quarterly Report Q4 2025"
   - Save configuration

2. **Generate Preview**:
   - Click "Preview Template"
   - Verify title and subtitle appear correctly

3. **Generate PDF**:
   - Select "Test Template (report_test.svg)"
   - Set date range
   - Click "Generate Report"
   - Open PDF and verify:
     - Title appears in designated area
     - Subtitle appears centered at top
     - Footer text appears at bottom left
     - Generation date appears at bottom right

4. **Test Defaults**:
   - Click "Reset" button
   - Verify default values restored
   - Generate report with defaults

### Automated Testing

```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/reports/test-template \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-05T00:00:00Z",
    "endDate": "2025-11-12T23:59:59Z",
    "format": "pdf",
    "reportTitle": "Test Report Title",
    "reportSubtitle": "Test Subtitle",
    "footerText": "Test Company - Test Report"
  }' \
  --output test-output.pdf

# Verify PDF was generated
file test-output.pdf
# Should output: test-output.pdf: PDF document...
```

## Migration Guide

If you have existing saved configurations:

1. **Automatic Migration**: The system will use default title/subtitle if not present
2. **No Data Loss**: Existing settings (layout, pageSize, footer) are preserved
3. **Theme Settings**: Kept for backward compatibility with other templates

**No manual migration needed** - the system handles missing properties gracefully.

## Troubleshooting

### Title/Subtitle Not Appearing

**Problem**: Generated PDF doesn't show custom title/subtitle

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify values are saved: `localStorage.getItem('pdfConfig')`
3. Clear localStorage and reconfigure
4. Check server logs for template generation errors

### Text Overlapping

**Problem**: Text overlays overlap with template graphics

**Solutions**:
1. Adjust positions in `svgTemplateService.js` (lines 136-155)
2. Modify font sizes
3. Use different colors for better contrast
4. Edit `report_test.svg` to create text-safe areas

### Configuration Not Persisting

**Problem**: Settings reset after page reload

**Solutions**:
1. Check browser localStorage is enabled
2. Verify no browser errors blocking localStorage access
3. Check for private/incognito mode (may restrict storage)
4. Clear browser cache and retry

## Future Enhancements

Potential improvements:

- [ ] Add font family selector for title/subtitle
- [ ] Add font size controls
- [ ] Add text color pickers
- [ ] Add text alignment options (left/center/right)
- [ ] Support multi-line subtitles
- [ ] Add header text option (separate from title)
- [ ] Add page numbering configuration
- [ ] Add custom date format options

## Related Documentation

- [Test Template Usage Guide](TEST_TEMPLATE_USAGE.md)
- [PDF Template README](PDF_TEMPLATE_README.md)
- [SVG Template Service](../src/services/svgTemplateService.js)
- [PDF Configuration Module](../public/js/pdf-config.js)

## Support

For issues or questions:
1. Check browser console for errors
2. Review server logs: `tail -f logs/app.log`
3. Test with default configuration
4. Verify template file exists: `src/templates/svg/report_test.svg`
5. Check API response: Test endpoint with cURL

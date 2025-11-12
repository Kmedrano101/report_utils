# Quick Start Guide - Madison PDF Templates

## What's New

Your PDF reports now feature a professional Madison-branded layout:

```
┌────────────────────────────────────────────────────┐
│  ████████████████████████████████████████████████  │
│  ██  [LOGO]  IoT Report                        ██  │
│  ██           Environmental Monitoring         ██  │
│  ████████████████████████████████████████████████  │
│                                                    │
│  [White Background Content]                        │
│  • Metrics, tables, charts                         │
│  • Sensor data and statistics                      │
│                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Madison - IoT Report     Jan 15, 2025 2:30 PM    │
└────────────────────────────────────────────────────┘
```

## Getting Started (3 Steps)

### 1. Preview the Template (1 minute)
1. Open your app: `http://localhost:3000`
2. Go to **Reports** tab
3. Click **"Preview Template"** button
4. A new window opens showing sample report with Madison branding

### 2. Customize (Optional)
In the Template Configuration section:
- **Footer Text**: Change "Madison - IoT Report" to your project name
- **Logo URL**: Use `/images/logo.png` (already configured)
- **Color Theme**: Select from 6 professional themes
- **Orientation**: Choose Portrait or Landscape

Click **"Save Configuration"** when done.

### 3. Generate Reports
- Select report type and date range
- Click **"Generate & Download Report"**
- Your PDF will have the new Madison layout!

## Key Features

✅ **Black header** with white text and logo
✅ **White background** for entire page
✅ **Footer with line separator**
✅ **Company name** on left: "Madison - xxx"
✅ **Auto timestamp** on right: "Jan 15, 2025 2:30 PM"
✅ **6 color themes** for content accents
✅ **Configurable** via UI or code

## Files Created

**Documentation:**
- `PDF_TEMPLATE_README.md` - Complete API guide (350+ lines)
- `PDF_LAYOUT_GUIDE.md` - Visual layout reference
- `IMPLEMENTATION_SUMMARY.md` - Detailed implementation notes
- `QUICK_START.md` - This file

**CSS Modules (in `/public/css/`):**
- `pdf-colors.css` - 6 color themes
- `pdf-layout.css` - Layout system with new header/footer
- `pdf-typography.css` - Text styling
- `pdf-components.css` - Reusable UI components

**JavaScript Modules (in `/public/js/`):**
- `pdf-config.js` - Configuration management
- `pdf-utils.js` - Utility functions  
- `pdf-template-engine.js` - Template rendering
- `pdf-generator.js` - PDF generation coordinator
- `app.js` - Updated with PDF configuration functions

**Assets:**
- `/public/images/logo.png` - Madison logo

**Updated:**
- `/public/index.html` - Added Template Configuration UI

## Quick Customization Examples

### Change Footer Text
```javascript
// Via UI: Reports tab > Template Configuration > Footer Text
// Or via console:
window.pdfGenerator.updateConfig({
    footer: { text: 'Madison - Building A' }
});
```

### Change Color Theme
```javascript
// Via UI: Select from dropdown
// Or via console:
window.pdfGenerator.applyTheme('corporate-green');
```

### Switch to Landscape
```javascript
// Via UI: Page Orientation dropdown
// Or via console:
window.pdfGenerator.updateConfig({ layout: 'landscape' });
```

## Default Configuration

```javascript
{
    theme: 'professional-blue',
    layout: 'portrait',
    pageSize: 'a4',
    footer: {
        text: 'Madison - IoT Report'
    },
    logo: {
        enabled: true,
        url: '/images/logo.png'
    }
}
```

## What Changed

### Header (Now Black with Logo)
**Before:** Colored header, no logo
**After:** Black background, white text, logo on right

### Footer (Now Structured)
**Before:** Simple centered text
**After:** Line separator, company name left, timestamp right

### Background (Now Pure White)
**Before:** Themed background colors
**After:** White background for all content

## Testing Checklist

- [ ] Click "Preview Template" - opens new window
- [ ] Check header is black with white text
- [ ] Verify logo appears on right side
- [ ] Content area is white background
- [ ] Footer has black line separator
- [ ] Footer shows "Madison - xxx" on left
- [ ] Footer shows current date/time on right
- [ ] Try different color themes
- [ ] Test landscape orientation
- [ ] Generate actual PDF report

## Need Help?

1. **Quick Reference**: See `IMPLEMENTATION_SUMMARY.md`
2. **Layout Guide**: See `PDF_LAYOUT_GUIDE.md`
3. **Full Documentation**: See `PDF_TEMPLATE_README.md`
4. **API Details**: All modules documented in README
5. **Browser Console**: Check for error messages

## Tips

💡 Always click "Save Configuration" after changes
💡 Use "Preview" to test before generating PDFs
💡 Logo works best at 150-195px width (30% larger)
💡 Keep footer text under 30 characters
💡 Refresh page if configuration doesn't load

---

**Ready to use!** Go to Reports tab and click "Preview Template" to see your new Madison-branded reports.

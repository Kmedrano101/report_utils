# PDF Template System Documentation

## Overview

The IoT Report Utils now includes a comprehensive, modular PDF template system that allows you to create beautifully styled, configurable PDF reports with:

- **6 Color Themes**: Professional Blue, Corporate Green, Modern Purple, Tech Orange, Monochrome, and Dark Mode
- **Flexible Layouts**: Portrait (vertical) and Landscape (horizontal) orientations
- **Multiple Page Sizes**: A4, Letter, and Legal
- **Modular Architecture**: Separated CSS and JavaScript modules for easy customization
- **Template Engine**: Dynamic template rendering with variables, conditionals, and loops
- **Reusable Components**: Pre-built UI components (cards, tables, metrics, charts, etc.)

## File Structure

```
public/
├── css/
│   ├── styles.css              # Main application styles
│   ├── pdf-colors.css          # Color themes and palettes
│   ├── pdf-layout.css          # Layout systems (portrait/landscape)
│   ├── pdf-typography.css      # Text styles and fonts
│   └── pdf-components.css      # UI components (cards, tables, etc.)
├── js/
│   ├── app.js                  # Main application logic
│   ├── pdf-config.js           # Configuration management
│   ├── pdf-utils.js            # Utility functions
│   ├── pdf-template-engine.js  # Template rendering engine
│   └── pdf-generator.js        # PDF generation coordinator
└── index.html                  # Main HTML file
```

## Quick Start

### 1. Using the Configuration UI

Navigate to the **Reports** tab in the web interface to access the Template Configuration section:

1. **Select Color Theme**: Choose from 6 pre-built themes
2. **Choose Page Orientation**: Portrait (vertical) or Landscape (horizontal)
3. **Select Page Size**: A4, Letter, or Legal
4. **Preview**: Click "Preview Template" to see your configuration with sample data
5. **Save**: Click "Save Configuration" to persist your settings

### 2. Generating Reports

After configuring your template:

1. Select your report type (IoT Summary, Sensor Detailed, etc.)
2. Choose date range and sensors
3. Click "Generate & Download Report"
4. The report will use your configured theme and layout

## Module Documentation

### 1. PDF Colors Module (`pdf-colors.css`)

Defines color themes and palettes for reports.

#### Available Themes

```css
/* Professional Blue (Default) */
professional-blue

/* Corporate Green */
corporate-green

/* Modern Purple */
modern-purple

/* Tech Orange */
tech-orange

/* Monochrome */
monochrome

/* Dark Mode */
dark
```

#### Using Colors in Templates

```html
<!-- Background colors -->
<div class="pdf-bg-primary">Primary background</div>
<div class="pdf-bg-accent">Accent background</div>

<!-- Text colors -->
<p class="pdf-text-primary">Primary text</p>
<p class="pdf-text-brand">Brand colored text</p>
<p class="pdf-text-success">Success message</p>

<!-- Status colors -->
<span class="pdf-text-danger">Error text</span>
<span class="pdf-bg-info">Info background</span>
```

### 2. PDF Layout Module (`pdf-layout.css`)

Handles page layouts and orientations.

#### Layout Classes

```html
<!-- Portrait Layout -->
<div class="pdf-container pdf-layout-portrait">
    <div class="pdf-page">
        <!-- Content -->
    </div>
</div>

<!-- Landscape Layout -->
<div class="pdf-container pdf-layout-landscape">
    <div class="pdf-page">
        <!-- Content -->
    </div>
</div>
```

#### Grid Systems

```html
<!-- 2 Column Grid -->
<div class="pdf-grid pdf-grid-2">
    <div>Column 1</div>
    <div>Column 2</div>
</div>

<!-- 3 Column Grid -->
<div class="pdf-grid pdf-grid-3">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
</div>

<!-- Auto-responsive Grid -->
<div class="pdf-grid pdf-grid-auto">
    <!-- Adapts based on orientation -->
</div>
```

### 3. PDF Typography Module (`pdf-typography.css`)

Text styles and font configurations.

#### Headings

```html
<h1 class="pdf-h1">Main Heading</h1>
<h2 class="pdf-h2">Section Heading</h2>
<h3 class="pdf-h3">Subsection Heading</h3>

<!-- With accent color -->
<h1 class="pdf-h1 pdf-heading-accent">Colored Heading</h1>

<!-- With underline -->
<h2 class="pdf-h2 pdf-heading-underline">Underlined Heading</h2>
```

#### Text Styles

```html
<!-- Text sizes -->
<p class="pdf-text-lg">Large text</p>
<p class="pdf-text">Normal text</p>
<p class="pdf-text-sm">Small text</p>

<!-- Text weights -->
<span class="pdf-text-bold">Bold</span>
<span class="pdf-text-semibold">Semi-bold</span>

<!-- Text alignment -->
<p class="pdf-text-center">Centered</p>
<p class="pdf-text-right">Right-aligned</p>
```

### 4. PDF Components Module (`pdf-components.css`)

Reusable UI components.

#### Cards

```html
<div class="pdf-card">
    <div class="pdf-card-header">Card Title</div>
    <div class="pdf-card-body">
        Card content goes here
    </div>
    <div class="pdf-card-footer">Footer text</div>
</div>
```

#### Metrics/KPIs

```html
<div class="pdf-metric">
    <div class="pdf-metric-label">Temperature</div>
    <div class="pdf-metric-value">
        23.5<span class="pdf-metric-unit">°C</span>
    </div>
    <div class="pdf-metric-change pdf-metric-change-positive">
        +2.3%
    </div>
</div>
```

#### Tables

```html
<table class="pdf-table pdf-table-striped">
    <thead>
        <tr>
            <th>Column 1</th>
            <th>Column 2</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Data 1</td>
            <td>Data 2</td>
        </tr>
    </tbody>
</table>
```

#### Status Indicators

```html
<span class="pdf-status pdf-status-success">
    <span class="pdf-status-dot"></span>
    Active
</span>

<span class="pdf-status pdf-status-warning">
    <span class="pdf-status-dot"></span>
    Warning
</span>
```

## JavaScript API

### PDFConfig Class

Manages PDF configuration and themes.

```javascript
// Get current configuration
const config = window.pdfConfig.getConfig();

// Apply a theme
window.pdfConfig.applyTheme('modern-purple');

// Update configuration
window.pdfConfig.updateConfig({
    layout: 'landscape',
    pageSize: 'letter',
    margins: { top: 15, right: 15, bottom: 15, left: 15 }
});

// Get available themes
const themes = window.pdfConfig.getThemes();

// Reset to defaults
window.pdfConfig.resetToDefault();

// Export/Import configuration
const json = window.pdfConfig.exportConfig();
window.pdfConfig.importConfig(json);
```

### PDFUtils

Utility functions for formatting and data manipulation.

```javascript
// Date formatting
PDFUtils.formatDate(new Date(), 'long');
// => "January 15, 2025"

// Number formatting
PDFUtils.formatNumber(1234.56, 2, '°C');
// => "1234.56 °C"

// Large numbers
PDFUtils.formatLargeNumber(1500000);
// => "1.50M"

// Percentage
PDFUtils.formatPercentage(0.856, true);
// => "85.60%"

// Statistics
const stats = PDFUtils.calculateStats([1, 2, 3, 4, 5]);
// => { min: 1, max: 5, mean: 3, median: 3, sum: 15 }

// Color manipulation
PDFUtils.lightenColor('#2563eb', 20);
PDFUtils.darkenColor('#2563eb', 20);
```

### PDFTemplateEngine

Template rendering with variables, conditionals, and loops.

```javascript
const engine = new PDFTemplateEngine();

// Register template
engine.registerTemplate('myReport', `
    <h1>{{title}}</h1>
    {{#if showSummary}}
        <p>{{summary}}</p>
    {{/if}}
    {{#each items}}
        <div>{{this.name}}: {{this.value}}</div>
    {{/each}}
`);

// Render template
const html = engine.render('myReport', {
    title: 'My Report',
    showSummary: true,
    summary: 'This is a summary',
    items: [
        { name: 'Item 1', value: 100 },
        { name: 'Item 2', value: 200 }
    ]
});
```

#### Template Syntax

```handlebars
<!-- Variables -->
{{variableName}}
{{nested.property}}

<!-- Conditionals -->
{{#if condition}}
    Content if true
{{else}}
    Content if false
{{/if}}

<!-- Loops -->
{{#each arrayName}}
    {{this.property}}
    {{index}} - Current index
    {{first}} - True if first item
    {{last}} - True if last item
{{/each}}

<!-- Helpers -->
{{formatDate date 'long'}}
{{formatNumber value 2}}
{{formatPercentage percent}}

<!-- Partials -->
{{> partialName}}
```

### PDFGenerator

Coordinate PDF generation.

```javascript
// Generate IoT summary report
await window.pdfGenerator.generateIoTSummary({
    reportTitle: 'Monthly IoT Summary',
    reportSubtitle: 'January 2025',
    period: 'Jan 1 - Jan 31, 2025',
    metrics: [...],
    sensors: [...]
});

// Generate sensor detailed report
await window.pdfGenerator.generateSensorDetailed({
    sensorName: 'Temperature Sensor A1',
    sensorCode: 'TEMP-A1',
    location: 'Room 101',
    stats: {...},
    readings: [...]
});

// Custom generation
await window.pdfGenerator.generate({
    template: 'custom-template',
    data: {...},
    format: 'pdf', // or 'html'
    filename: 'my-report.pdf',
    download: true
});

// Preview without download
await window.pdfGenerator.preview({
    template: 'iot-summary',
    data: {...}
});
```

## Creating Custom Templates

### 1. Register a New Template

```javascript
window.pdfGenerator.registerTemplate('custom-report', `
    <div class="pdf-container pdf-layout-{{layout}}">
        <div class="pdf-page">
            <header class="pdf-header">
                <h1 class="pdf-h1 pdf-text-brand">{{title}}</h1>
            </header>

            <section class="pdf-section">
                <h2 class="pdf-title-section">{{sectionTitle}}</h2>
                <div class="pdf-metrics-row">
                    {{#each metrics}}
                    <div class="pdf-metric">
                        <div class="pdf-metric-label">{{this.label}}</div>
                        <div class="pdf-metric-value">{{this.value}}</div>
                    </div>
                    {{/each}}
                </div>
            </section>

            <footer class="pdf-footer">
                <div>{{footerText}}</div>
            </footer>
        </div>
    </div>
`);
```

### 2. Use Your Custom Template

```javascript
await window.pdfGenerator.generate({
    template: 'custom-report',
    data: {
        title: 'Custom Report Title',
        sectionTitle: 'Key Metrics',
        metrics: [
            { label: 'Metric 1', value: '100' },
            { label: 'Metric 2', value: '200' }
        ],
        footerText: 'My Custom Footer'
    }
});
```

## Customization Guide

### Adding a New Color Theme

Edit `public/css/pdf-colors.css`:

```css
/* My Custom Theme */
:root[data-pdf-theme="my-theme"],
.pdf-theme-my-theme {
    --pdf-primary: #your-color;
    --pdf-secondary: #your-color;
    --pdf-accent: #your-color;
    /* ... other colors */
}
```

Register in `pdf-config.js`:

```javascript
'my-theme': {
    name: 'My Custom Theme',
    description: 'My custom color scheme',
    colors: {
        primary: '#your-color',
        secondary: '#your-color',
        accent: '#your-color'
    }
}
```

### Adding Custom Components

Edit `public/css/pdf-components.css`:

```css
.pdf-my-component {
    /* Your styles */
}
```

Use in templates:

```html
<div class="pdf-my-component">
    Custom component content
</div>
```

### Adding Custom Utilities

Edit `public/js/pdf-utils.js`:

```javascript
PDFUtils.myCustomFunction = function(value) {
    // Your logic
    return result;
};
```

## Best Practices

1. **Use Semantic Classes**: Prefer component classes over direct styling
2. **Keep Templates Simple**: Break complex templates into partials
3. **Test Multiple Themes**: Ensure your templates work with all themes
4. **Consider Print**: Use `page-break-inside: avoid` for important sections
5. **Optimize Images**: Compress images before including in PDFs
6. **Use Variables**: Let the template engine handle dynamic content
7. **Mobile Preview**: Test HTML output on different screen sizes

## Troubleshooting

### Template Not Rendering

- Check that all variables in template exist in data object
- Verify template syntax (closing tags, brackets)
- Check browser console for errors

### Colors Not Applying

- Ensure `data-pdf-theme` attribute is set correctly
- Verify CSS files are loaded in correct order
- Check that color variables are defined in theme

### Layout Issues

- Verify layout class is applied to container
- Check page size matches configuration
- Test with print preview

## Examples

See the built-in templates for reference:
- `PDFTemplateEngine.createIoTSummaryTemplate()`
- `PDFTemplateEngine.createSensorDetailedTemplate()`

## Support

For issues or questions:
1. Check this documentation
2. Review the example templates
3. Inspect browser console for errors
4. Check network tab for API errors

---

**Version**: 1.0.0
**Last Updated**: 2025-01-11
**Author**: Tidop IoT Report Utils

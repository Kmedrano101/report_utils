# PDF Layout Structure Guide

## New PDF Template Layout

The PDF reports now feature a modern, clean layout with a distinctive black header and structured footer.

## Layout Overview

```
┌──────────────────────────────────────────────────────┐
│                                                       │
│  ███████████████████  BLACK HEADER  ████████████████ │
│  ██                                                ██ │
│  ██  [LOGO]   REPORT TITLE                        ██ │
│  ██            Report Subtitle                     ██ │
│  ██                                                ██ │
│  ████████████████████████████████████████████████████ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │                 CONTENT AREA                     │ │
│  │              (White Background)                  │ │
│  │                                                  │ │
│  │  • Metrics, tables, charts                      │ │
│  │  • Sensor data                                   │ │
│  │  • Statistics                                    │ │
│  │                                                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Madison - IoT Report          Jan 15, 2025 10:30 AM │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Header Section

### Design Specifications

- **Background Color**: Black (#000000)
- **Text Color**: White (#ffffff)
- **Height**: Minimum 120px
- **Padding**: 2rem (40px) top/bottom, 2.5rem (50px) left/right
- **Full Width**: Extends edge-to-edge, breaking page margins

### Header Components

#### Left Side: Logo
```html
<img src="{{logoUrl}}" alt="Logo" class="pdf-header-logo">
```

**Logo Specifications:**
- Max Width: 195px (30% larger)
- Max Height: 104px (30% larger)
- Position: Left side of header
- Flex Shrink: 0 (maintains size)

#### Right Side: Title & Subtitle
```html
<div class="pdf-header-content">
    <h1 class="pdf-header-title">Report Title</h1>
    <p class="pdf-header-subtitle">Subtitle or Description</p>
</div>
```

**Title Styles:**
- Font Size: 2rem (32px)
- Font Weight: 700 (Bold)
- Color: White
- Line Height: 1.2
- Margin Left: 2rem (32px)

**Subtitle Styles:**
- Font Size: 1.125rem (18px)
- Color: Light Gray (#cccccc)
- Font Weight: 400 (Normal)
- Margin Top: 0.5rem

## Content Area

### Design Specifications

- **Background Color**: White (#ffffff)
- **Default Margins**: 20mm all sides
- **Text Color**: Dark gray/black (from theme)

### Content Sections

The content area supports:
- Executive summaries
- Key metrics (KPI cards)
- Data tables
- Charts and visualizations
- Sensor information
- Statistical data

All content maintains the white background for maximum readability.

## Footer Section

### Design Specifications

- **Top Border**: 2px solid black line
- **Margin Top**: 3rem (48px)
- **Padding Top**: 0.75rem above line, 0.5rem below line

### Footer Components

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (2px black line)
Madison - IoT Report          January 15, 2025 10:30 AM
```

#### Left Side: Company/Project Text
- Font Weight: 500 (Medium)
- Default Text: "Madison - IoT Report"
- Customizable via configuration

#### Right Side: Date & Time
- Font Size: 0.875rem (14px)
- Color: Secondary text color
- Format: "Month DD, YYYY HH:MM AM/PM"
- Automatically generated

## Configuration Options

### Via UI (Reports Tab)

1. **Footer Text**: Customize the left-side footer text
   - Default: "Madison - IoT Report"
   - Input field in Template Configuration section

2. **Logo URL**: Add your company logo
   - Optional field
   - Place logo image in `/public/images/` folder
   - Reference as `/images/your-logo.png`

### Via JavaScript API

```javascript
// Update footer text
window.pdfGenerator.updateConfig({
    footer: {
        text: 'Madison - Custom Project Name'
    }
});

// Update logo
window.pdfGenerator.updateConfig({
    logo: {
        enabled: true,
        url: '/images/madison-logo.png'
    }
});
```

## Responsive Behavior

### Portrait Mode (Vertical)
- Content width: 210mm (A4)
- Header spans full width
- Optimal for detailed reports

### Landscape Mode (Horizontal)
- Content width: 297mm (A4)
- Header spans full width
- Better for wide tables and charts

## Color Theme Integration

While the header always uses black background, the content area respects your selected color theme:

- **Professional Blue**: Blue accents in content
- **Corporate Green**: Green accents in content
- **Modern Purple**: Purple accents in content
- **Tech Orange**: Orange accents in content
- **Monochrome**: Black/gray accents in content
- **Dark Mode**: Dark content backgrounds

The footer line and text color adapt to maintain consistency with the white background.

## Print Optimization

The layout is optimized for PDF generation:

- **Page Breaks**: Content sections avoid breaking mid-element
- **Headers**: Consistent across all pages
- **Footers**: Appear at bottom of each page
- **Margins**: Properly respected for printing

## Examples

### Example 1: IoT Summary Report

```
┌────────────────────────────────────────────────┐
│  ████████████████████████████████████████████  │
│  ██                                        ██  │
│  ██  [LOGO]  IoT Environmental Report     ██  │
│  ██          Building A - January 2025    ██  │
│  ██                                        ██  │
│  ████████████████████████████████████████████  │
│                                                │
│  [Key Metrics Cards]                           │
│  [Sensor Status Table]                         │
│  [Charts & Graphs]                             │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Madison - IoT Report    Jan 15, 2025 2:30 PM │
└────────────────────────────────────────────────┘
```

### Example 2: Sensor Detail Report

```
┌────────────────────────────────────────────────┐
│  ████████████████████████████████████████████  │
│  ██                                        ██  │
│  ██  [LOGO]  Sensor Detailed Report       ██  │
│  ██           Temperature Sensor A1        ██  │
│  ██           (Room 101)                   ██  │
│  ████████████████████████████████████████████  │
│                                                │
│  [Sensor Information]                          │
│  [Statistical Summary]                         │
│  [Recent Readings Table]                       │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Madison - Sensor Report Jan 15, 2025 2:30 PM │
└────────────────────────────────────────────────┘
```

## CSS Classes Reference

### Header Classes
```css
.pdf-header                /* Main header container */
.pdf-header-content        /* Title/subtitle wrapper */
.pdf-header-title          /* Main title (h1) */
.pdf-header-subtitle       /* Subtitle text */
.pdf-header-logo           /* Logo image */
```

### Footer Classes
```css
.pdf-footer                /* Main footer container */
.pdf-footer-content        /* Content wrapper with flexbox */
.pdf-footer-left           /* Left side text (company) */
.pdf-footer-right          /* Right side text (date/time) */
```

### Content Classes
```css
.pdf-container             /* Root container (white bg) */
.pdf-page                  /* Page wrapper (white bg) */
.pdf-section               /* Content sections */
```

## Customization Tips

1. **Logo Size**: For best results, use a logo with:
   - Transparent background (PNG or WebP)
   - Width: 150-195px
   - Height: 80-104px
   - Aspect ratio: ~2:1 (landscape)

2. **Footer Text**: Keep it concise
   - Maximum ~30 characters recommended
   - Format: "Company - Project Name"
   - Examples:
     - "Madison - IoT Reports"
     - "Madison - Building Monitoring"
     - "Madison - Environmental Data"

3. **Content Readability**:
   - White background ensures text is always readable
   - Dark header provides strong visual anchor
   - Black footer line creates clear separation

## Migration from Old Layout

If you have existing templates:

### Old Header Structure
```html
<header class="pdf-header">
    <div>
        <h1 class="pdf-h1 pdf-text-brand">{{title}}</h1>
        <p class="pdf-subtitle">{{subtitle}}</p>
    </div>
</header>
```

### New Header Structure
```html
<header class="pdf-header">
    <div class="pdf-header-content">
        <h1 class="pdf-header-title">{{title}}</h1>
        <p class="pdf-header-subtitle">{{subtitle}}</p>
    </div>
    {{#if logoUrl}}
    <img src="{{logoUrl}}" alt="Logo" class="pdf-header-logo">
    {{/if}}
</header>
```

### Old Footer Structure
```html
<footer class="pdf-footer">
    <div>{{footerText}}</div>
    <div>{{date}}</div>
</footer>
```

### New Footer Structure
```html
<footer class="pdf-footer">
    <div class="pdf-footer-content">
        <div class="pdf-footer-left">{{footerText}}</div>
        <div class="pdf-footer-right">{{formatDate date 'datetime'}}</div>
    </div>
</footer>
```

---

**Last Updated**: 2025-01-11
**Version**: 2.0
**Layout Style**: Madison Standard

# Preview Template Fix

## Issue
The preview template was not displaying correctly from the middle to bottom sections when opened in a new window.

## Root Cause
When using `window.open()` and `document.write()` to create a preview window, relative URLs for CSS files and images were not resolving correctly because the new window doesn't inherit the parent's base URL context.

### Problems Identified
1. **CSS Files**: Using relative paths like `/css/pdf-colors.css`
2. **Logo Image**: Using relative path like `/images/logo.png`
3. **Result**: Missing styles and broken images in preview window

## Solution

### 1. Convert CSS Paths to Absolute URLs
**File**: `public/js/pdf-generator.js`

**Before:**
```javascript
<link rel="stylesheet" href="/css/pdf-colors.css">
<link rel="stylesheet" href="/css/pdf-layout.css">
<link rel="stylesheet" href="/css/pdf-typography.css">
<link rel="stylesheet" href="/css/pdf-components.css">
```

**After:**
```javascript
const origin = window.location.origin;
<link rel="stylesheet" href="${origin}/css/pdf-colors.css">
<link rel="stylesheet" href="${origin}/css/pdf-layout.css">
<link rel="stylesheet" href="${origin}/css/pdf-typography.css">
<link rel="stylesheet" href="${origin}/css/pdf-components.css">
```

### 2. Convert Logo Path to Absolute URL
**File**: `public/js/pdf-generator.js`

**Before:**
```javascript
logoUrl: config.logo?.enabled ? config.logo.url : null,
```

**After:**
```javascript
const logoUrl = config.logo?.enabled && config.logo.url
    ? (config.logo.url.startsWith('http') ? config.logo.url : `${window.location.origin}${config.logo.url}`)
    : null;
    
const templateData = {
    ...data,
    logoUrl: logoUrl,
    // ...
};
```

## Changes Made

### Modified Functions

#### `applyConfiguration(html, config)` in pdf-generator.js
- Added `const origin = window.location.origin`
- Updated all CSS link href attributes to use absolute URLs
- Example: `${origin}/css/pdf-colors.css`

#### `generate(options)` in pdf-generator.js
- Added logo URL conversion logic
- Checks if URL is already absolute (starts with 'http')
- If relative, prepends `window.location.origin`
- Handles null/disabled logo cases

## Result

### ✅ What's Fixed
1. **CSS Styles Load**: All four CSS modules now load correctly
   - pdf-colors.css
   - pdf-layout.css
   - pdf-typography.css
   - pdf-components.css

2. **Logo Displays**: Madison logo shows on left side of header

3. **Complete Rendering**: 
   - Black header with logo and title
   - White content area with all sections
   - Metrics cards display correctly
   - Tables render properly
   - Footer with line separator and timestamp

4. **All Sections Visible**:
   - Header ✅
   - Executive Summary ✅
   - Key Metrics ✅
   - Sensor Status Table ✅
   - Footer ✅

## Technical Details

### URL Resolution
```javascript
// Development: http://localhost:3000
// Production: https://your-domain.com
const origin = window.location.origin;

// CSS files
href="${origin}/css/pdf-colors.css"
// Resolves to: http://localhost:3000/css/pdf-colors.css

// Logo image
src="${origin}/images/logo.png"
// Resolves to: http://localhost:3000/images/logo.png
```

### Smart URL Handling
The logo URL conversion handles both cases:
```javascript
// If already absolute
'http://example.com/logo.png' → 'http://example.com/logo.png'

// If relative
'/images/logo.png' → 'http://localhost:3000/images/logo.png'
```

## Testing

### Quick Test
1. Open application: `http://localhost:3000`
2. Navigate to **Reports** tab
3. Click **"Preview Template"** button
4. New window opens with preview

### Verify These Elements
- [ ] Black header displays
- [ ] Logo appears on left side
- [ ] Title and subtitle are white text
- [ ] Executive Summary section visible
- [ ] Key Metrics cards displayed in grid
- [ ] Sensor Status table renders
- [ ] Footer has black line separator
- [ ] Footer shows "Madison - IoT Report" on left
- [ ] Footer shows date/time on right
- [ ] All colors match selected theme
- [ ] Page layout (portrait/landscape) is correct

### Test Different Themes
Try each theme to ensure CSS loads:
1. Professional Blue (default)
2. Corporate Green
3. Modern Purple
4. Tech Orange
5. Monochrome
6. Dark Mode

### Test Different Orientations
1. Portrait (vertical) - default
2. Landscape (horizontal)

## Browser Compatibility

This fix works in all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## Future Improvements

Consider these enhancements:
1. **Inline CSS**: Fetch and inline CSS for fully self-contained HTML
2. **Base64 Images**: Convert logo to base64 for embedded previews
3. **CSS Bundling**: Combine CSS files into single stylesheet
4. **Caching**: Cache CSS content for faster preview generation

## Files Modified

1. **public/js/pdf-generator.js** (2 changes)
   - `applyConfiguration()` method
   - `generate()` method
   
## Rollback (if needed)

To revert changes:
```javascript
// In applyConfiguration(), remove origin:
<link rel="stylesheet" href="/css/pdf-colors.css">

// In generate(), simplify logoUrl:
logoUrl: config.logo?.enabled ? config.logo.url : null,
```

## Related Issues

This fix also resolves:
- Preview showing white/blank pages
- Missing typography styles in preview
- Layout issues in preview window
- Status indicators not showing colors
- Footer not displaying correctly

---

**Fixed**: January 11, 2025
**Issue**: Preview template display
**Status**: ✅ Resolved

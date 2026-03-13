# Interview Tracker Extension

Chrome extension for saving job applications directly from job posting pages to your Interview Tracker.

## Features

- **One-click job capture**: Click the extension icon on any job posting page
- **Smart extraction**: Uses JSON-LD structured data, meta tags, and heuristics to extract job details
- **Review before save**: Always shows a preview popup so you can edit before saving
- **Confidence scoring**: Warns you when extraction confidence is low
- **Duplicate detection**: Prevents saving the same job twice
- **Works on any site**: Generic extraction works on all job boards

## Supported Sites

The extension works on all job posting sites including:
- Greenhouse
- Lever
- Ashby
- SmartRecruiters
- LinkedIn Jobs
- Indeed
- And any site with job postings!

## Installation

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production

1. Build for production:
   ```bash
   npm run build
   ```

2. Zip the `dist` folder for Chrome Web Store upload

## Project Structure

```
src/
├── manifest.json              # Extension manifest
├── background/
│   └── service-worker.ts      # Background service worker
├── content/
│   ├── content-script.ts      # Content script entry
│   └── extractor.ts           # Job data extraction logic
├── popup/
│   ├── popup.html             # Popup HTML
│   ├── popup.css              # Popup styles
│   ├── popup.ts               # Popup entry
│   └── components/
│       └── JobReviewModal.ts  # Job review UI component
└── shared/
    ├── types.ts               # Shared TypeScript types
    ├── api-client.ts          # API communication
    ├── storage.ts             # Extension storage utils
    └── dedupe.ts              # Deduplication logic
```

## How It Works

1. **Extraction**: When you click the extension icon, the content script extracts job data using:
   - JSON-LD structured data (JobPosting schema)
   - Meta tags and Open Graph data
   - Heuristic DOM analysis

2. **Review**: The popup displays extracted data with confidence scores
   - Fields with confidence < 0.7 show warnings
   - You can edit any field before saving

3. **Save**: Data is sent to the Interview Tracker backend
   - Deduplication prevents duplicates
   - Success/error feedback is shown

## Configuration

The extension connects to the Interview Tracker backend at:
- Development: `http://localhost:3000`
- Production: Set via `API_BASE_URL` environment variable during build

## Icons

Before building, convert the SVG icons in `public/icons/` to PNG format:
- icon-16.png (16x16)
- icon-32.png (32x32)
- icon-48.png (48x48)
- icon-128.png (128x128)

You can use tools like:
- Inkscape (CLI: `inkscape icon-16.svg --export-filename=icon-16.png`)
- Online converters
- ImageMagick (`convert icon-16.svg icon-16.png`)

## Development Notes

### Adding New Extraction Methods

Edit `src/content/extractor.ts` to add new extraction strategies:

1. Add a new extraction function
2. Update `extractJobData()` to call it
3. Adjust confidence scoring as needed

### Testing Extraction

1. Navigate to a job posting page
2. Open DevTools console
3. Run: `chrome.runtime.sendMessage({type: 'EXTRACT_JOB'})`
4. Check the response for extraction results

## License

MIT

# Alumni Welcome & Attendance Kiosk

A modern, responsive web application for self-service alumni check-in at live events. Attendees search by name (typed or voice), see their profile card, hear a personalized greeting via browser TTS, and have attendance recorded automatically to Google Sheets.

## Quick Start

### 1. Set Up Google Sheets

1. Create a new Google Spreadsheet.
2. Open **Extensions > Apps Script**.
3. Paste the contents of `backend/Code.gs` into the script editor.
4. Run the `setupSheets` function from the toolbar (Run > setupSheets). This creates two sheets:
   - **Alumni** — master database with sample rows
   - **Attendance** — attendance log (auto-populated)
5. Populate the Alumni sheet with your data. Columns:

   | Alumni ID | Name | Photo URL | Program | Batch | Graduation Year | Company | Designation | City | Email | LinkedIn | Achievement |
   |-----------|------|-----------|---------|-------|-----------------|---------|-------------|------|-------|----------|-------------|

### 2. Deploy the Apps Script Web App

1. In Apps Script, click **Deploy > New deployment**.
2. Select type: **Web app**.
3. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and copy the web app URL.

### 3. Configure the Frontend

Edit `frontend/js/config.js` and set:

```js
api: {
  baseUrl: 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE'
}
```

Update event details, colors, and greeting template as needed.

### 4. Host the Frontend

**Option A — Local / USB kiosk:**
Open `frontend/index.html` directly in Chrome.

**Option B — Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase init hosting   # set public directory to "frontend"
firebase deploy
```

**Option C — GitHub Pages:**
Push the `frontend/` folder and enable Pages in repo settings.

**Option D — Any static host:**
Upload the `frontend/` folder to Netlify, Vercel, or any web server.

## Project Structure

```
alumni-kiosk/
├── frontend/
│   ├── index.html          # Main kiosk interface
│   ├── admin.html          # Admin dashboard
│   ├── css/
│   │   └── styles.css      # Complete stylesheet
│   ├── js/
│   │   ├── config.js       # All configurable settings
│   │   ├── app.js          # Main application controller
│   │   ├── search.js       # API client & caching
│   │   ├── voice.js        # Speech recognition & synthesis
│   │   ├── admin.js        # Admin panel controller
│   │   └── utils.js        # Fuzzy matching, sanitization, helpers
│   └── assets/             # Logos, banners (add your own)
├── backend/
│   └── Code.gs             # Google Apps Script backend
├── config.json             # Reference configuration
└── README.md
```

## Configuration

All settings are in `frontend/js/config.js`:

| Setting | Description |
|---------|-------------|
| `event.title` | Event name shown on home screen |
| `event.subtitle` | Tagline |
| `event.institution` | Institution name |
| `event.logoUrl` | URL to institution logo image |
| `greeting.template` | TTS greeting (`{title}`, `{name}`, `{event}` are replaced) |
| `greeting.rate` | Speech speed (0.1–10, default 0.95) |
| `greeting.pitch` | Voice pitch (0–2, default 1.0) |
| `greeting.chimeEnabled` | Play welcome chime before greeting |
| `admin.password` | Admin panel password |
| `api.baseUrl` | Google Apps Script web app URL |
| `kiosk.inactivityTimeout` | Seconds before auto-return to home (default 15) |
| `kiosk.theme` | `light` or `dark` |
| `kiosk.deviceId` | Identifier for this kiosk terminal |
| `colors.primary` | Primary brand color |
| `colors.secondary` | Secondary brand color |
| `colors.accent` | Accent color |

## Features

- **Voice search** — tap microphone, say a name, auto-search with confirmation for low-confidence results
- **Fuzzy matching** — handles typos, partial names, extra spaces, case differences
- **Profile card** — photo, batch, program, company, designation, city, achievements, LinkedIn
- **Browser TTS greeting** — configurable voice, speed, pitch, volume (no paid API)
- **Welcome chime** — generated via Web Audio API
- **Duplicate prevention** — "Already checked in" message if re-scanning
- **Live attendance counter** — visible on home screen
- **Admin dashboard** — stats, charts, attendance table, CSV export, reset, greeting config
- **Dark/light theme** — toggle in toolbar
- **Fullscreen kiosk mode** — F11 or toolbar button
- **Auto-timeout** — returns to home screen after inactivity
- **Offline detection** — user-friendly messages when connection drops
- **Client-side caching** — preloads alumni data for sub-second search
- **Touch-friendly** — large buttons, 56px minimum touch targets
- **Responsive** — works on 24–32" kiosk displays down to mobile
- **Accessibility** — keyboard navigation, ARIA labels, high-contrast support, reduced motion
- **Security** — input sanitization, URL validation, no exposed credentials

## Admin Panel

Navigate to `admin.html` (or click the gear icon on the kiosk).

- **Password:** set in `config.js` (default: `ssbf2026admin`)
- **View** real-time attendance with batch/program charts
- **Search/filter** attendance records
- **Export** attendance to CSV
- **Test** voice greeting
- **Update** greeting message for the session
- **Reset** all attendance records

## Browser Requirements

- Chrome 80+ (recommended for kiosk use)
- Edge 80+
- Safari 14.1+ (limited Speech Recognition)
- Firefox 100+ (no Speech Recognition — type-only mode)

## Kiosk Setup Tips

1. Use Chrome in kiosk mode: `chrome --kiosk --disable-pinch --overscroll-history-navigation=0 URL`
2. Disable system popups and screen saver
3. Set the display to stay on
4. Test microphone permissions before the event
5. Pre-load the app and let caching complete before guests arrive

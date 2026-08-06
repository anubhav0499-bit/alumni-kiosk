# Google Sheet Setup — Yaadein 2026 Alumni Kiosk

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Rename it to **"Yaadein 2026 — Alumni Database"**.

## Step 2: Create the Alumni Sheet

Rename the first sheet tab (bottom) to **Alumni** (exact name, case-sensitive).

Add these column headers in Row 1:

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Alumni ID | Name | Photo URL | Program | Batch | Graduation Year | Company | Designation | City | Email | LinkedIn | Achievement |

### Column details:

- **Alumni ID** — Unique ID (e.g., ALU001, ALU002). Must be unique per person.
- **Name** — Full name as it should appear on screen and in the voice greeting.
- **Photo URL** — Direct link to a photo (Google Drive shared link, or any public URL). Leave blank if no photo.
- **Program** — e.g., "MBA Banking & Finance", "MBA Finance"
- **Batch** — e.g., "2022-24", "2021-23"
- **Graduation Year** — e.g., "2024", "2023"
- **Company** — Current employer
- **Designation** — Current role/title
- **City** — Current city
- **Email** — Email address (not displayed on kiosk, used for admin reference)
- **LinkedIn** — Full LinkedIn profile URL (e.g., https://linkedin.com/in/username)
- **Achievement** — Any recognition (e.g., "Gold Medalist", "Best Project Award"). Leave blank if none.

### Sample data

Running `setupSheets` from the Apps Script editor will auto-populate **30 sample alumni** across batches 2018-20 through 2022-24, programs MBA Banking & Finance and MBA Finance, with companies like Goldman Sachs, JP Morgan, McKinsey, RBI, and more. You can also add your own rows manually — just follow the same column format.

## Step 3: Create the Attendance Sheet

Add a second sheet tab (click the **+** at the bottom) and rename it to **Attendance** (exact name).

Add these column headers in Row 1:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Timestamp | Alumni ID | Name | Batch | Program | Status | Device ID |

**Do not add any data rows.** The kiosk fills this automatically.

## Step 4: Add the Backend Script

1. In your spreadsheet, go to **Extensions → Apps Script**.
2. Delete any existing code in the editor.
3. Paste the entire contents of `Code.gs` from the `backend/` folder.
4. Click **Save** (Ctrl+S).
5. Optionally, run `setupSheets` from the **Run** menu to verify — it will create the sheets with headers if they don't exist.

## Step 5: Deploy as Web App

1. In Apps Script, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** Yaadein 2026 Kiosk API
   - **Execute as:** Me (your Google account)
   - **Who has access:** Anyone
4. Click **Deploy**.
5. **Authorize** when prompted (click Advanced → Go to project → Allow).
6. **Copy the Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

## Step 6: Connect to the Kiosk

Open `frontend/js/config.js` and replace the placeholder:

```js
api: {
  baseUrl: 'https://script.google.com/macros/s/AKfycbz1ga5yQvFvzFcHO5bfRLJUeuT7nSquP21XziCoyXuq0_uyeGphJkSjuarbB9F-IcRQ/exec'
}
```

## Step 7: Using Photo URLs

To add alumni photos:

### Option A: Google Drive
1. Upload the photo to Google Drive.
2. Right-click → Share → Change to "Anyone with the link".
3. Copy the link. It will look like:
   ```
   https://drive.google.com/file/d/FILE_ID/view
   ```
4. Convert it to a direct link format:
   ```
   https://lh3.googleusercontent.com/d/FILE_ID
   ```
5. Paste this direct link in the **Photo URL** column.

### Option B: Any public URL
Paste any direct image URL (ending in .jpg, .png, etc.).

## Important Notes

- **Do not rename** the sheet tabs from "Alumni" and "Attendance" — the script looks for these exact names.
- **Alumni ID must be unique** — duplicates will cause attendance tracking issues.
- **The kiosk caches data** for 5 minutes. After adding new alumni, wait up to 5 minutes or refresh the kiosk page.
- **Redeploying the script** after code changes: Go to Deploy → Manage deployments → Edit (pencil icon) → Version: New version → Deploy. The URL stays the same.

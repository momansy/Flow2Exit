# Flow2Exit Google Sheets Database Setup

Create a Google Sheet named `Flow2Exit_DB` with these tabs:

## Summaries
Header row:

```text
summary_id | updated_at | status | patient_name | mrn | bed | doctor_name | data_json
```

## Medicines
Header row:

```text
medicine_id | name | purpose | timing | created_at
```

The app will also auto-create/seed medicines if the tab is empty.

## Netlify Environment Variables
Add these in Netlify > Site configuration > Environment variables:

```text
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

Then share the Google Sheet with the service account email as Editor.

## Current storage behavior
- When deployed on Netlify with the env vars: data is saved to Google Sheets.
- When opened locally without Google setup: it falls back to browser localStorage so the UI still works.

## Patient persistence update
This version writes each saved draft into two places:

- `Summaries` tab: stores the complete discharge-summary JSON.
- `Patients` tab: stores one patient row so the patient appears on the dashboard as a separate patient card.

If the dashboard still shows local drafts only, open the browser console. The most common reason is missing Netlify environment variables or the Google Sheet not being shared with the service account as Editor.

## ECG attachment storage using Google Apps Script

ECG files are not stored directly inside Google Sheets. Google Sheets only stores the ECG file link inside the summary JSON. The actual ECG image/PDF is uploaded to a Google Drive folder through Google Apps Script.

Why Apps Script? A Google service account can write to Google Sheets, but it may fail to upload to a normal Google Drive folder because service accounts do not have normal Drive storage quota. Apps Script runs as your Google account and saves the files into your Drive folder.

Extra setup required:

1. Open `apps-script-ecg-upload.js` from this package.
2. Paste it into a new Google Apps Script project.
3. Deploy it as a Web App:

```text
Execute as: Me
Who has access: Anyone
```

4. Copy the Web App URL.
5. Add these environment variables in Netlify:

```text
ECG_UPLOAD_WEBAPP_URL=your_apps_script_web_app_url
ECG_UPLOAD_TOKEN=flow2exit-secret-123
```

6. Redeploy the Netlify site.

See `ECG_APPS_SCRIPT_SETUP.md` for the full ECG upload setup.

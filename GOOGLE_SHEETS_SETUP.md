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

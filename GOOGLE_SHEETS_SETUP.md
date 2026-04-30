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

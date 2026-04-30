# Flow2Exit ECG Upload Setup using Google Apps Script

Google Sheets works well with a service account, but Google Drive uploads may fail with a service account because service accounts do not have normal Drive storage quota.

This version uses Google Apps Script for ECG uploads:

```text
Flow2Exit website
→ Netlify Function upload-ecg
→ Google Apps Script Web App
→ Your Google Drive folder
→ ECG file link saved inside Google Sheets summary JSON
```

## 1. ECG folder

Your ECG folder ID is:

```text
1wJ2jY4R5qqSAXn41RZyvTf_-c4ezLTJL
```

Because Apps Script runs as you, the ECG files are saved using your own Google Drive storage.

## 2. Create Google Apps Script project

1. Go to: https://script.google.com
2. Create a new project.
3. Name it: `Flow2Exit ECG Upload`
4. Open the file `apps-script-ecg-upload.js` from this project package.
5. Copy all its contents into the Apps Script editor.
6. Save.

## 3. Confirm folder ID and token

Inside Apps Script, confirm:

```javascript
const FOLDER_ID = "1wJ2jY4R5qqSAXn41RZyvTf_-c4ezLTJL";
const SECRET_TOKEN = "flow2exit-secret-123";
```

You may change `SECRET_TOKEN`, but if you change it in Apps Script, you must use the same value in Netlify.

## 4. Deploy Apps Script as Web App

1. Click **Deploy**.
2. Click **New deployment**.
3. Select type: **Web app**.
4. Set:

```text
Execute as: Me
Who has access: Anyone
```

5. Click **Deploy**.
6. Authorize Google Drive access.
7. Copy the Web app URL.

## 5. Add Netlify environment variables

In Netlify:

```text
Site configuration → Environment variables
```

Add:

```text
ECG_UPLOAD_WEBAPP_URL = your Apps Script Web App URL
ECG_UPLOAD_TOKEN = flow2exit-secret-123
```

Keep your existing variables:

```text
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

You no longer need `GOOGLE_DRIVE_FOLDER_ID` for ECG upload in this version.

## 6. Redeploy Netlify

Go to:

```text
Deploys → Trigger deploy → Deploy site
```

## 7. Test

1. Open Flow2Exit.
2. Open a patient builder.
3. Click **Attach ECG**.
4. Select an ECG image or PDF under 4 MB.
5. The file should appear inside the Google Drive ECG folder.
6. Save the draft.
7. The ECG link will be saved inside the summary JSON in Google Sheets.

## Common errors

### Missing ECG_UPLOAD_WEBAPP_URL
Add the Apps Script web app URL in Netlify and redeploy.

### Unauthorized request
The token in Apps Script and Netlify does not match.

### Apps Script did not return JSON
You may have used the wrong Apps Script URL or did not deploy as a Web App.

### Permission denied
Redeploy the Apps Script and authorize Drive access.

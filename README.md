# Flow2Exit

Flow2Exit is a cardiology discharge summary prototype.

It includes:
- Login page
- Dashboard / patient search
- Discharge summary builder
- Doctor version report
- Patient-friendly report
- Google Sheets database integration through Netlify Functions

## Upload to GitHub

Upload all files and folders in this project folder to the root of your GitHub repository.

Important files/folders:

```text
index.html
dashboard.html
builder.html
reports.html
style.css
app.js
package.json
netlify.toml
netlify/functions/
```

## Required Netlify environment variables

Add these in Netlify:

```text
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

Do not put private keys inside GitHub.

## Google Sheet tabs

Create these tabs exactly:

```text
Summaries
Medicines
Doctors
Patients
```

Share the Google Sheet with your service account email as Editor.

## Deploy

Connect the GitHub repository to Netlify. Netlify will install `googleapis`, deploy static files, and deploy the functions in `netlify/functions`.

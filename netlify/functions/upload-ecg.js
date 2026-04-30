const { google } = require('googleapis');
const { Readable } = require('stream');

function json(statusCode, body){
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
function options(){
  return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: '' };
}
function safeName(value){
  return String(value || '').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120) || 'ecg-file';
}
function assertEnv(){
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY){
    throw new Error('Missing Google service account environment variables.');
  }
  if(!process.env.GOOGLE_DRIVE_FOLDER_ID){
    throw new Error('Missing GOOGLE_DRIVE_FOLDER_ID. Create a Google Drive folder, share it with the service account, and add its folder ID in Netlify.');
  }
}
async function driveClient(){
  assertEnv();
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/drive.file']
  );
  return google.drive({ version: 'v3', auth });
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  if(event.httpMethod !== 'POST') return json(405, { success:false, error:'Method not allowed' });

  try{
    const body = JSON.parse(event.body || '{}');
    const { fileName, mimeType, dataUrl, summary_id, patient_name, mrn } = body;
    if(!fileName || !dataUrl) return json(400, { success:false, error:'Missing fileName or dataUrl' });

    const match = String(dataUrl).match(/^data:(.*?);base64,(.+)$/);
    if(!match) return json(400, { success:false, error:'Invalid file data format' });

    const type = mimeType || match[1] || 'application/octet-stream';
    if(!/^image\//.test(type) && type !== 'application/pdf'){
      return json(400, { success:false, error:'Only ECG images and PDFs are allowed' });
    }

    const buffer = Buffer.from(match[2], 'base64');
    const maxBytes = 8 * 1024 * 1024;
    if(buffer.length > maxBytes) return json(400, { success:false, error:'File is too large. Maximum size is 8 MB.' });

    const drive = await driveClient();
    const prefix = [mrn || 'no-mrn', patient_name || 'patient', summary_id || Date.now()].map(safeName).join('_');
    const finalName = `ECG_${prefix}_${Date.now()}_${safeName(fileName)}`;

    const created = await drive.files.create({
      requestBody: {
        name: finalName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        description: `Flow2Exit ECG attachment. Patient: ${patient_name || ''}. MRN: ${mrn || ''}. Summary: ${summary_id || ''}.`
      },
      media: {
        mimeType: type,
        body: Readable.from(buffer)
      },
      fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime',
      supportsAllDrives: true
    });

    const f = created.data;
    return json(200, {
      success:true,
      file:{
        drive_file_id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
        uploaded_at: f.createdTime
      }
    });
  }catch(err){
    return json(500, { success:false, error:err.message });
  }
};

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
  if(!process.env.ECG_UPLOAD_WEBAPP_URL){
    throw new Error('Missing ECG_UPLOAD_WEBAPP_URL. Deploy the Google Apps Script ECG uploader as a web app and add its URL in Netlify.');
  }
  if(!process.env.ECG_UPLOAD_TOKEN){
    throw new Error('Missing ECG_UPLOAD_TOKEN. Add the same secret token used in the Google Apps Script uploader.');
  }
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  if(event.httpMethod !== 'POST') return json(405, { success:false, error:'Method not allowed' });

  try{
    assertEnv();

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
    const maxBytes = 4 * 1024 * 1024;
    if(buffer.length > maxBytes) return json(400, { success:false, error:'File is too large. Maximum size is 4 MB.' });

    const prefix = [mrn || 'no-mrn', patient_name || 'patient', summary_id || Date.now()].map(safeName).join('_');
    const finalName = `ECG_${prefix}_${Date.now()}_${safeName(fileName)}`;

    const payload = {
      token: process.env.ECG_UPLOAD_TOKEN,
      fileName: finalName,
      originalFileName: fileName,
      mimeType: type,
      base64: match[2],
      summary_id: summary_id || '',
      patient_name: patient_name || '',
      mrn: mrn || ''
    };

    const res = await fetch(process.env.ECG_UPLOAD_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await res.text();
    let out;
    try { out = JSON.parse(text); }
    catch(parseErr){
      return json(502, { success:false, error:'Apps Script did not return JSON. Check the web app URL and deployment access setting.', raw:text.slice(0, 300) });
    }

    if(!out.success){
      return json(500, { success:false, error:out.error || 'Apps Script upload failed' });
    }

    return json(200, {
      success:true,
      file:{
        drive_file_id: out.fileId || '',
        name: out.fileName || finalName,
        originalName: fileName,
        mimeType: type,
        size: buffer.length,
        webViewLink: out.fileUrl || out.url || '',
        webContentLink: out.fileUrl || out.url || '',
        uploaded_at: new Date().toISOString(),
        storage: 'Google Drive via Apps Script'
      }
    });
  }catch(err){
    return json(500, { success:false, error:err.message });
  }
};

const { json, options, readRange, appendRow, updateRow } = require('./_sheets');
const HEADERS = ['summary_id','updated_at','status','patient_name','mrn','bed','doctor_name','data_json'];
exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  if(event.httpMethod !== 'POST') return json(405, { success:false, error:'Method not allowed' });
  try{
    const s = JSON.parse(event.body || '{}');
    const id = s.summary_id || ('summary-' + Date.now());
    const row = [id, s.updated_at || new Date().toISOString(), s.status || 'draft', s.patient_name || '', s.mrn || '', s.bed || '', s.doctor_name || 'Dr. Maya Singh', JSON.stringify({...s, summary_id:id})];
    const rows = await readRange('Summaries!A:H');
    if(!rows.length) await appendRow('Summaries!A:H', HEADERS);
    const allRows = rows.length ? rows : [HEADERS];
    const index = allRows.findIndex((r,i)=>i>0 && r[0] === id);
    if(index > 0) await updateRow(`Summaries!A${index+1}:H${index+1}`, row);
    else await appendRow('Summaries!A:H', row);
    return json(200, { success:true, summary_id:id });
  }catch(err){ return json(500, { success:false, error:err.message }); }
};

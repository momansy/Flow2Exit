const { json, options, readRange, appendRow, updateRow } = require('./_sheets');

const SUMMARY_HEADERS = ['summary_id','updated_at','status','patient_name','mrn','bed','doctor_name','data_json'];
const PATIENT_HEADERS = ['patient_id','patient_name','mrn','age','gender','bed','civil_id','contact','allergies','updated_at','summary_id'];

async function ensureHeader(range, headers){
  let rows = await readRange(range);
  if(!rows.length){
    await appendRow(range, headers);
    rows = [headers];
  }
  return rows;
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  if(event.httpMethod !== 'POST') return json(405, { success:false, error:'Method not allowed' });
  try{
    const s = JSON.parse(event.body || '{}');
    const id = s.summary_id || ('summary-' + Date.now());
    const updated = new Date().toLocaleString();
    const savedSummary = {...s, summary_id:id, updated_at: updated};

    const summaryRow = [
      id,
      updated,
      s.status || 'draft',
      s.patient_name || '',
      s.mrn || '',
      s.bed || '',
      s.doctor_name || 'Dr. Maya Singh',
      JSON.stringify(savedSummary)
    ];

    let summaryRows = await ensureHeader('Summaries!A:H', SUMMARY_HEADERS);
    let summaryIndex = summaryRows.findIndex((r,i)=>i>0 && r[0] === id);
    if(summaryIndex > 0) await updateRow(`Summaries!A${summaryIndex+1}:H${summaryIndex+1}`, summaryRow);
    else await appendRow('Summaries!A:H', summaryRow);

    const patientId = s.patient_id || s.mrn || ('patient-' + id);
    const patientRow = [
      patientId,
      s.patient_name || '',
      s.mrn || '',
      s.age || '',
      s.gender || '',
      s.bed || '',
      s.civil_id || '',
      s.contact || '',
      s.allergies || '',
      updated,
      id
    ];

    let patientRows = await ensureHeader('Patients!A:K', PATIENT_HEADERS);
    let patientIndex = patientRows.findIndex((r,i)=>i>0 && ((s.mrn && r[2] === s.mrn) || r[0] === patientId));
    if(patientIndex > 0) await updateRow(`Patients!A${patientIndex+1}:K${patientIndex+1}`, patientRow);
    else await appendRow('Patients!A:K', patientRow);

    return json(200, { success:true, summary_id:id, patient_id:patientId, updated_at:updated });
  }catch(err){ return json(500, { success:false, error:err.message }); }
};

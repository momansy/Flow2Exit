const { json, options, readRange, appendRow, updateRow } = require('./_sheets');

const SUMMARY_HEADERS = ['summary_id','updated_at','status','patient_name','mrn','bed','doctor_name','data_json'];
const PATIENT_HEADERS = ['patient_id','patient_name','mrn','age','gender','bed','civil_id','contact','allergies','updated_at','summary_id'];

function normalizeMrn(value){
  let v = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if(!v) return '';
  if(/^\d+$/.test(v)) v = v.replace(/^0+/, '') || '0';
  return v;
}
function parseSummaryRow(r){
  try { return JSON.parse(r[7] || '{}'); }
  catch { return { summary_id:r[0], updated_at:r[1], status:r[2], patient_name:r[3], mrn:r[4], bed:r[5], doctor_name:r[6] }; }
}

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
    const incomingMrn = normalizeMrn(s.mrn);
    const updated = new Date().toLocaleString();

    let summaryRows = await ensureHeader('Summaries!A:H', SUMMARY_HEADERS);
    let summaryIndex = summaryRows.findIndex((r,i)=> i>0 && r[0] && s.summary_id && r[0] === s.summary_id);
    if(summaryIndex < 0 && incomingMrn){
      summaryIndex = summaryRows.findIndex((r,i)=>{
        if(i === 0) return false;
        const existing = parseSummaryRow(r);
        return normalizeMrn(existing.mrn || r[4]) === incomingMrn;
      });
    }

    const existingSummary = summaryIndex > 0 ? parseSummaryRow(summaryRows[summaryIndex]) : {};
    const id = existingSummary.summary_id || s.summary_id || ('summary-' + Date.now());
    const savedSummary = {...existingSummary, ...s, summary_id:id, updated_at: updated};

    const summaryRow = [
      id,
      updated,
      savedSummary.status || 'draft',
      savedSummary.patient_name || '',
      savedSummary.mrn || '',
      savedSummary.bed || '',
      savedSummary.doctor_name || 'Dr. Maya Singh',
      JSON.stringify(savedSummary)
    ];

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
    let patientIndex = patientRows.findIndex((r,i)=> i>0 && r[0] && r[0] === patientId);
    if(patientIndex < 0 && incomingMrn){
      patientIndex = patientRows.findIndex((r,i)=> i>0 && normalizeMrn(r[2]) === incomingMrn);
    }
    if(patientIndex > 0) await updateRow(`Patients!A${patientIndex+1}:K${patientIndex+1}`, patientRow);
    else await appendRow('Patients!A:K', patientRow);

    return json(200, { success:true, summary_id:id, patient_id:patientId, updated_at:updated });
  }catch(err){ return json(500, { success:false, error:err.message }); }
};

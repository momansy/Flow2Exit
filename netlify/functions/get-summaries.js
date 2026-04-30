const { json, options, readRange } = require('./_sheets');

function normalizeMrn(value){
  let v = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if(!v) return '';
  if(/^\d+$/.test(v)) v = v.replace(/^0+/, '') || '0';
  return v;
}
function summaryKey(s){
  const mrn = normalizeMrn(s.mrn);
  if(mrn) return 'mrn:' + mrn;
  if(s.patient_id) return 'patient:' + String(s.patient_id).toLowerCase();
  if(s.summary_id) return 'summary:' + String(s.summary_id).toLowerCase();
  return 'name:' + String(s.patient_name || '').toLowerCase();
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  try{
    const rows = await readRange('Summaries!A:H');
    const map = new Map();
    rows.slice(1).forEach(r=>{
      let s;
      try { s = JSON.parse(r[7] || '{}'); }
      catch { s = { summary_id:r[0], updated_at:r[1], status:r[2], patient_name:r[3], mrn:r[4], bed:r[5], doctor_name:r[6] }; }
      if(!s || (!s.summary_id && !s.mrn && !s.patient_name)) return;
      const key = summaryKey(s);
      map.set(key, s); // Later rows overwrite older duplicate rows.
    });
    const summaries = [...map.values()].reverse();
    return json(200, { success:true, summaries });
  }catch(err){ return json(500, { success:false, error:err.message, summaries:[] }); }
};

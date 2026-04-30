const { json, options, readRange } = require('./_sheets');

function normalizeMrn(value){
  let v = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if(!v) return '';
  if(/^\d+$/.test(v)) v = v.replace(/^0+/, '') || '0';
  return v;
}
function patientKey(p){
  const mrn = normalizeMrn(p.mrn);
  if(mrn) return 'mrn:' + mrn;
  if(p.patient_id) return 'patient:' + String(p.patient_id).toLowerCase();
  return 'name:' + String(p.patient_name || '').toLowerCase();
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  try{
    const rows = await readRange('Patients!A:K');
    const map = new Map();
    rows.slice(1).forEach(r=>{
      const p = {
        patient_id: r[0] || '',
        patient_name: r[1] || '',
        mrn: r[2] || '',
        age: r[3] || '',
        gender: r[4] || '',
        bed: r[5] || '',
        civil_id: r[6] || '',
        contact: r[7] || '',
        allergies: r[8] || '',
        updated_at: r[9] || '',
        summary_id: r[10] || ''
      };
      if(!p.patient_name && !p.mrn) return;
      map.set(patientKey(p), p); // Later rows overwrite older duplicate rows.
    });
    return json(200, { success:true, patients:[...map.values()] });
  }catch(err){ return json(500, { success:false, error:err.message, patients:[] }); }
};

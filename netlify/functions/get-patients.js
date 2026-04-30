const { json, options, readRange } = require('./_sheets');

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  try{
    const rows = await readRange('Patients!A:K');
    const patients = rows.slice(1).map(r=>({
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
    })).filter(p=>p.patient_name || p.mrn);
    return json(200, { success:true, patients });
  }catch(err){ return json(500, { success:false, error:err.message, patients:[] }); }
};

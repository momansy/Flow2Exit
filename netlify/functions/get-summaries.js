const { json, options, readRange } = require('./_sheets');
exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  try{
    const rows = await readRange('Summaries!A:H');
    const summaries = rows.slice(1).map(r=>{
      try { return JSON.parse(r[7] || '{}'); } catch { return { summary_id:r[0], updated_at:r[1], status:r[2], patient_name:r[3], mrn:r[4], bed:r[5], doctor_name:r[6] }; }
    }).filter(s=>s.summary_id).reverse();
    return json(200, { success:true, summaries });
  }catch(err){ return json(500, { success:false, error:err.message, summaries:[] }); }
};

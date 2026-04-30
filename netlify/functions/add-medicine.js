const { json, options, readRange, appendRow } = require('./_sheets');
exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  if(event.httpMethod !== 'POST') return json(405, { success:false, error:'Method not allowed' });
  try{
    const m = JSON.parse(event.body || '{}');
    const name = String(m.name || '').trim();
    if(!name) return json(400, { success:false, error:'Medicine name is required' });
    let rows = await readRange('Medicines!A:E');
    if(!rows.length){ await appendRow('Medicines!A:E', ['medicine_id','name','purpose','timing','created_at']); rows = [['medicine_id','name','purpose','timing','created_at']]; }
    const exists = rows.slice(1).some(r => String(r[1] || '').toLowerCase() === name.toLowerCase());
    if(!exists){
      await appendRow('Medicines!A:E', ['med-' + Date.now(), name, m.purpose || '', m.timing || '', new Date().toISOString()]);
    }
    return json(200, { success:true, existed:exists });
  }catch(err){ return json(500, { success:false, error:err.message }); }
};

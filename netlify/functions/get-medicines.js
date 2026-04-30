const { json, options, readRange, appendRow } = require('./_sheets');
const DEFAULTS = [
 ['med-aspirin','Aspirin','Prevent blood clots','Once daily after food'],
 ['med-clopidogrel','Clopidogrel','Keeps your stent open and helps prevent blood clots','Once daily'],
 ['med-ticagrelor','Ticagrelor','Prevents blood clots and keeps your stent open','Twice daily'],
 ['med-prasugrel','Prasugrel','Prevents blood clots and keeps your stent open','Once daily'],
 ['med-warfarin','Warfarin','Blood thinner to prevent harmful clots','As prescribed'],
 ['med-apixaban','Apixaban','Blood thinner to prevent harmful clots','Twice daily'],
 ['med-rivaroxaban','Rivaroxaban','Blood thinner to prevent harmful clots','Once daily with food or as prescribed'],
 ['med-metoprolol','Metoprolol','Controls heart rate and blood pressure','Once daily or as prescribed'],
 ['med-bisoprolol','Bisoprolol','Controls heart rate and blood pressure','Once daily'],
 ['med-atorvastatin','Atorvastatin','Lowers cholesterol','At night'],
 ['med-rosuvastatin','Rosuvastatin','Lowers cholesterol','Once daily'],
 ['med-lisinopril','Lisinopril','Controls blood pressure and protects the heart','Once daily'],
 ['med-losartan','Losartan','Controls blood pressure and protects the heart','Once daily']
];
exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return options();
  try{
    let rows = await readRange('Medicines!A:E');
    if(!rows.length){
      await appendRow('Medicines!A:E', ['medicine_id','name','purpose','timing','created_at']);
      for(const d of DEFAULTS) await appendRow('Medicines!A:E', [...d, new Date().toISOString()]);
      rows = await readRange('Medicines!A:E');
    }
    const medicines = rows.slice(1).map(r=>({ medicine_id:r[0], name:r[1]||'', purpose:r[2]||'', timing:r[3]||'' })).filter(m=>m.name);
    return json(200, { success:true, medicines });
  }catch(err){ return json(500, { success:false, error:err.message, medicines:[] }); }
};

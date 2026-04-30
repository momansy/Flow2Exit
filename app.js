const DOCTOR_PROFILE = { name: "Dr. Maya Singh", email: "doctor@flow2exit.com", department: "Cardiology Department" };
const API_BASE = "/.netlify/functions";
async function apiGet(path){ const res = await fetch(API_BASE + path); if(!res.ok) throw new Error(await res.text()); return res.json(); }
async function apiPost(path, data){ const res = await fetch(API_BASE + path, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) }); if(!res.ok) throw new Error(await res.text()); return res.json(); }
async function syncMedicinesFromSheets(){
  try{
    const out = await apiGet("/get-medicines");
    if(out.success && Array.isArray(out.medicines) && out.medicines.length){
      saveMedicineDatabase(out.medicines);
      return out.medicines;
    }
  }catch(e){ console.warn("Google Sheets medicines unavailable; using local database.", e.message); }
  return getMedicineDatabase();
}
async function saveSummaryToSheets(summary){
  try { return await apiPost("/save-summary", summary); }
  catch(e){ console.warn("Google Sheets save unavailable; kept local draft only.", e.message); return { success:false, error:e.message }; }
}
async function loadSummariesFromSheets(){
  try{
    const out = await apiGet("/get-summaries");
    if(out.success && Array.isArray(out.summaries)){
      localStorage.setItem("savedDrafts", JSON.stringify(out.summaries));
      return out.summaries;
    }
  }catch(e){ console.warn("Google Sheets drafts unavailable; using local drafts.", e.message); }
  return JSON.parse(localStorage.getItem("savedDrafts") || "[]");
}
async function loadPatientsFromSheets(){
  try{
    const out = await apiGet("/get-patients");
    if(out.success && Array.isArray(out.patients)){
      localStorage.setItem("savedPatients", JSON.stringify(out.patients));
      return out.patients;
    }
  }catch(e){ console.warn("Google Sheets patients unavailable; using local patients.", e.message); }
  const localPatients = JSON.parse(localStorage.getItem("savedPatients") || "[]");
  if(localPatients.length) return localPatients;
  const drafts = JSON.parse(localStorage.getItem("savedDrafts") || "[]");
  return summariesToPatients(drafts);
}
async function addMedicineToSheets(medicine){
  try { return await apiPost("/add-medicine", medicine); }
  catch(e){ console.warn("Google Sheets medicine add unavailable; stored locally only.", e.message); return { success:false, error:e.message }; }
}
function renderDoctorName(){ document.querySelectorAll(".doctor-name, #doctorNameTop").forEach(el => el.textContent = DOCTOR_PROFILE.name); }

const DEFAULT_MEDICINE_DATABASE = [
  { name: "Aspirin", purpose: "Prevent blood clots", timing: "Once daily after food" },
  { name: "Clopidogrel", purpose: "Keeps your stent open and helps prevent blood clots", timing: "Once daily" },
  { name: "Ticagrelor", purpose: "Prevents blood clots and keeps your stent open", timing: "Twice daily" },
  { name: "Prasugrel", purpose: "Prevents blood clots and keeps your stent open", timing: "Once daily" },
  { name: "Warfarin", purpose: "Blood thinner to prevent harmful clots", timing: "As prescribed" },
  { name: "Apixaban", purpose: "Blood thinner to prevent harmful clots", timing: "Twice daily" },
  { name: "Rivaroxaban", purpose: "Blood thinner to prevent harmful clots", timing: "Once daily with food or as prescribed" },
  { name: "Metoprolol", purpose: "Controls heart rate and blood pressure", timing: "Once daily or as prescribed" },
  { name: "Bisoprolol", purpose: "Controls heart rate and blood pressure", timing: "Once daily" },
  { name: "Atorvastatin", purpose: "Lowers cholesterol", timing: "At night" },
  { name: "Rosuvastatin", purpose: "Lowers cholesterol", timing: "Once daily" },
  { name: "Lisinopril", purpose: "Controls blood pressure and protects the heart", timing: "Once daily" },
  { name: "Losartan", purpose: "Controls blood pressure and protects the heart", timing: "Once daily" }
];

function getMedicineDatabase(){
  let meds = JSON.parse(localStorage.getItem("medicineDatabase") || "null");
  if(!meds){
    meds = DEFAULT_MEDICINE_DATABASE;
    localStorage.setItem("medicineDatabase", JSON.stringify(meds));
  }
  return meds;
}


function seedInitialMedicines(){
  const meds = getMedicineDatabase();
  let changed = false;
  DEFAULT_MEDICINE_DATABASE.forEach(seed => {
    if(!meds.some(m => String(m.name || "").toLowerCase() === seed.name.toLowerCase())){
      meds.push(seed);
      changed = true;
    }
  });
  if(changed) saveMedicineDatabase(meds);
}

function saveMedicineDatabase(meds){
  const cleaned = [];
  meds.forEach(m=>{
    const name = String(m.name || "").trim();
    if(!name) return;
    const existing = cleaned.find(x=>x.name.toLowerCase() === name.toLowerCase());
    if(existing){
      existing.purpose = m.purpose || existing.purpose || "";
      existing.timing = m.timing || existing.timing || "";
    } else {
      cleaned.push({ name, purpose: m.purpose || "", timing: m.timing || "" });
    }
  });
  localStorage.setItem("medicineDatabase", JSON.stringify(cleaned));
}

function findMedicine(name){
  const q = String(name || "").trim().toLowerCase();
  if(!q) return null;
  return getMedicineDatabase().find(m=>m.name.toLowerCase() === q) || null;
}

function medicineSuggestionsHtml(query){
  const q = String(query || "").trim().toLowerCase();
  if(!q) return "";
  const matches = getMedicineDatabase()
    .filter(m=>m.name.toLowerCase().includes(q))
    .slice(0, 6);
  return matches.map(m=>`<button type="button" class="med-suggestion" onclick="selectMedicineSuggestion(this, '${escapeAttr(m.name)}')">${escapeHtml(m.name)}</button>`).join("");
}

function setupMedicineSearch(row, inputSelector, options={}){
  const input = row.querySelector(inputSelector);
  const panel = row.querySelector(".medicine-suggestions");
  const addBtn = row.querySelector(".add-med-db");
  if(!input || !panel || !addBtn) return;

  function refresh(){
    const value = input.value.trim();
    const exact = findMedicine(value);
    panel.innerHTML = medicineSuggestionsHtml(value);
    panel.style.display = panel.innerHTML ? "block" : "none";
    addBtn.disabled = !value || !!exact;
    addBtn.textContent = exact ? "Saved" : "Add to DB";
    row.querySelector(".medicine-search-wrap")?.classList.toggle("has-new-medicine", !!value && !exact);
  }

  input.addEventListener("input", refresh);
  input.addEventListener("focus", refresh);
  input.addEventListener("blur", ()=>setTimeout(()=>{ panel.style.display="none"; }, 180));
  input.addEventListener("change", ()=>applyMedicineToRow(row, input.value, options));
  addBtn.addEventListener("click", ()=>addMedicineFromRow(row, inputSelector, options));
  refresh();
}

function selectMedicineSuggestion(button, medName){
  const row = button.closest(".home-row, .med-row");
  if(!row) return;
  const input = row.querySelector(".hm-name, .dm-med");
  input.value = medName;
  applyMedicineToRow(row, medName, { fillDetails: row.classList.contains("med-row") });
  if(row.classList.contains("med-row")) setupSmartMedicineRow(row);
  const panel = row.querySelector(".medicine-suggestions");
  if(panel) panel.style.display = "none";
  const addBtn = row.querySelector(".add-med-db");
  if(addBtn){ addBtn.disabled = true; addBtn.textContent = "Saved"; }
  row.querySelector(".medicine-search-wrap")?.classList.remove("has-new-medicine");
}

function applyMedicineToRow(row, medName, options={}){
  const med = findMedicine(medName);
  if(!med || !options.fillDetails) return;
  const purpose = row.querySelector(".dm-purpose");
  const timing = row.querySelector(".dm-timing");
  if(purpose && !purpose.value.trim()) purpose.value = med.purpose || "";
  if(timing && !timing.value.trim()) timing.value = med.timing || "";
}

function addMedicineFromRow(row, inputSelector, options={}){
  const input = row.querySelector(inputSelector);
  const name = input?.value.trim();
  if(!name) return;
  const meds = getMedicineDatabase();
  if(findMedicine(name)) return;
  const purpose = row.querySelector(".dm-purpose")?.value.trim() || "";
  const timing = row.querySelector(".dm-timing")?.value.trim() || "";
  meds.push({ name, purpose, timing });
  saveMedicineDatabase(meds);
  const addBtn = row.querySelector(".add-med-db");
  if(addBtn){ addBtn.disabled = true; addBtn.textContent = "Saved"; }
  row.querySelector(".medicine-search-wrap")?.classList.remove("has-new-medicine");
  const panel = row.querySelector(".medicine-suggestions");
  if(panel) panel.style.display = "none";
  addMedicineToSheets({ name, purpose, timing });
  alert("Medicine added to database for future use.");
}

function escapeAttr(v){
  return String(v ?? "")
    .replace(/\\\\/g, "\\\\\\")
    .replace(/'/g, "\\'")
    .replace(/\\r?\\n/g, " ");
}

const DEMO_PATIENT = {
  summary_id: "demo-robert-alvarez",
  patient_name: "Robert Alvarez",
  mrn: "00452987",
  age: "68",
  gender: "Male",
  bed: "12B",
  civil_id: "",
  contact: "",
  allergies: "No known drug allergies",
  admission_date: "2026-03-22",
  discharge_date: "2026-03-26",
  admission_reason: "Presented with chest pain and ST-elevation on ECG.",
  final_diagnosis: "ST-Elevation Myocardial Infarction (Anterior Wall)\nStatus post Primary PCI with Drug-Eluting Stent to LAD",
  history_of_patient: "68-year-old male presented with acute chest pain and ST-elevation in anterior leads. Risk factors include hypertension and dyslipidemia.",
  hospital_course: "Patient was admitted with acute STEMI. Emergency primary PCI was performed with DES to LAD by Dr. R. Patel. Post procedure patient was shifted to ICU. Hemodynamically stable. Started on dual antiplatelet therapy, statins, beta blockers and other supportive medications. Discharged in stable condition.",
  ecg: "ST elevation in V1-V4 on admission. Post PCI ST segments resolved.",
  lab: "Troponin I elevated, trending down. Lipid profile done.",
  echo: "LVEF 50%, mild anterior wall hypokinesia.",
  procedure_done: true,
  access_site: "Radial",
  procedure_doctor: "Dr. R. Patel",
  procedure_date: "2026-03-23",
  procedure_findings: "LAD 99% thrombotic lesion – DES placed.",
  home_medications: [{name:"Clopidogrel 75 mg", action:"continue", reason:"Continue as DAPT"}],
  discharge_medications: [
    {medication:"Aspirin 81 mg", purpose:"Prevent blood clots", abf:true, note:"Once daily after food", start_date:"2026-03-26", end_date:""},
    {medication:"Clopidogrel 75 mg", purpose:"Keep the stent open", abf:true, note:"Once daily", start_date:"2026-03-26", end_date:""},
    {medication:"Atorvastatin 40 mg", purpose:"Lower cholesterol", hs:true, note:"At night", start_date:"2026-03-26", end_date:""}
  ],
  pending_results: "None",
  cognitive_status: "Alert & oriented",
  functional_status: "Independent",
  needs_caregiver: false,
  instruction_type: "Post-Catheterization Care",
  patient_instruction_text: "Avoid heavy lifting for 7 days. Keep the wound area clean and dry. Take medications exactly as prescribed. Do not stop blood thinners unless your doctor tells you.",
  followup_date: "2026-04-15",
  followup_time: "10:00",
  followup_doctor: "Dr. R. Patel",
  followup_room: "Cardiology OPD",
  followup_note: "Bring this paper to your next visit."
};

function login(){
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  if(email && pass){ localStorage.setItem("flow2exit_logged_in","yes"); localStorage.setItem("flow2exit_doctor", JSON.stringify(DOCTOR_PROFILE)); location.href="dashboard.html"; }
}
function logout(){ localStorage.removeItem("flow2exit_logged_in"); location.href="index.html"; }
function requireLogin(){ if(localStorage.getItem("flow2exit_logged_in")!=="yes") location.href="index.html"; }
function uid(){ return "summary-" + Date.now(); }

function emptySummary(){
  return {
    summary_id: uid(), status:"new", patient_name:"", mrn:"", age:"", gender:"", bed:"", civil_id:"", contact:"", allergies:"",
    admission_date:"", discharge_date:"", admission_reason:"", final_diagnosis:"", history_of_patient:"", hospital_course:"",
    ecg:"", lab:"", echo:"", procedure_done:false, access_site:"", procedure_doctor:"", procedure_date:"", procedure_findings:"",
    home_medications:[], discharge_medications:[], pending_results:"", cognitive_status:"", functional_status:"", needs_caregiver:false,
    instruction_type:"", patient_instruction_text:"", explained_patient:false, explained_caregiver:false,
    followup_date:"", followup_time:"", followup_doctor:"", followup_room:"", followup_note:""
  };
}
function createNewSummary(){
  localStorage.setItem("currentSummary", JSON.stringify(emptySummary()));
  location.href = "builder.html";
}

function openExistingPatient(){
  localStorage.setItem("currentSummary", JSON.stringify({...DEMO_PATIENT, summary_id: uid()}));
  location.href = "builder.html";
}

function summariesToPatients(summaries){
  const map = new Map();
  (summaries || []).forEach(s=>{
    const key = String(s.mrn || s.patient_id || s.summary_id || "").trim().toLowerCase();
    if(!key) return;
    map.set(key, {
      patient_id: s.patient_id || s.mrn || s.summary_id,
      patient_name: s.patient_name || "Untitled Patient",
      mrn: s.mrn || "",
      age: s.age || "",
      gender: s.gender || "",
      bed: s.bed || "",
      contact: s.contact || "",
      updated_at: s.updated_at || "",
      summary_id: s.summary_id || ""
    });
  });
  return [...map.values()];
}
function searchPatientCards(){
  const q = (document.getElementById("patientSearch")?.value || "").toLowerCase();
  document.querySelectorAll(".patient-card, .draft-item").forEach(card=>{
    const text = (card.dataset.search || card.textContent || "").toLowerCase();
    card.style.display = text.includes(q) ? "block" : "none";
  });
}
async function initDashboard(){
  renderDoctorName();
  await renderDashboardPatients();
  await renderDashboardDrafts();
}
async function renderDashboardPatients(){
  const box = document.getElementById("patientList"); if(!box) return;
  box.innerHTML = "<p class='muted'>Loading patients...</p>";
  const drafts = await loadSummariesFromSheets();
  const sheetPatients = await loadPatientsFromSheets();
  const patientMap = new Map();
  patientMap.set("demo", {...DEMO_PATIENT, patient_id:"demo-robert-alvarez", source:"demo"});
  summariesToPatients(drafts).forEach(p=>patientMap.set(String(p.mrn || p.patient_id).toLowerCase(), p));
  (sheetPatients || []).forEach(p=>patientMap.set(String(p.mrn || p.patient_id || p.patient_name).toLowerCase(), p));
  const patients = [...patientMap.values()];
  localStorage.setItem("savedPatients", JSON.stringify(patients));
  box.innerHTML = patients.map((p,i)=>`
    <div class="patient-card mini-patient-card" data-search="${escapeAttr([p.patient_name,p.mrn,p.bed,p.age,p.gender].join(' '))}">
      <div><b>Patient: ${escapeHtml(p.patient_name || "Untitled Patient")}</b></div>
      <div class="muted">MRN: ${escapeHtml(p.mrn || "No MRN")} | Bed: ${escapeHtml(p.bed || "-")} | Age: ${escapeHtml(p.age || "-")}</div>
      <button class="primary" onclick="openPatient(${i})">Open Builder</button>
    </div>`).join("");
  searchPatientCards();
}
function openPatient(i){
  const patients = JSON.parse(localStorage.getItem("savedPatients") || "[]");
  const p = patients[i];
  if(!p) return;
  if(p.source === "demo" || p.patient_id === "demo-robert-alvarez") return openExistingPatient();
  const drafts = JSON.parse(localStorage.getItem("savedDrafts") || "[]");
  const draft = drafts.find(d => (d.summary_id && d.summary_id === p.summary_id) || (d.mrn && p.mrn && d.mrn === p.mrn));
  const base = draft || {...emptySummary(), ...p, summary_id: uid(), status:"new"};
  localStorage.setItem("currentSummary", JSON.stringify(base));
  location.href = "builder.html";
}
async function renderDashboardDrafts(){
  renderDoctorName();
  const box = document.getElementById("draftList"); if(!box) return;
  const drafts = await loadSummariesFromSheets();
  if(!drafts.length){ box.innerHTML = "<p class='muted'>No saved drafts yet.</p>"; return; }
  box.innerHTML = drafts.map((d,i)=>`<div class="draft-item" data-search="${escapeAttr([d.patient_name,d.mrn,d.bed,d.age].join(' '))}"><b>${escapeHtml(d.patient_name || "Untitled Patient")}</b><br><span class="muted">${escapeHtml(d.mrn || "No MRN")} • ${escapeHtml(d.updated_at || "")}</span><br><button onclick="openDraft(${i})">Open</button></div>`).join("");
  searchPatientCards();
}
function openDraft(i){
  const drafts = JSON.parse(localStorage.getItem("savedDrafts") || "[]");
  localStorage.setItem("currentSummary", JSON.stringify(drafts[i]));
  location.href = "builder.html";
}

async function loadBuilder(){
  renderDoctorName();
  seedInitialMedicines();
  await syncMedicinesFromSheets();
  let s = JSON.parse(localStorage.getItem("currentSummary") || "null");
  if(!s){ createNewSummary(); return; }
  const ids = ["patient_name","mrn","age","gender","bed","civil_id","contact","allergies","admission_date","discharge_date","admission_reason","final_diagnosis","history_of_patient","hospital_course","ecg","lab","echo","procedure_doctor","procedure_date","procedure_findings","pending_results","cognitive_status","functional_status","instruction_type","patient_instruction_text","followup_date","followup_time","followup_doctor","followup_room","followup_note"];
  ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=s[id] || ""; });
  document.getElementById("procedure_done").checked = !!s.procedure_done;
  document.getElementById("needs_caregiver").checked = !!s.needs_caregiver;
  if(document.getElementById("explained_patient")) document.getElementById("explained_patient").checked = !!s.explained_patient;
  if(document.getElementById("explained_caregiver")) document.getElementById("explained_caregiver").checked = !!s.explained_caregiver;
  document.querySelectorAll("input[name='access_site']").forEach(r=>r.checked = r.value === s.access_site);
  document.getElementById("sideName").textContent = s.patient_name || "New Patient";
  document.getElementById("sideMRN").textContent = "MRN: " + (s.mrn || "");
  document.getElementById("sideMeta").textContent = `Age: ${s.age || ""} • Bed: ${s.bed || ""}`;
  document.getElementById("updatedAt").textContent = s.updated_at || "Not saved yet";
  renderHomeMedications(s.home_medications || []);
  renderDischargeMedications(s.discharge_medications || []);
}

function collectSummary(){
  const old = JSON.parse(localStorage.getItem("currentSummary") || "{}");
  const s = {...old};
  const ids = ["patient_name","mrn","age","gender","bed","civil_id","contact","allergies","admission_date","discharge_date","admission_reason","final_diagnosis","history_of_patient","hospital_course","ecg","lab","echo","procedure_doctor","procedure_date","procedure_findings","pending_results","cognitive_status","functional_status","instruction_type","patient_instruction_text","followup_date","followup_time","followup_doctor","followup_room","followup_note"];
  ids.forEach(id=>{ const el=document.getElementById(id); if(el) s[id]=el.value; });
  s.procedure_done = document.getElementById("procedure_done")?.checked || false;
  s.needs_caregiver = document.getElementById("needs_caregiver")?.checked || false;
  s.explained_patient = document.getElementById("explained_patient")?.checked || false;
  s.explained_caregiver = document.getElementById("explained_caregiver")?.checked || false;
  const site = document.querySelector("input[name='access_site']:checked"); s.access_site = site ? site.value : "";
  s.home_medications = [...document.querySelectorAll(".home-row")].map(r=>{
    const selected = r.querySelector(".hm-action:checked");
    const action = selected ? selected.value : "";
    return {
      name: r.querySelector(".hm-name").value,
      action,
      continue: action === "continue",
      stop: action === "stop",
      change: action === "change",
      reason: r.querySelector(".hm-reason").value
    };
  });
  s.discharge_medications = [...document.querySelectorAll(".med-row")].map(r=>({
    medication: r.querySelector(".dm-med")?.value || "",
    purpose: r.querySelector(".dm-purpose")?.value || "",
    bbf: r.querySelector(".dm-bbf")?.checked || false,
    abf: r.querySelector(".dm-abf")?.checked || false,
    bl: r.querySelector(".dm-bl")?.checked || false,
    al: r.querySelector(".dm-al")?.checked || false,
    bd: r.querySelector(".dm-bd")?.checked || false,
    ad: r.querySelector(".dm-ad")?.checked || false,
    prn: r.querySelector(".dm-prn")?.checked || false,
    hs: r.querySelector(".dm-hs")?.checked || false,
    note: r.querySelector(".dm-note")?.value || "",
    timing: r.querySelector(".dm-note")?.value || "",
    start_date: r.querySelector(".dm-start")?.value || "",
    end_date: r.querySelector(".dm-end")?.value || ""
  }));
  s.updated_at = new Date().toLocaleString();
  return s;
}

function saveCurrent(){ const s=collectSummary(); localStorage.setItem("currentSummary", JSON.stringify(s)); return s; }
async function saveDraft(){
  const s = saveCurrent();
  s.doctor_name = DOCTOR_PROFILE.name;
  if(!s.summary_id) s.summary_id = uid();
  const drafts = JSON.parse(localStorage.getItem("savedDrafts") || "[]");
  const index = drafts.findIndex(d=>d.summary_id === s.summary_id || (d.mrn && s.mrn && d.mrn === s.mrn));
  if(index >= 0) drafts[index] = s; else drafts.unshift(s);
  localStorage.setItem("savedDrafts", JSON.stringify(drafts));
  localStorage.setItem("savedPatients", JSON.stringify(summariesToPatients(drafts)));
  const out = await saveSummaryToSheets(s);
  if(out.success){
    if(out.summary_id) s.summary_id = out.summary_id;
    localStorage.setItem("currentSummary", JSON.stringify(s));
    alert("Draft saved to Google Sheets. The patient will now appear on the dashboard.");
  }else{
    alert("Saved locally only. Google Sheets did not save: " + (out.error || "Unknown error") + "\n\nCheck Netlify environment variables and Sheet sharing.");
  }
  loadBuilder();
}
function validateSummary(){
  const s = saveCurrent();
  const missing = [];
  if(!s.patient_name) missing.push("Patient name");
  if(!s.mrn) missing.push("MRN");
  if(!s.final_diagnosis) missing.push("Final diagnosis");
  if(!s.discharge_date) missing.push("Discharge date");
  if(missing.length) alert("Missing required fields: " + missing.join(", "));
  else alert("Validation passed.");
}
function generateDraftText(){
  const s = saveCurrent();
  document.getElementById("hospital_course").value = s.hospital_course || `Patient was admitted due to ${s.admission_reason || "the presenting complaint"}. Diagnosis and treatment were completed during admission. Patient is planned for discharge in stable condition.`;
}
async function generateReports(){
  const s = saveCurrent();
  s.doctor_name = DOCTOR_PROFILE.name;
  const out = await saveSummaryToSheets(s);
  if(!out.success){
    console.warn("Report generated but Google Sheets save failed:", out.error);
  }
  location.href="reports.html";
}

function renderHomeMedications(items){
  const box=document.getElementById("homeMedications"); if(!box) return;
  box.innerHTML = ""; items.forEach(addHomeMedication);
  if(!items.length) addHomeMedication({name:"",action:"",reason:""});
}
function addHomeMedication(item={name:"",action:"",reason:""}){
  const box=document.getElementById("homeMedications"); if(!box) return;
  const div=document.createElement("div"); div.className="home-row";
  const rowId = "homeAction_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const action = item.action || (item.continue ? "continue" : item.stop ? "stop" : item.change ? "change" : "");
  div.innerHTML = `<div class="home-main-line">
      <div class="medicine-search-wrap"><input class="hm-name medicine-input" placeholder="Medication" value="${escapeHtml(item.name||"")}"><div class="medicine-suggestions"></div><button type="button" class="add-med-db" disabled>Add to DB</button></div>
      <div class="radio-group">
        <label><input class="hm-action" name="${rowId}" type="radio" value="continue" ${action==="continue"?"checked":""}> Continue</label>
        <label><input class="hm-action" name="${rowId}" type="radio" value="stop" ${action==="stop"?"checked":""}> Stop</label>
        <label><input class="hm-action" name="${rowId}" type="radio" value="change" ${action==="change"?"checked":""}> Change</label>
      </div>
      <input class="hm-reason" placeholder="Reason" value="${escapeHtml(item.reason||"")}">
      <button class="remove" onclick="this.closest('.home-row').remove()">x</button>
    </div>`;
  box.appendChild(div);
  setupMedicineSearch(div, ".hm-name", { fillDetails:false });
}
function renderDischargeMedications(items){
  const box=document.getElementById("dischargeMedications"); if(!box) return;
  box.innerHTML = ""; items.forEach(addDischargeMedication);
  if(!items.length) addDischargeMedication({medication:"",purpose:"",note:"",start_date:"",end_date:""});
}
function checked(v){ return v ? "checked" : ""; }
function addDischargeMedication(item={medication:"",purpose:"",note:"",start_date:"",end_date:""}){
  const box=document.getElementById("dischargeMedications"); if(!box) return;
  const div=document.createElement("div"); div.className="med-row";
  div.innerHTML = `<div class="med-main-line">
      <div class="medicine-search-wrap"><input class="dm-med medicine-input" placeholder="Medication" value="${escapeHtml(item.medication||"")}"><div class="medicine-suggestions"></div><button type="button" class="add-med-db" disabled>Add to DB</button></div>
      <input class="dm-purpose" placeholder="Purpose" value="${escapeHtml(item.purpose||"")}">
      <button class="remove" onclick="this.closest('.med-row').remove()">x</button>
    </div>
    <div class="med-details-line">
      <div class="dose-options">
        <label>BBF<input class="dm-bbf" type="checkbox" ${checked(item.bbf)}></label>
        <label>ABF<input class="dm-abf" type="checkbox" ${checked(item.abf)}></label>
        <label>BL<input class="dm-bl" type="checkbox" ${checked(item.bl)}></label>
        <label>AL<input class="dm-al" type="checkbox" ${checked(item.al)}></label>
        <label>BD<input class="dm-bd" type="checkbox" ${checked(item.bd)}></label>
        <label>AD<input class="dm-ad" type="checkbox" ${checked(item.ad)}></label>
        <label>PRN<input class="dm-prn" type="checkbox" ${checked(item.prn)}></label>
        <label>HS<input class="dm-hs" type="checkbox" ${checked(item.hs)}></label>
      </div>
      <input class="dm-note" placeholder="Note / how to take" value="${escapeHtml(item.note || item.timing || "")}">
      <div class="date-item"><label>Start Date</label><input class="dm-start" type="date" value="${escapeHtml(item.start_date||"")}"></div>
      <div class="date-item"><label>End Date</label><input class="dm-end" type="date" value="${escapeHtml(item.end_date||"")}"></div>
    </div>`;
  box.appendChild(div);
  setupMedicineSearch(div, ".dm-med", { fillDetails:true });
  setupSmartMedicineRow(div);
}
function setupSmartMedicineRow(row){
  const input = row.querySelector(".dm-med");
  const details = row.querySelector(".med-details-line");
  if(!input || !details) return;
  const refresh = () => {
    const hasMedicine = input.value.trim().length > 0;
    details.classList.toggle("is-hidden", !hasMedicine);
  };
  input.addEventListener("input", refresh);
  input.addEventListener("change", refresh);
  refresh();
}

function autoInstruction(){
  const type = document.getElementById("instruction_type").value;
  const text = {
    "General Discharge Instructions":"Take your medicines as prescribed. Attend your follow-up visit. Return to the emergency department if severe symptoms occur.",
    "Medication Instructions":"Do not stop blood thinner medicines unless your doctor tells you. Take medicines at the same time every day.",
    "Radial Access Care Instructions":"Keep the wrist area clean and dry. Avoid heavy lifting for several days. Seek help if swelling or bleeding occurs.",
    "Femoral Access Care Instructions":"Keep the groin wound clean and dry. Avoid heavy activity and seek urgent care for bleeding or swelling.",
    "Post-Catheterization Care":"Avoid heavy lifting for 7 days. Keep the access site clean and dry. Walk as tolerated.",
    "Lifestyle & Activity Instructions":"Walk as tolerated. Avoid smoking. Slowly return to daily activity as advised.",
    "Diet Instructions":"Eat a heart-healthy diet. Reduce salt and fatty foods.",
    "Warning Signs":"Go to the ER immediately if you have chest pain, shortness of breath, bleeding, swelling, dizziness, or fainting.",
    "Follow-up Instructions":"Bring this paper to your next visit and do not miss your follow-up appointment."
  };
  document.getElementById("patient_instruction_text").value = text[type] || "";
}

function renderReports(){
  renderDoctorName();
  const s = JSON.parse(localStorage.getItem("currentSummary") || "{}");
  document.getElementById("doctorReport").innerHTML = doctorReportHtml(s);
  document.getElementById("patientReport").innerHTML = patientReportHtml(s);
}
function formatDate(d){ if(!d) return ""; const x=new Date(d); return isNaN(x)?d:x.toLocaleDateString("en-GB"); }
function doctorReportHtml(s){
  const safe = v => escapeHtml(v || "");
  const hasValue = v => String(v ?? "").trim() !== "";
  const cap = v => hasValue(v) ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "";
  const line = (label, value) => hasValue(value) ? `<p><b>${label}:</b><br>${nl(value)}</p>` : "";
  const inlineLine = (label, value) => hasValue(value) ? `<b>${label}:</b> ${escapeHtml(value)}` : "";

  const procedureLines = [];
  if(hasValue(s.access_site)) procedureLines.push(inlineLine("Access Site", s.access_site));
  const pciParts = [];
  if(s.procedure_done) pciParts.push("Yes");
  if(hasValue(s.procedure_doctor)) pciParts.push(`Dr.: ${escapeHtml(s.procedure_doctor)}`);
  if(hasValue(s.procedure_date)) pciParts.push(`Date: ${formatDate(s.procedure_date)}`);
  if(pciParts.length) procedureLines.push(`<b>PCI:</b> ${pciParts.join(", ")}`);
  if(hasValue(s.procedure_findings)) procedureLines.push(`<b>Finding:</b> ${nl(s.procedure_findings)}`);
  const procedureHtml = procedureLines.length
    ? `<p><b>Coronary Procedure:</b><br>${procedureLines.join("<br>")}</p>`
    : "";

  const homeItems = (s.home_medications || [])
    .filter(m => hasValue(m.name) || hasValue(m.action) || hasValue(m.reason))
    .map((m, i) => {
      const action = cap(m.action || (m.continue ? "continue" : m.stop ? "stop" : m.change ? "change" : ""));
      let parts = [`${i + 1}- ${safe(m.name)}`];
      if(hasValue(action)) parts.push(`(${escapeHtml(action)})`);
      if(hasValue(m.reason)) parts.push(`Reason: ${safe(m.reason)}`);
      return `<div class="report-paragraph-item">${parts.join(" ")}</div>`;
    }).join("");
  const homeHtml = homeItems ? `<p><b>Home Medications:</b></p><div class="report-paragraph-list">${homeItems}</div>` : "";

  const dischargeItems = (s.discharge_medications || [])
    .filter(m => hasValue(m.medication) || hasValue(m.purpose) || hasValue(m.note) || hasValue(m.timing) || hasValue(timingAbbrev(m)) || hasValue(m.start_date) || hasValue(m.end_date))
    .map((m, i) => {
      const rows = [];
      rows.push(`<b>${i + 1}- ${safe(m.medication || "Medication")}</b>`);
      const time = timingAbbrev(m);
      if(hasValue(time)) rows.push(`<b>Time:</b> ${escapeHtml(time)}`);
      if(hasValue(m.purpose)) rows.push(`<b>Purpose:</b> ${safe(m.purpose)}`);
      if(hasValue(m.note || m.timing)) rows.push(`<b>Note / How to take:</b> ${safe(m.note || m.timing)}`);
      if(hasValue(m.start_date)) rows.push(`<b>Start Date:</b> ${formatDate(m.start_date)}`);
      if(hasValue(m.end_date)) rows.push(`<b>End Date:</b> ${formatDate(m.end_date)}`);
      return `<div class="report-paragraph-item">${rows.join("<br>")}</div>`;
    }).join("");
  const dischargeHtml = dischargeItems ? `<p><b>Discharge Medications:</b></p><div class="report-paragraph-list">${dischargeItems}</div>` : "";

  const investigationLines = [
    hasValue(s.ecg) ? `ECG: ${nl(s.ecg)}` : "",
    hasValue(s.lab) ? `Lab: ${nl(s.lab)}` : "",
    hasValue(s.echo) ? `Echo: ${nl(s.echo)}` : ""
  ].filter(Boolean).join("<br>");
  const investigationHtml = investigationLines ? `<p><b>Hospital Investigation:</b><br>${investigationLines}</p>` : "";

  const opdParts = [];
  if(hasValue(s.followup_doctor)) opdParts.push(`Doctor Name: ${safe(s.followup_doctor)}`);
  if(hasValue(s.followup_date)) opdParts.push(`Date: ${formatDate(s.followup_date)}`);
  if(hasValue(s.followup_time)) opdParts.push(`Time: ${safe(s.followup_time)}`);
  if(hasValue(s.followup_room)) opdParts.push(`Room/Location: ${safe(s.followup_room)}`);
  if(hasValue(s.followup_note)) opdParts.push(`Note: ${nl(s.followup_note)}`);
  const opdHtml = opdParts.length ? `<p><b>OPD Appointment:</b><br>${opdParts.join("<br>")}</p>` : "";

  return `<h1>DISCHARGE SUMMARY</h1><h3 style="text-align:center">JABER AL AHMAD HOSPITAL - CARDIOLOGY DEPARTMENT</h3>
  <table class="doctor-table"><tr><td><b>Patient Name:</b> ${safe(s.patient_name)}</td><td><b>Age / Gender:</b> ${safe(s.age)}${hasValue(s.gender)?" / "+safe(s.gender):""}</td></tr><tr><td><b>MRN:</b> ${safe(s.mrn)}</td><td><b>Bed:</b> ${safe(s.bed)}</td></tr><tr><td><b>Admission Date:</b> ${formatDate(s.admission_date)}</td><td><b>Discharge Date:</b> ${formatDate(s.discharge_date)}</td></tr></table>
  ${line("Final Diagnosis", s.final_diagnosis)}${line("History of Patient", s.history_of_patient)}${line("Hospital Course", s.hospital_course)}
  ${investigationHtml}
  ${procedureHtml}
  ${homeHtml}
  ${dischargeHtml}
  ${line("Discharge Plan", s.patient_instruction_text)}${line("Pending Labs & Investigations", s.pending_results)}${opdHtml}`;
}
function timingAbbrev(m){
  const labels = [];
  if(m.bbf) labels.push("BBF");
  if(m.abf) labels.push("ABF");
  if(m.bl) labels.push("BL");
  if(m.al) labels.push("AL");
  if(m.bd) labels.push("BD");
  if(m.ad) labels.push("AD");
  if(m.prn) labels.push("PRN");
  if(m.hs) labels.push("HS");
  return labels.join(" / ");
}
function timingLabel(m){
  const labels = [];
  if(m.bbf) labels.push("before breakfast");
  if(m.abf) labels.push("after breakfast");
  if(m.bl) labels.push("before lunch");
  if(m.al) labels.push("after lunch");
  if(m.bd) labels.push("before dinner");
  if(m.ad) labels.push("after dinner");
  if(m.prn) labels.push("when needed");
  if(m.hs) labels.push("at bedtime");
  return labels.join(", ");
}
function patientReportHtml(s){
  const meds=(s.discharge_medications||[]).filter(m=>m.medication||m.purpose||m.note||m.timing).map(m=>`<tr><td>${escapeHtml(m.medication)}</td><td>${escapeHtml(m.purpose)}</td><td>${escapeHtml(m.note || m.timing || timingLabel(m))}</td></tr>`).join("");
  return `<div class="patient-sheet"><div class="patient-header"><span>🏥 JABER AL AHMAD HOSPITAL</span><span>📅 Discharge Date: ${formatDate(s.discharge_date)}</span></div>
  <div class="patient-info"><span>Patient Name: ${escapeHtml(s.patient_name)}</span><span>Patient ID: ${escapeHtml(s.mrn)}</span></div>
  <div class="patient-body"><div><div class="p-section"><h3><span class="num">1</span>WHAT HAPPENED TO YOU?</h3><p>You had a heart procedure called PCI/stent treatment to improve blood flow. ${escapeHtml(s.admission_reason||"")}</p></div>
  <div class="p-section"><h3><span class="num">2</span>YOUR MEDICATIONS</h3><table class="med-table"><tr><th>Medication</th><th>Purpose</th><th>How to take</th></tr>${meds}</table><p style="color:red;font-weight:700">⚠ Do NOT stop these medications unless your doctor tells you.</p></div>
  <div class="p-section"><h3><span class="num">3</span>WARNING SIGNS</h3><div class="warning">Go to the ER immediately if you have:<ul><li>Chest pain</li><li>Shortness of breath</li><li>Bleeding or swelling at the wound site</li><li>Dizziness or fainting</li></ul></div></div></div>
  <div><div class="p-section"><h3><span class="num">4</span>FOLLOW-UP</h3><p>📅 Appointment: ${formatDate(s.followup_date)} ${escapeHtml(s.followup_time||"")}</p><p>📍 Location: ${escapeHtml(s.followup_room)}</p><p>👨‍⚕️ Doctor: ${escapeHtml(s.followup_doctor)}</p></div>
  <div class="p-section"><h3><span class="num">5</span>DAILY INSTRUCTIONS</h3><p><b>Activity</b><br>Avoid heavy lifting for 7 days. Walk as tolerated.</p><p><b>Wound Care</b><br>Keep the area clean and dry. Do not soak in water for 5 days.</p><p><b>Diet</b><br>Eat a heart-healthy diet. Reduce salt and fatty foods.</p></div></div></div>
  <div class="notes"><h3><span class="num">6</span>IMPORTANT NOTES</h3><ul><li>Bring this paper to your next visit.</li><li>Take your medications exactly as prescribed.</li><li>Do not miss your follow-up appointment.</li></ul><p>${nl(s.followup_note||"")}</p></div><div class="footer-strip">Clear information. Better understanding. Safer recovery.</div></div>`;
}
function printDoctorReport(){ printPart("doctorReport"); }
function printPatientReport(){ printPart("patientReport"); }
function downloadDoctorPDF(){ printDoctorReport(); }
function downloadPatientPDF(){ printPatientReport(); }
function printPart(id){
  const html = document.getElementById(id).innerHTML;
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Print</title><link rel="stylesheet" href="style.css"></head><body>${html}</body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
}
function escapeHtml(v){ return String(v ?? "").replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function nl(v){ return escapeHtml(v).replace(/\n/g,"<br>"); }

function builderSearchHint(){ const q = document.getElementById("builderSearch")?.value?.trim(); if(!q) return; }

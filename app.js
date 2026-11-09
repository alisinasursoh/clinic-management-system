const DB_NAME = "CarePointClinicDB";
const DB_VERSION = 1;
const stores = ["patients", "appointments", "doctors", "specialties", "treatments", "billing"];
const labels = {
  patients: "Patients", appointments: "Appointments", doctors: "Doctors",
  specialties: "Specialties", treatments: "Treatments", billing: "Billing"
};
const fields = {
  patients: [
    ["name","Full name","text",true],["age","Age","number",true],["gender","Gender","select",true,["Male","Female","Other"]],
    ["phone","Phone","tel",false],["email","Email","email",false],["bloodGroup","Blood group","select",false,["A+","A-","B+","B-","AB+","AB-","O+","O-"]],
    ["address","Address","text",false]
  ],
  doctors: [
    ["name","Doctor name","text",true],["specialty","Specialty","text",true],["phone","Phone","tel",false],
    ["email","Email","email",false],["availability","Availability","select",false,["Available","On Leave","Busy"]]
  ],
  specialties: [["name","Specialty name","text",true],["description","Description","text",false]],
  treatments: [["name","Treatment name","text",true],["price","Price","number",true],["description","Description","text",false]],
  appointments: [
    ["patient","Patient name","text",true],["doctor","Doctor name","text",true],["date","Date","date",true],
    ["time","Time","time",true],["reason","Reason","text",false],["status","Status","select",true,["Scheduled","Completed","Cancelled"]]
  ],
  billing: [
    ["patient","Patient name","text",true],["treatment","Treatment","text",true],["amount","Amount","number",true],
    ["date","Billing date","date",true],["status","Payment status","select",true,["Paid","Unpaid"]]
  ]
};
let db, activeView = "dashboard", editing = null, toastTimer;

function openDB() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      stores.forEach(store => {
        if (!database.objectStoreNames.contains(store)) database.createObjectStore(store,{keyPath:"id",autoIncrement:true});
      });
    };
    request.onsuccess = () => { db=request.result; resolve(db); };
    request.onerror = () => reject(request.error);
  });
}
function getAll(store) {
  return new Promise((resolve,reject) => {
    const req=db.transaction(store,"readonly").objectStore(store).getAll();
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
function save(store,data) {
  return new Promise((resolve,reject) => {
    const tx=db.transaction(store,"readwrite");
    const req=data.id ? tx.objectStore(store).put(data) : tx.objectStore(store).add(data);
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
function remove(store,id) {
  return new Promise((resolve,reject) => {
    const tx=db.transaction(store,"readwrite"); tx.objectStore(store).delete(Number(id));
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}
function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function initials(name="") { return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase() || "—"; }
function today() { return new Date().toISOString().slice(0,10); }
function formatDate(date) { if(!date) return "—"; return new Date(date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function showToast(message) {
  const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function setPage(title) { document.getElementById("pageTitle").textContent=title; }
function setActiveNav(view) {
  document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
async function render() {
  setActiveNav(activeView);
  if(activeView==="dashboard") return renderDashboard();
  if(activeView==="settings") return renderSettings();
  return renderTable(activeView);
}
function statCard(label,value,icon,foot) {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></article>`;
}
async function renderDashboard() {
  setPage("Dashboard");
  const [patients,appointments,doctors,bills]=await Promise.all(["patients","appointments","doctors","billing"].map(getAll));
  const todayAppointments=appointments.filter(a=>a.date===today() && a.status!=="Cancelled");
  const unpaid=bills.filter(b=>b.status==="Unpaid").reduce((s,b)=>s+Number(b.amount||0),0);
  const recent=appointments.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);
  document.getElementById("viewRoot").innerHTML=`
    <div class="welcome-row"><div><h2>Good ${new Date().getHours()<12?"morning":new Date().getHours()<18?"afternoon":"evening"}, Admin 👋</h2><p>Here’s what’s happening at your clinic today.</p></div><div class="date-chip">${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div>
    <div class="stats-grid">
      ${statCard("Total patients",patients.length,"♙","Registered patient records")}
      ${statCard("Today's appointments",todayAppointments.length,"▣","Scheduled for today")}
      ${statCard("Available doctors",doctors.filter(d=>d.availability!=="On Leave").length,"⚕","Based on doctor status")}
      ${statCard("Outstanding billing",unpaid.toLocaleString(undefined,{maximumFractionDigits:2}),"＄","Unpaid invoices")}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-head"><h3>Recent appointments</h3><button class="text-btn" data-goto="appointments">View all →</button></div>
        ${recent.length?`<div class="table-wrap"><table><thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead><tbody>${recent.map(a=>`<tr><td><div class="person-cell"><span class="mini-avatar">${initials(a.patient)}</span>${escapeHTML(a.patient)}</div></td><td>${escapeHTML(a.doctor)}</td><td>${formatDate(a.date)}</td><td>${statusPill(a.status)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty-state">No appointments yet. Add your first appointment to get started.</div>`}
      </section>
      <section class="panel"><div class="panel-head"><h3>Today's schedule</h3><button class="text-btn" data-goto="appointments">Manage →</button></div>
        <div class="appointment-list">${todayAppointments.length?todayAppointments.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map(a=>`<div class="appointment-item"><div class="time-box"><b>${escapeHTML(a.time||"—")}</b><small>${formatDate(a.date)}</small></div><div class="appointment-info"><b>${escapeHTML(a.patient)}</b><small>with ${escapeHTML(a.doctor)}</small></div>${statusPill(a.status)}</div>`).join(""):`<div class="empty-state">Your schedule is clear for today.</div>`}</div>
      </section>
    </div>`;
}
function statusPill(status="") {
  const cls=String(status).toLowerCase()==="cancelled"?"cancelled":String(status).toLowerCase()==="unpaid"?"unpaid":String(status).toLowerCase()==="paid"||String(status).toLowerCase()==="completed"?"paid":"pending";
  return `<span class="pill ${cls}">${escapeHTML(status||"—")}</span>`;
}
async function renderTable(store) {
  setPage(labels[store]);
  const records=await getAll(store);
  const columns=fields[store].map(f=>f[0]);
  const searchLabel=store==="patients"?"Search patients...":`Search ${labels[store].toLowerCase()}...`;
  document.getElementById("viewRoot").innerHTML=`
    <div class="page-toolbar"><div><h2>${labels[store]} directory</h2></div><div class="toolbar-actions"><input class="search-input" id="tableSearch" placeholder="${searchLabel}" aria-label="${searchLabel}"><button class="primary-btn compact" id="addRecord">＋ Add ${store==="billing"?"Bill":labels[store].slice(0,-1)}</button></div></div>
    <section class="panel data-panel"><div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${c.replace(/([A-Z])/g," $1")}</th>`).join("")}<th>Actions</th></tr></thead><tbody id="tableBody"></tbody></table></div><div id="tableEmpty" class="empty-state" hidden>No records found. Add a new record to get started.</div></section>`;
  const draw=(query="")=>{
    const filtered=records.filter(r=>columns.some(c=>String(r[c]??"").toLowerCase().includes(query.toLowerCase())));
    document.getElementById("tableBody").innerHTML=filtered.map(r=>`<tr>${columns.map(c=>`<td>${c==="name"||c==="patient"?`<div class="person-cell"><span class="mini-avatar">${initials(r[c])}</span>${escapeHTML(r[c])}</div>`:c==="status"||c==="availability"?statusPill(r[c]):c==="date"?formatDate(r[c]):escapeHTML(r[c]??"—")}</td>`).join("")}<td><button class="action-btn" data-edit="${r.id}">Edit</button><button class="action-btn delete" data-delete="${r.id}">Delete</button></td></tr>`).join("");
    document.getElementById("tableEmpty").hidden=filtered.length>0;
  };
  draw();
  document.getElementById("tableSearch").addEventListener("input",e=>draw(e.target.value));
  document.getElementById("addRecord").addEventListener("click",()=>openModal(store));
  document.getElementById("tableBody").addEventListener("click",async e=>{
    const edit=e.target.closest("[data-edit]"), del=e.target.closest("[data-delete]");
    if(edit){const item=records.find(r=>r.id===Number(edit.dataset.edit));openModal(store,item);}
    if(del && confirm("Delete this record? This action cannot be undone.")){await remove(store,del.dataset.delete);showToast("Record deleted");render();}
  });
}
function renderSettings() {
  setPage("Data & Settings");
  document.getElementById("viewRoot").innerHTML=`
    <div class="welcome-row"><div><h2>Data & settings</h2><p>Manage your local clinic records and keep a backup.</p></div></div>
    <div class="settings-grid">
      <section class="panel settings-card"><h3>Export database</h3><p>Download all clinic records as a JSON backup file. Keep it somewhere safe.</p><button class="primary-btn compact" id="exportData">Download backup</button></section>
      <section class="panel settings-card"><h3>Import database</h3><p>Restore records from a CarePoint JSON backup. Existing records with matching IDs may be updated.</p><input type="file" id="importFile" accept="application/json" class="search-input"><button class="primary-btn compact" id="importData">Import backup</button></section>
      <section class="panel settings-card"><h3>Storage information</h3><p>This demo stores information in IndexedDB in your browser. Records remain on this device and are not sent to a server.</p><span class="pill paid">IndexedDB active</span></section>
      <section class="panel settings-card"><h3>Clear all data</h3><p>Permanently remove all records from this browser. Export a backup first if you need to keep your data.</p><button class="primary-btn compact danger-btn" id="clearData">Clear all records</button></section>
    </div>`;
  document.getElementById("exportData").onclick=exportBackup;
  document.getElementById("importData").onclick=importBackup;
  document.getElementById("clearData").onclick=clearData;
}
async function openModal(store,record=null) {
  editing=record?{store,id:record.id}:null;
  document.getElementById("modalTitle").textContent=(record?"Edit ":"Add ")+(store==="billing"?"Bill":labels[store].slice(0,-1));
  const container=document.getElementById("formFields");
  container.innerHTML=fields[store].map(([key,label,type,required,options])=>{
    const value=record?.[key]??"";
    let control=type==="select"?`<select id="f_${key}" ${required?"required":""}><option value="">Select ${label.toLowerCase()}</option>${options.map(o=>`<option ${value===o?"selected":""}>${o}</option>`).join("")}</select>`:`<input id="f_${key}" type="${type}" value="${escapeHTML(value)}" ${required?"required":""} ${type==="number"?'min="0"':''}>`;
    return `<div class="field"><label for="f_${key}">${label}${required?" *":""}</label>${control}</div>`;
  }).join("");
  document.getElementById("modalBackdrop").hidden=false;
}
function closeModal(){document.getElementById("modalBackdrop").hidden=true;editing=null;document.getElementById("recordForm").reset();}
async function submitForm(e) {
  e.preventDefault(); if(!activeView||!fields[activeView])return;
  const data={};
  fields[activeView].forEach(([key])=>{const el=document.getElementById("f_"+key);data[key]=el.type==="number"?Number(el.value):el.value.trim();});
  if(editing)data.id=editing.id;
  await save(activeView,data);closeModal();showToast("Record saved successfully");render();
}
async function exportBackup() {
  const data={app:"CarePoint Clinic Management System",version:1,exportedAt:new Date().toISOString(),records:{}};
  for(const store of stores)data.records[store]=await getAll(store);
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="carepoint-clinic-backup.json";a.click();URL.revokeObjectURL(url);showToast("Backup downloaded");
}
async function importBackup() {
  const file=document.getElementById("importFile").files[0];if(!file)return showToast("Choose a JSON backup file first");
  try{
    const data=JSON.parse(await file.text());if(!data.records)throw new Error("Invalid backup");
    for(const store of stores)for(const item of data.records[store]||[])await save(store,item);
    showToast("Backup imported successfully");render();
  }catch(err){alert("Could not import this file. Please choose a valid CarePoint backup.");}
}
async function clearData() {
  if(!confirm("Are you sure? All clinic records in this browser will be permanently deleted."))return;
  for(const store of stores)await new Promise((resolve,reject)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  showToast("All records cleared");render();
}
function navigate(view){activeView=view;document.getElementById("sidebar").classList.remove("open");render();}
document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
document.getElementById("viewRoot").addEventListener("click",e=>{const goto=e.target.closest("[data-goto]");if(goto)navigate(goto.dataset.goto);});
document.getElementById("quickAdd").addEventListener("click",()=>openModal(activeView==="dashboard"?"patients":activeView==="settings"?"patients":activeView));
document.getElementById("modalClose").onclick=closeModal;
document.getElementById("cancelModal").onclick=closeModal;
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal();});
document.getElementById("recordForm").addEventListener("submit",submitForm);
document.getElementById("menuToggle").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
(async()=>{try{await openDB();await render();}catch(e){document.getElementById("viewRoot").innerHTML='<div class="panel empty-state">Your browser could not open local storage. Please use a recent version of Chrome, Edge, Firefox, or Safari.</div>';}})();

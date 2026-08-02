const priorities=[
  {icon:'↗',title:'Review 7 new referrals',text:'Three Medicare and two NDIS referrals have not yet been triaged.',impact:'Potential value: $4,820'},
  {icon:'◷',title:'Fill 5 diary gaps',text:'Tomorrow afternoon has capacity across Physiotherapy and Dietetics.',impact:'Recoverable revenue: $1,130'},
  {icon:'↻',title:'Contact 3 patients',text:'WorkCover patients have not rebooked after their last appointment.',impact:'Retention risk: High'},
  {icon:'✎',title:'Complete 2 reports',text:'Clinical reports are approaching the internal turnaround target.',impact:'Due within 24 hours'}
];
const kpis=[
  ['Revenue','$184,620','↑ 8.4% vs target','up'],['Utilisation','86%','↑ 4.2% this month','up'],['New patients','137','↑ 12 vs last month','up'],['Rebooking','78%','↓ 2.1% this month','down'],['Cancellations','6.4%','Within target','neutral'],['Referrals','94','↑ 15% this month','up']
];
const diary=[['Physiotherapy',91],['Exercise Physiology',73],['Podiatry',88],['Dietetics',61],['Diabetes Education',79]];
const referralSeed=[
  {id:1,patient:'Amelia Turner',type:'Medicare',referrer:'Dr Priya Shah',received:'21 Jul 2026',status:'Needs Review',assigned:'Oakleigh Benson',channel:'Fax',discipline:'Physiotherapy'},
  {id:2,patient:'Noah Williams',type:'NDIS',referrer:'Northside Support Co.',received:'21 Jul 2026',status:'Information Missing',assigned:'Lily Pearson',channel:'Email',discipline:'Dietetics'},
  {id:3,patient:'Olivia Martin',type:'WorkCover',referrer:'WorkCover Queensland',received:'20 Jul 2026',status:'Patient Contacted',assigned:'Declan Frankel',channel:'Email',discipline:'Exercise Physiology'},
  {id:4,patient:'Liam Thompson',type:'DVA',referrer:'Dr Michael Chen',received:'20 Jul 2026',status:'Appointment Booked',assigned:'Gemma Brown',channel:'Fax',discipline:'Podiatry'},
  {id:5,patient:'Sophie Wilson',type:'Private',referrer:'Dr Emma Jones',received:'19 Jul 2026',status:'Active',assigned:'Caitlin Theocharis',channel:'In person',discipline:'Physiotherapy'},
  {id:6,patient:'Ethan Davis',type:'Aged Care',referrer:'Huntley Home Care',received:'18 Jul 2026',status:'Appointment Booked',assigned:'Lily Pearson',channel:'Email',discipline:'Dietetics'},
  {id:7,patient:'Mia Anderson',type:'Medicare',referrer:'Dr Sanjay Patel',received:'18 Jul 2026',status:'Needs Review',assigned:'Sarthak Kohli',channel:'Fax',discipline:'Physiotherapy'}
];
let referrals=[...referralSeed];
const priorityGrid=document.querySelector('#priorityGrid');
priorityGrid.innerHTML=priorities.map(p=>`<article class="priority-card"><div class="priority-icon">${p.icon}</div><strong>${p.title}</strong><p>${p.text}</p><div class="impact">${p.impact}</div></article>`).join('');
document.querySelector('#kpiGrid').innerHTML=kpis.map(k=>`<article class="kpi-card"><span class="label">${k[0]}</span><strong>${k[1]}</strong><span class="trend ${k[3]}">${k[2]}</span></article>`).join('');
document.querySelector('#diaryBars').innerHTML=diary.map(d=>`<div class="bar-row"><span>${d[0]}</span><div class="bar-track"><div class="bar-fill" style="width:${d[1]}%"></div></div><strong>${d[1]}%</strong></div>`).join('');
const pipelineData=[['Needs review',7],['Patient contacted',11],['Appointment booked',18],['Active',46],['Expiring soon',5]];
document.querySelector('#pipeline').innerHTML=pipelineData.map(p=>`<div class="pipeline-row"><span>${p[0]}</span><strong>${p[1]}</strong></div>`).join('');

document.querySelector('#todayLabel').textContent=new Intl.DateTimeFormat('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()).toUpperCase();

function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.querySelector(`#view-${name}`)?.classList.add('active');document.querySelectorAll('.nav-item[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===name));document.querySelector('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewTarget)));
document.querySelector('#menuButton').addEventListener('click',()=>document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#themeButton').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('pulse-theme',document.body.classList.contains('dark')?'dark':'light')});
if(localStorage.getItem('pulse-theme')==='dark')document.body.classList.add('dark');
document.querySelector('#refreshBrief').addEventListener('click',e=>{const old=e.target.textContent;e.target.textContent='✓ Brief refreshed';setTimeout(()=>e.target.textContent=old,1600)});

const statusClass=s=>s==='Needs Review'?'review':s==='Patient Contacted'?'contact':s==='Appointment Booked'?'booked':s==='Information Missing'?'missing':'active';
function renderReferrals(){
 const q=document.querySelector('#referralSearch').value.toLowerCase();
 const type=document.querySelector('#typeFilter').value;
 const status=document.querySelector('#statusFilter').value;
 const filtered=referrals.filter(r=>(r.patient.toLowerCase().includes(q)||r.referrer.toLowerCase().includes(q))&&(type==='all'||r.type===type)&&(status==='all'||r.status===status));
 document.querySelector('#referralTable').innerHTML=filtered.map(r=>`<tr><td class="patient-cell"><strong>${r.patient}</strong><span>${r.discipline}</span></td><td><span class="type-chip">${r.type}</span></td><td>${r.referrer}</td><td>${r.received}</td><td><span class="status-chip ${statusClass(r.status)}">${r.status}</span></td><td>${r.assigned}</td><td><button class="row-action" data-open-referral="${r.id}">View →</button></td></tr>`).join('')||'<tr><td colspan="7">No referrals match these filters.</td></tr>';
 document.querySelectorAll('[data-open-referral]').forEach(b=>b.addEventListener('click',()=>openDrawer(Number(b.dataset.openReferral))));
 const counts=[['Total referrals',referrals.length],['Needs review',referrals.filter(r=>r.status==='Needs Review').length],['Awaiting booking',referrals.filter(r=>['Patient Contacted','Information Missing'].includes(r.status)).length],['Booked / active',referrals.filter(r=>['Appointment Booked','Active'].includes(r.status)).length],['Expiring soon',5]];
 document.querySelector('#referralStats').innerHTML=counts.map(c=>`<article class="stat-card"><span>${c[0]}</span><strong>${c[1]}</strong></article>`).join('');
}
['#referralSearch','#typeFilter','#statusFilter'].forEach(s=>document.querySelector(s).addEventListener('input',renderReferrals));
renderReferrals();

function openDrawer(id){const r=referrals.find(x=>x.id===id);document.querySelector('#drawerContent').innerHTML=`<p class="eyebrow">${r.type.toUpperCase()} REFERRAL</p><h2>${r.patient}</h2><p>${r.discipline} referral received via ${r.channel.toLowerCase()}.</p><div class="drawer-meta"><div class="meta-box"><span>STATUS</span><strong>${r.status}</strong></div><div class="meta-box"><span>ASSIGNED TO</span><strong>${r.assigned}</strong></div><div class="meta-box"><span>REFERRER</span><strong>${r.referrer}</strong></div><div class="meta-box"><span>RECEIVED</span><strong>${r.received}</strong></div></div><button class="primary-button">Update status</button><h3>Activity history</h3><div class="timeline"><div class="timeline-item"><strong>Referral received</strong><span>${r.received} · ${r.channel}</span></div><div class="timeline-item"><strong>Assigned to ${r.assigned}</strong><span>Automatically routed by discipline</span></div><div class="timeline-item"><strong>Awaiting next action</strong><span>Current status: ${r.status}</span></div></div>`;document.querySelector('#referralDrawer').classList.add('open');document.querySelector('#drawerBackdrop').classList.add('open');}
function closeDrawer(){document.querySelector('#referralDrawer').classList.remove('open');document.querySelector('#drawerBackdrop').classList.remove('open');}
document.querySelector('#drawerClose').addEventListener('click',closeDrawer);document.querySelector('#drawerBackdrop').addEventListener('click',closeDrawer);

function openModal(){document.querySelector('#modalBackdrop').classList.add('open')}
function closeModal(){document.querySelector('#modalBackdrop').classList.remove('open')}
document.querySelector('#newReferralButton').addEventListener('click',openModal);['#modalClose','#modalCancel'].forEach(s=>document.querySelector(s).addEventListener('click',closeModal));
document.querySelector('#referralForm').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.target);referrals.unshift({id:Date.now(),patient:d.get('patient'),type:d.get('type'),referrer:d.get('referrer'),received:new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(new Date()),status:d.get('status'),assigned:d.get('assigned'),channel:d.get('channel'),discipline:d.get('type')==='NDIS'?'Allied Health':'Physiotherapy'});e.target.reset();closeModal();renderReferrals();});

const integrationMessage=document.querySelector('#clinikoMessage');
const formatDate=value=>value?new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Never';
async function pulseJson(path,options){const response=await fetch(path,{...options,headers:{Accept:'application/json',...(options?.headers||{})}});const body=await response.json().catch(()=>({error:'The request could not be completed.'}));if(!response.ok)throw new Error(body.error||'The request could not be completed.');return body}
async function loadClinikoIntegration(){try{const [me,status,counts,jobs]=await Promise.all([pulseJson('/api/auth/me'),pulseJson('/api/integrations/cliniko/status'),pulseJson('/api/integrations/cliniko/counts'),pulseJson('/api/integrations/cliniko/sync-jobs?limit=8')]);const allowed=me.user.roles.some(role=>['DIRECTOR','PRACTICE_MANAGER'].includes(role));document.querySelector('#clinikoTestButton').hidden=!allowed;document.querySelector('#clinikoSyncButton').hidden=!allowed;document.querySelector('#clinikoStatus').textContent=status.status;document.querySelector('#clinikoConfigured').textContent=status.configured?'Yes':'No';document.querySelector('#clinikoLastSuccess').textContent=formatDate(status.lastSuccessfulSyncAt);document.querySelector('#clinikoLastFailure').textContent=formatDate(status.lastFailedSyncAt);document.querySelector('#clinikoSyncButton').disabled=status.syncRunning;document.querySelector('#clinikoCounts').innerHTML=Object.entries(counts.counts).map(([name,count])=>`<div><span>${name}</span><strong>${count}</strong></div>`).join('');document.querySelector('#clinikoJobs').innerHTML=jobs.jobs.map(job=>`<div><span>${job.jobType}</span><strong>${job.status}</strong><time>${formatDate(job.completedAt||job.startedAt||job.createdAt)}</time></div>`).join('')||'<p>No sync jobs yet.</p>';integrationMessage.textContent=status.latestError||'Only approved operational fields are stored in Pulse.'}catch(error){integrationMessage.textContent=error.message}}
async function runClinikoAction(path,button){button.disabled=true;integrationMessage.textContent='Working…';try{const result=await pulseJson(path,{method:'POST'});integrationMessage.textContent=result.message||'Cliniko synchronisation completed.';await loadClinikoIntegration()}catch(error){integrationMessage.textContent=error.message}finally{button.disabled=false}}
document.querySelector('#clinikoTestButton').addEventListener('click',event=>runClinikoAction('/api/integrations/cliniko/test-connection',event.currentTarget));
document.querySelector('#clinikoSyncButton').addEventListener('click',event=>runClinikoAction('/api/integrations/cliniko/sync',event.currentTarget));
loadClinikoIntegration();

const operationsState={tab:'forward',date:new Date().toISOString().slice(0,10),loaded:false,today:null,forward:null,rebooking:null,cancellations:null,trends:null};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const operationsDate=document.querySelector('#operationsDate');
const operationsMessage=document.querySelector('#operationsMessage');
const operationsDetail=document.querySelector('#operationsDetail');
operationsDate.value=operationsState.date;
const queryString=values=>{const query=new URLSearchParams();Object.entries(values).forEach(([key,value])=>{if(value!==''&&value!==undefined&&value!==null)query.set(key,value)});return query.toString()};
const clinicTime=(value,timeZone)=>value?new Intl.DateTimeFormat('en-AU',{timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const patientName=patient=>`${patient?.firstName||''} ${patient?.lastName||''}`.trim()||'Unnamed patient';
function setOperationsError(error){operationsMessage.textContent=error.message;operationsMessage.classList.add('error');document.querySelector('#operationsRetry').hidden=false}
function summaryCard(label,value){return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`}
function percent(value){return Number.isFinite(value)?`${(value*100).toFixed(1)}%`:'—'}
function renderOperationsSummary(){
 const data=operationsState.today;if(!data)return;
 document.querySelector('#operationsSummary').innerHTML=[
  ['Bookings',data.totalBookings],['Active',data.activeBookings],['Cancelled',data.cancelledBookings],
  ['Practitioners',data.practitionersWithBookings],['First appointment',clinicTime(data.firstAppointmentAt,data.timeZone)],
  ['Last appointment',clinicTime(data.lastAppointmentAt,data.timeZone)]
 ].map(([label,value])=>summaryCard(label,value)).join('');
}
function renderOperationsSignals(){
 const forward=operationsState.forward?.practitioners||[];const cancellations=operationsState.cancellations;const rebooking=operationsState.rebooking;
 const weakening=forward.filter(item=>item.signal).length;
 const cards=[
  {title:'No-future-booking signals',value:rebooking?.pagination?.total??'—',text:'Patients meeting the selected timing rule. Attendance and discharge are not inferred.',tab:'rebooking',warning:Boolean(rebooking?.pagination?.total)},
  {title:'Forward-booking momentum',value:weakening,text:`${weakening} practitioner${weakening===1?'':'s'} materially below the preceding equal period.`,tab:'forward',warning:Boolean(weakening)},
  {title:'Cancellation exposure',value:cancellations?percent(cancellations.cancellationRate):'—',text:cancellations?.signal?'Rate exceeds the prior equal period threshold.':'Compared with the immediately preceding equal period.',tab:'cancellations',warning:Boolean(cancellations?.signal)},
  {title:'Appointment-type trends',value:'Review',text:'Booking volume changes are shown only from locally synced appointment data.',tab:'trends',warning:false}
 ];
 document.querySelector('#operationsSignals').innerHTML=cards.map(card=>`<article class="priority-card signal-card ${card.warning?'warning':''}"><strong>${escapeHtml(card.title)}</strong><div class="impact">${escapeHtml(card.value)}</div><p>${escapeHtml(card.text)}</p><button class="text-button signal-action" data-open-operations="${card.tab}">Investigate →</button></article>`).join('');
 document.querySelectorAll('[data-open-operations]').forEach(button=>button.addEventListener('click',()=>selectOperationsTab(button.dataset.openOperations)));
}
function table(headers,rows){return `<article class="panel operations-table"><div class="table-wrap"><table><thead><tr>${headers.map(value=>`<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">No data for this period.</td></tr>`}</tbody></table></div></article>`}
function renderOperationsDetail(){
 const tab=operationsState.tab;
 if(tab==='forward'){const data=operationsState.forward;operationsDetail.innerHTML=data?table(['Practitioner','Forward bookings','Booked days','Cancellations','Prior period','Momentum'],data.practitioners.map(item=>`<tr><td>${escapeHtml(item.practitioner.displayName)}</td><td>${item.bookings}</td><td>${item.bookedDays}</td><td>${item.cancellations}</td><td>${item.bookingMomentum.previous}</td><td>${item.bookingMomentum.percentChange===null?'New baseline':`${item.bookingMomentum.percentChange.toFixed(1)}%`}</td></tr>`).join('')):'<div class="empty-state">Loading forward bookings…</div>'}
 if(tab==='rebooking'){const data=operationsState.rebooking;operationsDetail.innerHTML=data?`<p class="source-note">${escapeHtml(data.signalBasis)}</p>${table(['Patient','Last booking','Days since','Practitioner','Appointment type','Contact'],data.patients.map(item=>`<tr><td><button class="row-action" data-patient-id="${escapeHtml(item.patient.clinikoId)}">${escapeHtml(patientName(item.patient))}</button></td><td>${escapeHtml(clinicTime(item.lastBooking?.startsAt,data.timeZone))}</td><td>${escapeHtml(item.daysSinceLastBooking)}</td><td>${escapeHtml(item.lastBooking?.practitioner?.displayName||'—')}</td><td>${escapeHtml(item.lastBooking?.appointmentType?.name||'—')}</td><td>${escapeHtml(item.patient.mobilePhone||item.patient.homePhone||item.patient.email||'—')}</td></tr>`).join(''))}`:'<div class="empty-state">Loading rebooking signals…</div>'}
 if(tab==='cancellations'){const data=operationsState.cancellations;operationsDetail.innerHTML=data?`${summaryCard('Cancellation rate',percent(data.cancellationRate))}${table(['Practitioner','Cancellations'],data.cancellationsByPractitioner.map(item=>`<tr><td>${escapeHtml(item.practitioner?.displayName||'Unassigned')}</td><td>${item.count}</td></tr>`).join(''))}`:'<div class="empty-state">Loading cancellation intelligence…</div>'}
 if(tab==='trends'){const data=operationsState.trends;const maximum=Math.max(1,...(data?.trends||[]).map(item=>item.bookingCount));operationsDetail.innerHTML=data?`<article class="panel"><h3>Booking trend</h3><p>Counts only; no revenue, capacity or utilisation inference.</p><div class="mini-bars">${data.trends.map(item=>`<div class="mini-bar"><span>${escapeHtml(item.label)}</span><i style="width:${Math.round(item.bookingCount/maximum*100)}%"></i><strong>${item.bookingCount}</strong></div>`).join('')||'<div class="empty-state">No trend data for this period.</div>'}</div></article>`:'<div class="empty-state">Loading trends…</div>'}
 operationsDetail.querySelectorAll('[data-patient-id]').forEach(button=>button.addEventListener('click',()=>openOperationsPatient(button.dataset.patientId)));
}
function operationsParams(){
 const horizon=Number(document.querySelector('#operationsHorizon').value);const practitionerId=document.querySelector('#operationsPractitioner').value;
 const endDate=new Date(`${operationsState.date}T00:00:00Z`);endDate.setUTCDate(endDate.getUTCDate()+horizon-1);
 return {horizon,practitionerId,endDate:endDate.toISOString().slice(0,10)}
}
async function loadOperations(){
 operationsMessage.textContent='Loading locally synced Cliniko insights…';operationsMessage.classList.remove('error');document.querySelector('#operationsRetry').hidden=true;
 const {horizon,practitionerId,endDate}=operationsParams();
 try{
  const [today,forward,rebooking,cancellations,trends]=await Promise.all([
   pulseJson(`/api/operations/today?${queryString({date:operationsState.date})}`),
   pulseJson(`/api/operations/forward-bookings?${queryString({startDate:operationsState.date,horizonDays:horizon,practitionerId})}`),
   pulseJson(`/api/operations/rebooking-risk?${queryString({referenceDate:operationsState.date,minimumDays:14,pageSize:25,practitionerId})}`),
   pulseJson(`/api/operations/cancellations?${queryString({startDate:operationsState.date,endDate,practitionerId})}`),
   pulseJson(`/api/operations/trends?${queryString({startDate:operationsState.date,endDate,groupBy:'day',practitionerId})}`)
  ]);
  Object.assign(operationsState,{today,forward,rebooking,cancellations,trends,loaded:true});
  operationsMessage.textContent=`Last Cliniko sync: ${clinicTime(today.lastSuccessfulClinikoSyncAt,today.timeZone)}. Read-only local data.`;
  renderOperationsSummary();renderOperationsSignals();renderOperationsDetail();
 }catch(error){setOperationsError(error)}
}
async function loadOperationsFilters(){
 try{const data=await pulseJson('/api/operations/practitioners');document.querySelector('#operationsPractitioner').innerHTML='<option value="">All practitioners</option>'+data.practitioners.map(item=>`<option value="${escapeHtml(item.clinikoId)}">${escapeHtml(item.displayName)}</option>`).join('')}catch(error){setOperationsError(error)}
}
function selectOperationsTab(tab){operationsState.tab=tab;document.querySelectorAll('.operations-tab').forEach(button=>button.classList.toggle('active',button.dataset.operationsTab===tab));renderOperationsDetail()}
function moveOperationsDate(days){const date=new Date(`${operationsState.date}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);operationsState.date=date.toISOString().slice(0,10);operationsDate.value=operationsState.date;loadOperations()}
document.querySelectorAll('.operations-tab').forEach(button=>button.addEventListener('click',()=>selectOperationsTab(button.dataset.operationsTab)));
document.querySelector('#operationsPrevious').addEventListener('click',()=>moveOperationsDate(-1));document.querySelector('#operationsNext').addEventListener('click',()=>moveOperationsDate(1));
document.querySelector('#operationsToday').addEventListener('click',()=>{operationsState.date=new Date().toISOString().slice(0,10);operationsDate.value=operationsState.date;loadOperations()});
operationsDate.addEventListener('change',()=>{if(operationsDate.value){operationsState.date=operationsDate.value;loadOperations()}});
document.querySelector('#operationsPractitioner').addEventListener('change',loadOperations);document.querySelector('#operationsHorizon').addEventListener('change',loadOperations);
document.querySelector('#operationsRetry').addEventListener('click',loadOperations);
function closeOperationsDrawer(){document.querySelector('#operationsDrawer').classList.remove('open');document.querySelector('#operationsDrawerBackdrop').classList.remove('open')}
async function openOperationsPatient(clinikoId){
 const content=document.querySelector('#operationsDrawerContent');content.innerHTML='<p>Loading patient summary…</p>';document.querySelector('#operationsDrawer').classList.add('open');document.querySelector('#operationsDrawerBackdrop').classList.add('open');
 try{const data=await pulseJson(`/api/operations/patients/${encodeURIComponent(clinikoId)}`);const contact=[data.patient.email,data.patient.mobilePhone,data.patient.homePhone].filter(Boolean);const bookings=items=>items.map(item=>`<div class="booking-history-item"><strong>${escapeHtml(item.appointmentType.name||item.bookingType||'Appointment')}</strong><span>${escapeHtml(clinicTime(item.startsAt,operationsState.today?.timeZone))} · ${escapeHtml(item.practitioner?.displayName||'Unassigned')}</span></div>`).join('')||'<p>No bookings in this bounded view.</p>';content.innerHTML=`<p class="eyebrow">READ-ONLY PATIENT OPERATIONS</p><h2>${escapeHtml(patientName(data.patient))}</h2><div class="detail-contact">${contact.map(value=>`<span>${escapeHtml(value)}</span>`).join('')||'<span>No approved contact details synced.</span>'}</div><div class="meta-box"><span>NO FUTURE BOOKING</span><strong>${data.noFutureBooking?'Yes':'No'}</strong></div><h3 class="detail-heading">Upcoming bookings</h3><div class="booking-history">${bookings(data.upcomingBookings)}</div><h3 class="detail-heading">Recent past bookings</h3><div class="booking-history">${bookings(data.recentPastBookings)}</div><p class="read-only-note">Appointment timing only. Pulse does not infer attendance, discharge or clinical risk. Make changes in Cliniko.</p>`}catch(error){content.innerHTML=`<p class="workspace-message error">${escapeHtml(error.message)}</p>`}
}
document.querySelector('#operationsDrawerClose').addEventListener('click',closeOperationsDrawer);document.querySelector('#operationsDrawerBackdrop').addEventListener('click',closeOperationsDrawer);
document.querySelector('#operationsPatientForm').addEventListener('submit',async event=>{event.preventDefault();const term=document.querySelector('#operationsPatientSearch').value.trim();const message=document.querySelector('#operationsPatientMessage');if(term.length<2){message.textContent='Enter at least two characters.';return}message.textContent='Searching…';try{const data=await pulseJson(`/api/operations/patients/search?${queryString({q:term,pageSize:20})}`);document.querySelector('#operationsPatientResults').innerHTML=data.patients.map(patient=>`<button class="patient-result" data-patient-id="${escapeHtml(patient.clinikoId)}"><strong>${escapeHtml(patientName(patient))}</strong><span>${escapeHtml(patient.mobilePhone||patient.homePhone||patient.email||'No contact detail')}</span></button>`).join('')||'<div class="empty-state">No matching patients.</div>';document.querySelector('#operationsPatientResults').querySelectorAll('[data-patient-id]').forEach(button=>button.addEventListener('click',()=>openOperationsPatient(button.dataset.patientId)));message.textContent=`${data.pagination.total} result${data.pagination.total===1?'':'s'}.`}catch(error){message.textContent=error.message}});
document.querySelector('[data-view="operations"]').addEventListener('click',()=>{if(!operationsState.loaded){loadOperationsFilters();loadOperations()}});

let financeLoaded=false;const money=(value,currency)=>value===null||value===undefined?'—':new Intl.NumberFormat('en-AU',{style:'currency',currency:currency||'AUD'}).format(Number(value));
async function loadFinance(){const message=document.querySelector('#financeMessage');message.textContent='Loading locally synced Xero data…';document.querySelector('#financeRetry').hidden=true;try{const [snapshot,trend,receivables,signals,pnl]=await Promise.all([pulseJson('/api/finance/snapshot'),pulseJson('/api/finance/revenue-trend'),pulseJson('/api/finance/receivables?pageSize=10'),pulseJson('/api/finance/signals'),pulseJson('/api/finance/profit-and-loss')]);const currency=snapshot.organisation.baseCurrency;document.querySelector('#financeSnapshot').innerHTML=[['Revenue this month',money(snapshot.invoiceDerived.currentMonthRevenue,currency)],['Prior month',money(snapshot.invoiceDerived.priorComparableMonthRevenue,currency)],['Receivables',money(snapshot.invoiceDerived.accountsReceivableOutstanding,currency)],['Payables',money(snapshot.invoiceDerived.accountsPayableOutstanding,currency)],['Last sync',formatDate(snapshot.freshness.lastSuccessfulSyncAt)]].map(([label,value])=>`<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');const max=Math.max(1,...trend.series.map(item=>Number(item.invoiced)));document.querySelector('#financeTrend').innerHTML=trend.series.map(item=>`<div class="mini-bar"><span>${escapeHtml(item.period)}</span><i style="width:${Number(item.invoiced)/max*100}%"></i><strong>${escapeHtml(money(item.invoiced,trend.currency))}</strong></div>`).join('')||'<p>No synced revenue data.</p>';document.querySelector('#financeReceivables').innerHTML=receivables.items.map(item=>`<div class="pipeline-row"><span>${escapeHtml(item.contact?.name||'Unknown')} · ${escapeHtml(item.invoiceNumber||'No number')}</span><strong>${escapeHtml(money(item.amountDue,item.currencyCode))}</strong></div>`).join('')||'<p>No outstanding receivables.</p>';document.querySelector('#financeSignals').innerHTML=signals.signals.map(item=>`<article class="priority-card"><strong>${escapeHtml(item.code.replaceAll('_',' '))}</strong><p>${escapeHtml(item.suggestedAction)}</p><div class="impact">${escapeHtml(money(item.supportingValues.amountDue,item.supportingValues.currency))}</div></article>`).join('')||'<div class="empty-state">No finance thresholds are currently triggered.</div>';document.querySelector('#financeProfitLoss').textContent=pnl.data===null?'No synced report snapshot.':`${pnl.basis||'Xero basis'} · synced ${formatDate(pnl.syncedAt)}`;message.textContent=`${snapshot.organisation.name} · last sync ${formatDate(snapshot.freshness.lastSuccessfulSyncAt)} · read-only local data`;financeLoaded=true}catch(error){message.textContent=error.message;message.classList.add('error');document.querySelector('#financeRetry').hidden=false}}
document.querySelector('[data-view="finance"]').addEventListener('click',()=>{if(!financeLoaded)loadFinance()});document.querySelector('#financeRetry').addEventListener('click',loadFinance);document.querySelector('#xeroFinanceSync').addEventListener('click',async event=>{event.currentTarget.disabled=true;try{await pulseJson('/api/integrations/xero/sync',{method:'POST'});await loadFinance()}catch(error){document.querySelector('#financeMessage').textContent=error.message}finally{event.currentTarget.disabled=false}});
pulseJson('/api/auth/me').then(({user})=>{document.querySelector('[data-view="finance"]').hidden=!user.roles.some(role=>['DIRECTOR','PRACTICE_MANAGER'].includes(role))}).catch(()=>{});

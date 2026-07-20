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

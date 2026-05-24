const OCC=['iran','iranCurrent','iranAncient','international','globalOfficial','marketing','islamic','islamicShia','islamicSunni','islamicShared'];
const NTP=[['ntp.time.ir','Iran NTP'],['pool.ntp.org','NTP Pool'],['time.google.com','Google'],['time.cloudflare.com','Cloudflare'],['time.windows.com','Microsoft'],['custom','Custom']];
const $=id=>document.getElementById(id);
let selectedCities=[],cityPool=[];

async function api(path,opts={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Request failed');e.status=r.status;throw e;}return d;}
const setStatus=(id,m)=>{const el=$(id);if(el)el.textContent=m||'';};

function tabFromPath(){const map={'/admin-dashboard.html':'overview','/admin-defaults.html':'defaults','/admin-ntp.html':'ntp','/admin-json.html':'json'};return map[location.pathname]||new URL(location.href).searchParams.get('tab')||'overview';}

function activateTab(tab,push=true){const t=['overview','defaults','ntp','json'].includes(tab)?tab:'overview';document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('.tab').forEach(sec=>sec.classList.toggle('active',sec.id===`tab-${t}`));if(push){const routes={overview:'/admin-dashboard.html',defaults:'/admin-defaults.html',ntp:'/admin-ntp.html',json:'/admin-json.html'};const target=routes[t]||routes.overview;if(location.pathname!==target){location.href=target;return;}}if(t==='json'&&$('jsonFileSelect').options.length===0)loadJsonFiles().catch(()=>setStatus('jsonStatus','Unable to load JSON files'));if((t==='defaults'||t==='ntp')&&$('defaultSelectedCityInput').options.length===0)loadConfig().catch(()=>setStatus('defaultsStatus','Unable to load config'));}
function renderCities(){ $('defaultCityChips').innerHTML=selectedCities.map(c=>`<span class='chip'>${c} <button class='chip' type='button' data-rm='${c}'>×</button></span>`).join(''); $('defaultSelectedCityInput').innerHTML=selectedCities.map(c=>`<option value='${c}'>${c}</option>`).join('');}
function renderOcc(selected=[]){$('occasionSelect').innerHTML=OCC.map(o=>`<option value='${o}' ${selected.includes(o)?'selected':''}>${o}</option>`).join('');}
function renderNtp(){ $('ntpPreset').innerHTML=NTP.map(([h,l])=>`<option value='${h}'>${l} (${h})</option>`).join(''); }

async function loadConfig(){const d=await api('/api/admin/config');$('ntpHost').value=d.ntpHost||'pool.ntp.org';selectedCities=[...(d.defaultCityIds||[])];renderCities();$('defaultSelectedCityInput').value=d.defaultSelectedCityId||selectedCities[0]||'';renderOcc(d.defaultOccasionTypes||[]);$('metricCities').textContent=String(selectedCities.length);$('metricNtp').textContent=d.ntpHost||'-';}
async function loadJsonFiles(){const d=await api('/api/admin/json-files');const files=Array.isArray(d.files)?d.files:[];$('jsonFileSelect').innerHTML=files.map(f=>`<option value='${f}'>${f}</option>`).join('');$('metricJson').textContent=String(files.length);if(files[0]) await loadJson(files[0]);}
async function loadJson(file){const d=await api('/api/admin/json-file?file='+encodeURIComponent(file));$('jsonEditor').value=JSON.stringify(d.content,null,2);}
async function initCities(){const z=Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[];cityPool=z.map(v=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-'));}
function suggest(){const q=$('citySearchInput').value.trim().toLowerCase();$('citySuggestions').innerHTML=cityPool.filter(c=>c.includes(q)&&!selectedCities.includes(c)).slice(0,10).map(c=>`<button data-add='${c}' type='button'>${c}</button>`).join('');}

async function checkAuth(){
  try{
    const s=await api('/api/admin/session');
    if(s.forcePasswordChange){$('forcePasswordCard').classList.remove('hidden');$('dashboardContent').classList.add('hidden');return;}
    $('forcePasswordCard').classList.add('hidden');
    $('dashboardContent').classList.remove('hidden');
    const tab=tabFromPath();
    activateTab(tab,false);
    const jobs=[loadConfig()];
    if(tab==='json'||tab==='overview') jobs.push(loadJsonFiles());
    const results=await Promise.allSettled(jobs);
    results.forEach(r=>{if(r.status==='rejected'){const m=r.reason?.message||'Load failed';setStatus('defaultsStatus',m);setStatus('jsonStatus',m);setStatus('ntpStatus',m);}});
  }catch(err){
    if(err.status===401){location.href='/admin-login.html';return;}
    setStatus('defaultsStatus',err.message);setStatus('jsonStatus',err.message);setStatus('ntpStatus',err.message);
  }
}

$('logoutBtn').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});location.href='/admin-login.html';};
$('langToggle').onclick=()=>{const fa=document.documentElement.lang==='fa';document.documentElement.lang=fa?'en':'fa';document.documentElement.dir=fa?'ltr':'rtl';$('langToggle').textContent=fa?'FA':'EN';};
$('passwordForm').onsubmit=async e=>{e.preventDefault();if($('newPassword').value!==$('confirmPassword').value)return setStatus('passwordStatus','Passwords do not match');try{await api('/api/admin/change-password',{method:'POST',body:JSON.stringify({newPassword:$('newPassword').value})});await checkAuth();}catch(err){setStatus('passwordStatus',err.message);}};

$('citySearchInput').oninput=suggest;
$('cityAddBtn').onclick=()=>{const v=$('citySearchInput').value.trim();if(v&&!selectedCities.includes(v)){selectedCities.push(v);renderCities();suggest();}};
$('citySuggestions').onclick=e=>{const v=e.target.dataset.add;if(v){selectedCities.push(v);renderCities();suggest();}};
$('defaultCityChips').onclick=e=>{const v=e.target.dataset.rm;if(v){selectedCities=selectedCities.filter(x=>x!==v);renderCities();}};

renderNtp();
$('ntpPreset').onchange=e=>{if(e.target.value!=='custom')$('ntpHost').value=e.target.value;};
$('ntpTestBtn').onclick=async()=>{try{const st=Date.now();const d=await api('/api/ntp?host='+encodeURIComponent($('ntpHost').value));$('ntpHostLabel').textContent=d.host;$('ntpDelay').textContent=(Date.now()-st)+'ms';setStatus('ntpStatus','Synced successfully');}catch(err){setStatus('ntpStatus',err.message);}};

async function saveAll(){await api('/api/admin/config',{method:'POST',body:JSON.stringify({ntpHost:$('ntpHost').value,defaultCityIds:selectedCities,defaultSelectedCityId:$('defaultSelectedCityInput').value,defaultOccasionTypes:[...$('occasionSelect').selectedOptions].map(o=>o.value)})});setStatus('defaultsStatus','Saved');setStatus('ntpStatus','Saved');}
$('defaultsSaveBtn').onclick=()=>saveAll().catch(e=>setStatus('defaultsStatus',e.message));
$('ntpSaveBtn').onclick=()=>saveAll().catch(e=>setStatus('ntpStatus',e.message));

$('jsonLoadBtn').onclick=()=>loadJson($('jsonFileSelect').value);
$('jsonSaveBtn').onclick=async()=>{try{await api('/api/admin/json-file',{method:'POST',body:JSON.stringify({file:$('jsonFileSelect').value,content:JSON.parse($('jsonEditor').value)})});setStatus('jsonStatus','Saved');}catch(e){setStatus('jsonStatus',e.message);}};

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',e=>{const href=btn.getAttribute('href');if(href&&href!==location.pathname){return;}e.preventDefault();activateTab(btn.dataset.tab,true);}));

activateTab(tabFromPath(),false);
initCities();
initTimeZoneMap();
checkAuth();


function project(lat,lon){const x=(lon+180)*(1000/360);const y=(90-lat)*(420/180);return {x,y};}
const MAP_CITIES=[{name:'New York',tz:'America/New_York',lat:40.71,lon:-74.0},{name:'London',tz:'Europe/London',lat:51.50,lon:-0.12},{name:'Tehran',tz:'Asia/Tehran',lat:35.68,lon:51.41},{name:'Tokyo',tz:'Asia/Tokyo',lat:35.67,lon:139.65},{name:'Sydney',tz:'Australia/Sydney',lat:-33.86,lon:151.20}];
function updateSunBand(){const now=new Date();const utcHour=now.getUTCHours()+now.getUTCMinutes()/60;const subSolarLon=(12-utcHour)*15;const leftX=((subSolarLon+180)/360)*1000;const d=`M ${leftX-230} 0 C ${leftX-120} 110 ${leftX-95} 310 ${leftX-220} 420 L 1000 420 L 1000 0 Z`;const term=$("terminator");if(term)term.setAttribute("d",d);const sun=$("sunStatus");if(sun)sun.textContent=`Solar UTC: ${now.toUTCString().slice(17,22)}`;}
function cityTimeLabel(tz){const now=new Date();const time=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,weekday:'short'}).format(now);const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',hour12:false}).format(now));const phase=(hour>=6&&hour<18)?'Day':'Night';return {time,phase};}
function initTimeZoneMap(){const pinRoot=$("cityPins"),zones=$("zoneBands");if(!pinRoot) return;if(zones){zones.innerHTML=Array.from({length:24},(_,i)=>`<rect class="zone" x="${(i*(1000/24)).toFixed(2)}" y="0" width="${(1000/24).toFixed(2)}" height="420" fill="${i%2?"#0ea5e9":"#60a5fa"}"/>`).join("");}pinRoot.innerHTML=MAP_CITIES.map(c=>{const p=project(c.lat,c.lon);return `<g class="pin" data-city="${c.name}" data-tz="${c.tz}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="8"></circle><circle r="14" fill="none" stroke="#3b82f655" stroke-width="4"></circle></g>`;}).join("");pinRoot.querySelectorAll(".pin").forEach(pin=>pin.addEventListener("click",()=>{pinRoot.querySelectorAll(".pin").forEach(p=>p.classList.remove("active"));pin.classList.add("active");const city=pin.dataset.city,tz=pin.dataset.tz;const info=cityTimeLabel(tz);$("selectedCityTime").textContent=`${city}: ${info.time}`;$("selectedCityMeta").textContent=`${tz} · ${info.phase} time`; }));updateSunBand();setInterval(updateSunBand,30000);}

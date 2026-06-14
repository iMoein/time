const OCC=['iran','iranCurrent','iranAncient','international','globalOfficial','marketing','islamic','islamicShia','islamicSunni','islamicShared'];
const NTP=[['ntp.time.ir','Iran NTP'],['pool.ntp.org','NTP Pool Global'],['time.google.com','Google Public NTP'],['time.cloudflare.com','Cloudflare Time'],['time.windows.com','Microsoft'],['time.apple.com','Apple'],['time.facebook.com','Meta'],['time.nist.gov','NIST (US)'],['europe.pool.ntp.org','Europe NTP Pool'],['asia.pool.ntp.org','Asia NTP Pool'],['north-america.pool.ntp.org','North America Pool'],['south-america.pool.ntp.org','South America Pool'],['africa.pool.ntp.org','Africa Pool'],['oceania.pool.ntp.org','Oceania Pool'],['time1.google.com','Google Node 1'],['time2.google.com','Google Node 2'],['time3.google.com','Google Node 3'],['time4.google.com','Google Node 4'],['custom','Custom']];
const $=id=>document.getElementById(id);
let selectedCities=[],cityPool=[],visibleOccasionTypes=[...OCC],occasionOrder=[...OCC];
let dataMode='server';
const githubStorageKey='time-admin-github-settings';
const githubContentCache=new Map();
function hasStoredGithubLogin(){try{const s=JSON.parse(localStorage.getItem(githubStorageKey)||'{}');return Boolean(s.owner&&s.repo&&s.branch&&s.token&&s.connectedAt);}catch{return false;}}
if(!hasStoredGithubLogin()&&location.pathname!=='/admin-login.html'){location.replace('/admin-login.html?next='+encodeURIComponent(location.pathname+location.search));}

async function api(path,opts={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Request failed');e.status=r.status;throw e;}return d;}
function getGithubSettings(){try{return JSON.parse(localStorage.getItem(githubStorageKey)||'{}')||{};}catch{return {};}}
function setGithubSettings(settings){localStorage.setItem(githubStorageKey,JSON.stringify(settings));}
function fillGithubForm(){const s=getGithubSettings();if($('githubOwner'))$('githubOwner').value=s.owner||'';if($('githubRepo'))$('githubRepo').value=s.repo||'';if($('githubBranch'))$('githubBranch').value=s.branch||'main';if($('githubToken'))$('githubToken').value=s.token||'';}
function showGithubMode(message='Connect GitHub to manage data from Pages.'){dataMode='github';if($('githubModeCard'))$('githubModeCard').classList.remove('hidden');if($('forcePasswordCard'))$('forcePasswordCard').classList.add('hidden');if($('dashboardContent'))$('dashboardContent').classList.remove('hidden');setStatus('githubStatus',message);fillGithubForm();}
function requireGithubSettings(){const s=getGithubSettings();if(!s.owner||!s.repo||!s.branch||!s.token||!s.connectedAt)throw new Error('Connect from the login page first.');return s;}
function githubHeaders(settings){return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${settings.token}`,'X-GitHub-Api-Version':'2022-11-28'};}
function encodeBase64Utf8(value){return btoa(unescape(encodeURIComponent(value)));}
function decodeBase64Utf8(value){return decodeURIComponent(escape(atob(String(value||'').replace(/\n/g,''))));}
function githubApiUrl(settings,path){return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}${path}`;}
async function githubRequest(path,options={}){const settings=requireGithubSettings();const r=await fetch(githubApiUrl(settings,path),{...options,headers:{...githubHeaders(settings),'Content-Type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.message||'GitHub request failed');e.status=r.status;throw e;}return d;}
async function githubReadJson(path){const settings=requireGithubSettings();const ref=encodeURIComponent(settings.branch);const data=await githubRequest(`/contents/${path}?ref=${ref}`);githubContentCache.set(path,data.sha);return JSON.parse(decodeBase64Utf8(data.content));}
async function githubWriteJson(path,content,message){const settings=requireGithubSettings();let sha=githubContentCache.get(path);if(!sha){try{const ref=encodeURIComponent(settings.branch);const existing=await githubRequest(`/contents/${path}?ref=${ref}`);sha=existing.sha;}catch{}}const payload={message,branch:settings.branch,content:encodeBase64Utf8(JSON.stringify(content,null,2)+'\n')};if(sha)payload.sha=sha;const saved=await githubRequest(`/contents/${path}`,{method:'PUT',body:JSON.stringify(payload)});if(saved.content?.sha)githubContentCache.set(path,saved.content.sha);return saved;}
async function githubListJsonFiles(){const settings=requireGithubSettings();const tree=await githubRequest(`/git/trees/${encodeURIComponent(settings.branch)}?recursive=1`);return (tree.tree||[]).filter(item=>item.type==='blob'&&item.path.startsWith('src/data/')&&item.path.endsWith('.json')).map(item=>item.path.replace(/^src\//,'')).sort();}
async function dataReadConfig(){return dataMode==='github'?githubReadJson('config.json'):api('/api/admin/config');}
async function dataWriteConfig(config){return dataMode==='github'?githubWriteJson('config.json',config,'Update app defaults from admin panel'):api('/api/admin/config',{method:'POST',body:JSON.stringify(config)});}
async function dataListJsonFiles(){return dataMode==='github'?githubListJsonFiles():api('/api/admin/json-files').then(raw=>pick(raw,['files'],pick(raw?.data||{},['files'],[])));}
async function dataReadJson(file){return dataMode==='github'?githubReadJson('src/'+file):api('/api/admin/json-file?file='+encodeURIComponent(file)).then(raw=>pick(raw,['content'],pick(raw?.data||{},['content'],{})));}
async function dataWriteJson(file,content){return dataMode==='github'?githubWriteJson('src/'+file,content,`Update ${file} from admin panel`):api('/api/admin/json-file',{method:'POST',body:JSON.stringify({file,content})});}
const setStatus=(id,m)=>{const el=$(id);if(el)el.textContent=m||'';};
const on=(id,event,fn)=>{const el=$(id);if(el)el.addEventListener(event,fn);};
const pick=(obj,keys,def)=>{for(const k of keys){if(obj&&obj[k]!==undefined&&obj[k]!==null)return obj[k];}return def;};

function tabFromPath(){const map={'/admin-dashboard.html':'overview','/admin-defaults.html':'defaults','/admin-ntp.html':'ntp','/admin-json.html':'json'};return map[location.pathname]||new URL(location.href).searchParams.get('tab')||'overview';}

function activateTab(tab,push=true){const t=['overview','defaults','ntp','json'].includes(tab)?tab:'overview';document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('.tab').forEach(sec=>sec.classList.toggle('active',sec.id===`tab-${t}`));if(push){const routes={overview:'/admin-dashboard.html',defaults:'/admin-defaults.html',ntp:'/admin-ntp.html',json:'/admin-json.html'};const target=routes[t]||routes.overview;if(location.pathname!==target){location.href=target;return;}}if(t==='json'&&$('jsonFileSelect').options.length===0)loadJsonFiles().catch(()=>setStatus('jsonStatus','Unable to load JSON files'));if((t==='defaults'||t==='ntp')&&$('defaultSelectedCityInput').options.length===0)loadConfig().catch(()=>setStatus('defaultsStatus','Unable to load config'));}
function renderCities(){ $('defaultCityChips').innerHTML=selectedCities.map((c,i)=>`<span class='chip'>${c} <button class='chip' type='button' data-up='${c}' ${i===0?'disabled':''}>↑</button><button class='chip' type='button' data-down='${c}' ${i===selectedCities.length-1?'disabled':''}>↓</button><button class='chip' type='button' data-rm='${c}'>×</button></span>`).join(''); $('defaultSelectedCityInput').innerHTML=selectedCities.map(c=>`<option value='${c}'>${c}</option>`).join('');}
function renderOcc(selected=[]){const allowed=occasionOrder.filter(o=>visibleOccasionTypes.includes(o));$('occasionSelect').innerHTML=allowed.map(o=>`<option value='${o}' ${selected.includes(o)?'selected':''}>${o}</option>`).join('');renderOccVisibility();}

function updateLocalClock(){const el=$('adminLocalClock');if(!el)return;el.textContent=new Date().toLocaleString();}
function updateNetworkState(){const online=navigator.onLine;const ns=$('networkStatus'),cs=$('clockSource'),cn=$('clockNotice');if(ns)ns.textContent=online?'Online':'Offline';if(cs)cs.textContent=online?'NTP':'Local Clock';if(cn)cn.textContent=online?'-':'ارتباط برقرار نیست، ساعت لوکال ملاک قرار می‌گیرد';if(!online)setStatus('ntpStatus','ارتباط برقرار نیست، ساعت لوکال ملاک قرار می‌گیرد');}
async function showNtpServersDelay(){const root=$('ntpServerDelayList');if(!root)return;root.classList.remove('hidden');root.innerHTML='Checking servers...';const hosts=NTP.filter(([h])=>h!=='custom').slice(0,8).map(([h,l])=>({host:h,label:l}));const rows=[];for(const item of hosts){const st=Date.now();try{await api('/api/ntp?host='+encodeURIComponent(item.host));rows.push(`<div class="ntp-delay-row"><span>${item.label}</span><strong>${Date.now()-st}ms</strong></div>`);}catch{rows.push(`<div class="ntp-delay-row"><span>${item.label}</span><strong>timeout</strong></div>`);}}
root.innerHTML=rows.join('');}

function ntpRegionFor(host=''){if(host.includes('.ir'))return 'Iran';if(host.includes('north-america'))return 'North America';if(host.includes('south-america'))return 'South America';if(host.includes('europe'))return 'Europe';if(host.includes('asia'))return 'Asia';if(host.includes('africa'))return 'Africa';if(host.includes('oceania'))return 'Oceania';return 'Global';}
function updateNtpMeta(host=''){if($('ntpHostLabel'))$('ntpHostLabel').textContent=host||'-';if($('ntpRegion'))$('ntpRegion').textContent=ntpRegionFor(host);const rel=(host&&host.includes('pool'))?'99.95%':'99.99%';if($('ntpReliability'))$('ntpReliability').textContent=rel;}
function renderNtp(){ const preset=$('ntpPreset'); if(!preset)return; preset.innerHTML=NTP.map(([h,l])=>`<option value='${h}'>${l} (${h})</option>`).join(''); const chips=$('ntpQuickServers'); if(chips){chips.innerHTML=NTP.filter(([h])=>h!=='custom').slice(0,8).map(([h,l],i)=>`<button type="button" class="ntp-chip ${i===0?'active':''}" data-ntp="${h}" title="${h}">${h}</button>`).join('');}}
function renderOccVisibility(){const root=$("occasionVisibilityList");if(!root)return;root.innerHTML=occasionOrder.map((o,i)=>`<div class="toggle-row"><label class="toggle-check"><input type="checkbox" data-occ="${o}" ${visibleOccasionTypes.includes(o)?"checked":""}/> <span>${o}</span></label><div class="order-btns"><button type="button" class="mini" data-occ-up="${o}" ${i===0?"disabled":""}>↑</button><button type="button" class="mini" data-occ-down="${o}" ${i===occasionOrder.length-1?"disabled":""}>↓</button></div></div>`).join("");}


async function loadConfig(){const raw=await dataReadConfig();const d=raw?.config||raw?.data||raw||{};const ntpHost=pick(d,['ntpHost','ntp_host'],'pool.ntp.org');const cityIds=pick(d,['defaultCityIds','default_city_ids'],[]);const selected=pick(d,['defaultSelectedCityId','default_selected_city_id'],'');const occasions=pick(d,['defaultOccasionTypes','default_occasion_types'],[]);const visibleOcc=pick(d,['visibleOccasionTypes','visible_occasion_types'],OCC);const occOrd=pick(d,['occasionFilterOrder','occasion_filter_order'],OCC);if($('ntpHost'))$('ntpHost').value=ntpHost;updateNtpMeta(ntpHost);selectedCities=[...(Array.isArray(cityIds)?cityIds:[])];renderCities();if($('defaultSelectedCityInput'))$('defaultSelectedCityInput').value=selected||selectedCities[0]||'';visibleOccasionTypes=Array.isArray(visibleOcc)?visibleOcc.filter(o=>OCC.includes(o)): [...OCC];occasionOrder=Array.isArray(occOrd)?occOrd.filter(o=>OCC.includes(o)):[...OCC];renderOcc(Array.isArray(occasions)?occasions:[]);if($('metricCities'))$('metricCities').textContent=String(selectedCities.length);if($('metricNtp'))$('metricNtp').textContent=ntpHost||'-';return d;}
async function loadJsonFiles(){const files=await dataListJsonFiles();const list=Array.isArray(files)?files:[];if($('jsonFileSelect'))$('jsonFileSelect').innerHTML=list.map(f=>`<option value='${f}'>${f}</option>`).join('');if($('metricJson'))$('metricJson').textContent=String(list.length);if(list[0]&&$('jsonEditor')) await loadJson(list[0]);}
async function loadJson(file){const content=await dataReadJson(file);if($('jsonEditor'))$('jsonEditor').value=JSON.stringify(content,null,2);}
async function initCities(){const z=Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[];cityPool=z.map(v=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-'));}
function suggest(){const q=$('citySearchInput').value.trim().toLowerCase();$('citySuggestions').innerHTML=cityPool.filter(c=>c.includes(q)&&!selectedCities.includes(c)).slice(0,10).map(c=>`<button data-add='${c}' type='button'>${c}</button>`).join('');}

async function checkAuth(){
  try{
    if(dataMode==='server'){
      const s=await api('/api/admin/session');
      if(s.forcePasswordChange){$('forcePasswordCard').classList.remove('hidden');$('dashboardContent').classList.add('hidden');return;}
    }
    $('forcePasswordCard').classList.add('hidden');
    $('dashboardContent').classList.remove('hidden');
    const tab=tabFromPath();
    activateTab(tab,false);

    const cfg=await loadConfig().catch(err=>{setStatus('defaultsStatus',err.message||'Config load failed');return null;});
    if(!cfg){$('metricCities').textContent='0';$('metricNtp').textContent='-';}

    if(tab==='json'||tab==='overview'){
      await loadJsonFiles().catch(err=>{setStatus('jsonStatus',err.message||'JSON list load failed');$('metricJson').textContent='0';});
    }
  }catch(err){
    if(err.status===401){location.href='/admin-login.html';return;}
    showGithubMode('Node admin API is unavailable here. Use GitHub mode to edit repository data.');
    const tab=tabFromPath();
    activateTab(tab,false);
    if(getGithubSettings().token){
      await loadConfig().catch(e=>setStatus('defaultsStatus',e.message));
      if(tab==='json'||tab==='overview')await loadJsonFiles().catch(e=>setStatus('jsonStatus',e.message));
    }
  }
}

on('githubSaveBtn','click',async()=>{const settings={owner:$('githubOwner')?.value.trim(),repo:$('githubRepo')?.value.trim(),branch:$('githubBranch')?.value.trim()||'main',token:$('githubToken')?.value.trim()};setGithubSettings(settings);githubContentCache.clear();showGithubMode('Connecting to GitHub...');try{await loadConfig();await loadJsonFiles();setStatus('githubStatus','Connected. Changes are committed directly to GitHub.');}catch(e){setStatus('githubStatus',e.message);}});
on('githubForgetBtn','click',()=>{localStorage.removeItem(githubStorageKey);githubContentCache.clear();fillGithubForm();setStatus('githubStatus','Token removed from this browser.');});
on('logoutBtn','click',async()=>{if(dataMode==='github'){localStorage.removeItem(githubStorageKey);location.href='/admin-dashboard.html';return;}await api('/api/admin/logout',{method:'POST'});location.href='/admin-login.html';});
on('langToggle','click',()=>{const fa=document.documentElement.lang==='fa';document.documentElement.lang=fa?'en':'fa';document.documentElement.dir=fa?'ltr':'rtl';const t=$('langToggle');if(t)t.textContent=fa?'FA':'EN';});
on('passwordForm','submit',async e=>{e.preventDefault();if($('newPassword')?.value!==$('confirmPassword')?.value)return setStatus('passwordStatus','Passwords do not match');try{await api('/api/admin/change-password',{method:'POST',body:JSON.stringify({newPassword:$('newPassword')?.value||''})});await checkAuth();
updateLocalClock();
updateNetworkState();
setInterval(updateLocalClock,1000);}catch(err){setStatus('passwordStatus',err.message);}});

on('citySearchInput','input',suggest);
on('cityAddBtn','click',()=>{const v=$('citySearchInput')?.value?.trim();if(v&&!selectedCities.includes(v)){selectedCities.push(v);renderCities();suggest();}});
on('citySuggestions','click',e=>{const v=e.target.dataset.add;if(v){selectedCities.push(v);renderCities();suggest();}});
on('defaultCityChips','click',e=>{const rm=e.target.dataset.rm,up=e.target.dataset.up,down=e.target.dataset.down;if(rm){selectedCities=selectedCities.filter(x=>x!==rm);}if(up){const i=selectedCities.indexOf(up);if(i>0){[selectedCities[i-1],selectedCities[i]]=[selectedCities[i],selectedCities[i-1]];}}if(down){const i=selectedCities.indexOf(down);if(i>-1&&i<selectedCities.length-1){[selectedCities[i+1],selectedCities[i]]=[selectedCities[i],selectedCities[i+1]];}}renderCities();});
on('occasionVisibilityList','click',e=>{const up=e.target.dataset.occUp,down=e.target.dataset.occDown;if(!up&&!down)return;if(up){const i=occasionOrder.indexOf(up);if(i>0){[occasionOrder[i-1],occasionOrder[i]]=[occasionOrder[i],occasionOrder[i-1]];}}if(down){const i=occasionOrder.indexOf(down);if(i>-1&&i<occasionOrder.length-1){[occasionOrder[i+1],occasionOrder[i]]=[occasionOrder[i],occasionOrder[i+1]];}}renderOcc([...$('occasionSelect').selectedOptions].map(o=>o.value));});
on('occasionVisibilityList','change',e=>{const input=e.target.closest('input[type="checkbox"][data-occ]');if(!input)return;const occ=input.dataset.occ;visibleOccasionTypes=input.checked?Array.from(new Set([...visibleOccasionTypes,occ])):visibleOccasionTypes.filter(o=>o!==occ);renderOcc([...$('occasionSelect').selectedOptions].map(o=>o.value));});

if($("ntpPreset"))renderNtp();
on('ntpPreset','change',e=>{if(e.target.value!=='custom'&&$('ntpHost'))$('ntpHost').value=e.target.value;updateNtpMeta($('ntpHost')?.value||'');});
on('ntpQuickServers','click',e=>{const btn=e.target.closest('[data-ntp]');if(!btn)return;const host=btn.dataset.ntp;document.querySelectorAll('#ntpQuickServers .ntp-chip').forEach(c=>c.classList.remove('active'));btn.classList.add('active');if($('ntpHost'))$('ntpHost').value=host;if($('ntpPreset'))$('ntpPreset').value=host;updateNtpMeta(host);});
async function runNtpProbe(statusText){if(dataMode==='github'){setStatus('ntpStatus','NTP probing needs the Node server; GitHub Pages will use the browser clock fallback.');return;}try{const host=$('ntpHost')?.value||'pool.ntp.org';const st=Date.now();const d=await api('/api/ntp?host='+encodeURIComponent(host));updateNtpMeta(d.host||host);if($('ntpDelay'))$('ntpDelay').textContent=(Date.now()-st)+'ms';setStatus('ntpStatus',statusText);}catch(err){setStatus('ntpStatus',err.message);}}
on('ntpTestBtn','click',()=>runNtpProbe('Synced successfully'));
on('ntpLatencyBtn','click',()=>runNtpProbe('Latency test completed'));
on('ntpServersDelayBtn','click',showNtpServersDelay);
window.addEventListener('online',updateNetworkState);
window.addEventListener('offline',updateNetworkState);

async function saveAll(){await dataWriteConfig({ntpHost:$('ntpHost').value,defaultCityIds:selectedCities,defaultSelectedCityId:$('defaultSelectedCityInput').value,defaultOccasionTypes:[...$('occasionSelect').selectedOptions].map(o=>o.value),visibleOccasionTypes,occasionFilterOrder:occasionOrder});setStatus('defaultsStatus',dataMode==='github'?'Saved to GitHub. Pages will update after the deploy workflow finishes.':'Saved');setStatus('ntpStatus',dataMode==='github'?'Saved to GitHub. Pages will update after the deploy workflow finishes.':'Saved');}
on('defaultsSaveBtn','click',()=>saveAll().catch(e=>setStatus('defaultsStatus',e.message)));
on('ntpSaveBtn','click',()=>saveAll().catch(e=>setStatus('ntpStatus',e.message)));

on('jsonLoadBtn','click',()=>{const f=$('jsonFileSelect')?.value;if(f)loadJson(f);});
on('jsonSaveBtn','click',async()=>{try{await dataWriteJson($('jsonFileSelect')?.value,JSON.parse($('jsonEditor')?.value||'{}'));setStatus('jsonStatus',dataMode==='github'?'Saved to GitHub. Pages will update after the deploy workflow finishes.':'Saved');}catch(e){setStatus('jsonStatus',e.message);}});

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',e=>{const href=btn.getAttribute('href');if(href&&href!==location.pathname){return;}e.preventDefault();activateTab(btn.dataset.tab,true);}));

activateTab(tabFromPath(),false);
initCities();
initTimeZoneMap();
checkAuth();
updateLocalClock();
updateNetworkState();
setInterval(updateLocalClock,1000);


function project(lat,lon){const x=(lon+180)*(1000/360);const y=(90-lat)*(420/180);return {x,y};}
const MAP_CITIES=[{name:'New York',tz:'America/New_York',lat:40.71,lon:-74.0},{name:'London',tz:'Europe/London',lat:51.50,lon:-0.12},{name:'Tehran',tz:'Asia/Tehran',lat:35.68,lon:51.41},{name:'Tokyo',tz:'Asia/Tokyo',lat:35.67,lon:139.65},{name:'Sydney',tz:'Australia/Sydney',lat:-33.86,lon:151.20}];
function updateSunBand(){const now=new Date();const utcHour=now.getUTCHours()+now.getUTCMinutes()/60;const subSolarLon=(12-utcHour)*15;const leftX=((subSolarLon+180)/360)*1000;const d=`M ${leftX-230} 0 C ${leftX-120} 110 ${leftX-95} 310 ${leftX-220} 420 L 1000 420 L 1000 0 Z`;const term=$("terminator");if(term)term.setAttribute("d",d);const sun=$("sunStatus");if(sun)sun.textContent=`Solar UTC: ${now.toUTCString().slice(17,22)}`;}
function cityTimeLabel(tz){const now=new Date();const time=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,weekday:'short'}).format(now);const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',hour12:false}).format(now));const phase=(hour>=6&&hour<18)?'Day':'Night';return {time,phase};}
function initTimeZoneMap(){const pinRoot=$("cityPins"),zones=$("zoneBands");if(!pinRoot) return;if(zones){zones.innerHTML=Array.from({length:24},(_,i)=>`<rect class="zone" x="${(i*(1000/24)).toFixed(2)}" y="0" width="${(1000/24).toFixed(2)}" height="420" fill="${i%2?"#0ea5e9":"#60a5fa"}"/>`).join("");}pinRoot.innerHTML=MAP_CITIES.map(c=>{const p=project(c.lat,c.lon);return `<g class="pin" data-city="${c.name}" data-tz="${c.tz}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="8"></circle><circle r="14" fill="none" stroke="#3b82f655" stroke-width="4"></circle></g>`;}).join("");pinRoot.querySelectorAll(".pin").forEach(pin=>pin.addEventListener("click",()=>{pinRoot.querySelectorAll(".pin").forEach(p=>p.classList.remove("active"));pin.classList.add("active");const city=pin.dataset.city,tz=pin.dataset.tz;const info=cityTimeLabel(tz);$("selectedCityTime").textContent=`${city}: ${info.time}`;$("selectedCityMeta").textContent=`${tz} · ${info.phase} time`; }));updateSunBand();setInterval(updateSunBand,30000);}

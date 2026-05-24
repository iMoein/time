const OCC=['iran','iranCurrent','iranAncient','international','globalOfficial','marketing','islamic','islamicShia','islamicSunni','islamicShared'];
const NTP=[['ntp.time.ir','Iran NTP'],['pool.ntp.org','NTP Pool'],['time.google.com','Google'],['time.cloudflare.com','Cloudflare'],['time.windows.com','Microsoft'],['custom','Custom']];
const $=id=>document.getElementById(id);let lang='fa',cityPool=[],selectedCities=[];
async function api(path,opts={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
const setStatus=(id,m)=>$(id).textContent=m||'';
async function refreshCaptcha(){const d=await api('/api/admin/captcha');$('captchaText').textContent=d.captcha;}
function renderCities(){ $('defaultCityChips').innerHTML=selectedCities.map(c=>`<span class="chip">${c}<button data-rm="${c}" class="ghost">×</button></span>`).join(''); $('defaultSelectedCityInput').innerHTML=selectedCities.map(c=>`<option value="${c}">${c}</option>`).join('');}
function renderOcc(selected=[]){$('occasionChecks').innerHTML=OCC.map(o=>`<label><input type="checkbox" value="${o}" ${selected.includes(o)?'checked':''}/> ${o}</label>`).join('');}
function renderNtp(){ $('ntpPreset').innerHTML=NTP.map(([h,l])=>`<option value="${h}">${l} (${h})</option>`).join('');}
async function loadConfig(){const d=await api('/api/admin/config');$('ntpHost').value=d.ntpHost||'pool.ntp.org';selectedCities=(d.defaultCityIds||[]).slice();renderCities();$('defaultSelectedCityInput').value=d.defaultSelectedCityId||selectedCities[0]||'';renderOcc(d.defaultOccasionTypes||[]);}
async function loadPublicCities(){const z=Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[];cityPool=z.map(v=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-'));}
function suggest(){const q=$('citySearchInput').value.trim().toLowerCase();const list=cityPool.filter(c=>c.includes(q)&&!selectedCities.includes(c)).slice(0,12);$('citySuggestions').innerHTML=list.map(c=>`<button type="button" class="sug" data-add="${c}">${c}</button>`).join('');}
async function checkAuth(){try{const s=await api('/api/admin/session');$('loginCard').classList.add('hidden');$('dashboard').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');if(s.forcePasswordChange){$('forcePasswordCard').classList.remove('hidden');$('dashboardContent').classList.add('hidden');}else{$('forcePasswordCard').classList.add('hidden');$('dashboardContent').classList.remove('hidden');await loadConfig();}}catch{}}
$('refreshCaptcha').onclick=refreshCaptcha; $('langToggle').onclick=()=>{lang=lang==='fa'?'en':'fa';$('langToggle').textContent=lang==='fa'?'EN':'FA';document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';};
$('loginForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))});await checkAuth();}catch(err){setStatus('loginStatus',err.message);refreshCaptcha();}};
$('logoutBtn').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});location.reload();};
$('passwordForm').onsubmit=async e=>{e.preventDefault();if($('newPassword').value!==$('confirmPassword').value)return setStatus('passwordStatus','Passwords do not match');try{await api('/api/admin/change-password',{method:'POST',body:JSON.stringify({newPassword:$('newPassword').value})});await checkAuth();}catch(err){setStatus('passwordStatus',err.message);}};
$('citySearchInput').oninput=suggest; $('cityAddBtn').onclick=()=>{const v=$('citySearchInput').value.trim();if(v&&!selectedCities.includes(v)){selectedCities.push(v);renderCities();suggest();}};
$('citySuggestions').onclick=e=>{const v=e.target.dataset.add;if(v){selectedCities.push(v);renderCities();suggest();}};
$('defaultCityChips').onclick=e=>{const v=e.target.dataset.rm;if(v){selectedCities=selectedCities.filter(x=>x!==v);renderCities();}};
renderNtp(); $('ntpPreset').onchange=e=>{if(e.target.value!=='custom')$('ntpHost').value=e.target.value;};
$('ntpTestBtn').onclick=async()=>{try{const st=Date.now();const d=await api('/api/ntp?host='+encodeURIComponent($('ntpHost').value));$('ntpHostLabel').textContent=d.host;$('ntpDelay').textContent=(Date.now()-st)+'ms';setStatus('ntpStatus','Synced');}catch(err){setStatus('ntpStatus',err.message);}};
$('ntpForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/config',{method:'POST',body:JSON.stringify({ntpHost:$('ntpHost').value,defaultCityIds:selectedCities,defaultSelectedCityId:$('defaultSelectedCityInput').value,defaultOccasionTypes:[...$('occasionChecks').querySelectorAll('input:checked')].map(x=>x.value)})});setStatus('ntpStatus','Saved');setStatus('defaultsStatus','Saved');}catch(err){setStatus('ntpStatus',err.message);}};
$('defaultsForm').onsubmit=$('ntpForm').onsubmit;
loadPublicCities();refreshCaptcha();checkAuth();

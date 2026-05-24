const OCC=['iran','iranCurrent','iranAncient','international','globalOfficial','marketing','islamic','islamicShia','islamicSunni','islamicShared'];
const NTP=[['ntp.time.ir','Iran NTP'],['pool.ntp.org','NTP Pool'],['time.google.com','Google'],['time.cloudflare.com','Cloudflare'],['time.windows.com','Microsoft'],['custom','Custom']];
const $=id=>document.getElementById(id);let selectedCities=[],cityPool=[];
async function api(path,opts={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
const setStatus=(id,m)=>$(id).textContent=m||'';

const i18nLogin={fa:{loginTitle:'ورود امن مدیریت',username:'نام کاربری',password:'رمز عبور',captcha:'کپچا',loginBtn:'ورود',welcomeTitle:'خوش آمدید',welcomeDesc:'برای دسترسی به پنل مدیریت هوشمند زمان وارد شوید و تنظیمات پروژه را یکپارچه کنترل کنید.'},en:{loginTitle:'Secure Admin Login',username:'Username',password:'Password',captcha:'Captcha',loginBtn:'Login',welcomeTitle:'Welcome Back',welcomeDesc:'Sign in to access the smart time management console and centrally control project settings.'}};
function applyLoginLang(){const fa=document.documentElement.lang==='fa';const t=fa?i18nLogin.fa:i18nLogin.en;$('loginTitle').textContent=t.loginTitle;$('usernameLabel').textContent=t.username;$('passwordLabel').textContent=t.password;$('captchaLabel').textContent=t.captcha;$('loginBtn').textContent=t.loginBtn;$('welcomeTitle').textContent=t.welcomeTitle;$('welcomeDesc').textContent=t.welcomeDesc;}

function setMode(authenticated){const shell=$('appShell');$('dashHeader').classList.toggle('hidden',!authenticated);$('dashFooter').classList.toggle('hidden',!authenticated);if(authenticated){shell.classList.remove('auth-mode');shell.classList.add('dashboard-mode');}else{shell.classList.add('auth-mode');shell.classList.remove('dashboard-mode');}}

function renderCities(){ $('defaultCityChips').innerHTML=selectedCities.map(c=>`<span class='chip'>${c} <button class='btn soft' data-rm='${c}'>×</button></span>`).join(''); $('defaultSelectedCityInput').innerHTML=selectedCities.map(c=>`<option value='${c}'>${c}</option>`).join('');}
function renderOcc(selected=[]){$('occasionSelect').innerHTML=OCC.map(o=>`<option value='${o}' ${selected.includes(o)?'selected':''}>${o}</option>`).join('');}
function renderNtp(){ $('ntpPreset').innerHTML=NTP.map(([h,l])=>`<option value='${h}'>${l} (${h})</option>`).join(''); }
async function refreshCaptcha(){const d=await api('/api/admin/captcha');$('captchaText').textContent=d.captcha;}
async function loadConfig(){const d=await api('/api/admin/config');$('ntpHost').value=d.ntpHost||'pool.ntp.org';selectedCities=[...(d.defaultCityIds||[])];renderCities();$('defaultSelectedCityInput').value=d.defaultSelectedCityId||selectedCities[0]||'';renderOcc(d.defaultOccasionTypes||[]);}
async function loadJsonFiles(){const d=await api('/api/admin/json-files');$('jsonFileSelect').innerHTML=d.files.map(f=>`<option value='${f}'>${f}</option>`).join('');if(d.files[0])loadJson(d.files[0]);}
async function loadJson(file){const d=await api('/api/admin/json-file?file='+encodeURIComponent(file));$('jsonEditor').value=JSON.stringify(d.content,null,2);}
function suggest(){const q=$('citySearchInput').value.trim().toLowerCase();$('citySuggestions').innerHTML=cityPool.filter(c=>c.includes(q)&&!selectedCities.includes(c)).slice(0,10).map(c=>`<button data-add='${c}' type='button'>${c}</button>`).join('');}
async function initCities(){const z=Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[];cityPool=z.map(v=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-'));}
async function checkAuth(){try{const s=await api('/api/admin/session');setMode(true);$('dashboard').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');if(s.forcePasswordChange){$('forcePasswordCard').classList.remove('hidden');$('dashboardContent').classList.add('hidden');}else{$('forcePasswordCard').classList.add('hidden');$('dashboardContent').classList.remove('hidden');await loadConfig();await loadJsonFiles();}}catch{setMode(false);$('dashboard').classList.add('hidden');$('loginCard').classList.remove('hidden');}}

$('refreshCaptcha').onclick=refreshCaptcha; $('langToggle').onclick=()=>{const fa=document.documentElement.lang==='fa';document.documentElement.lang=fa?'en':'fa';document.documentElement.dir=fa?'ltr':'rtl';$('langToggle').textContent=fa?'FA':'EN';applyLoginLang();};
$('loginForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))});applyLoginLang();
checkAuth();}catch(err){setStatus('loginStatus',err.message);refreshCaptcha();}};
$('logoutBtn').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});location.reload();};
$('passwordForm').onsubmit=async e=>{e.preventDefault();if($('newPassword').value!==$('confirmPassword').value)return setStatus('passwordStatus','Passwords do not match');try{await api('/api/admin/change-password',{method:'POST',body:JSON.stringify({newPassword:$('newPassword').value})});checkAuth();}catch(err){setStatus('passwordStatus',err.message);}};
$('citySearchInput').oninput=suggest; $('cityAddBtn').onclick=()=>{const v=$('citySearchInput').value.trim();if(v&&!selectedCities.includes(v)){selectedCities.push(v);renderCities();suggest();}}; $('citySuggestions').onclick=e=>{const v=e.target.dataset.add;if(v){selectedCities.push(v);renderCities();suggest();}}; $('defaultCityChips').onclick=e=>{const v=e.target.dataset.rm;if(v){selectedCities=selectedCities.filter(x=>x!==v);renderCities();}};
renderNtp(); $('ntpPreset').onchange=e=>{if(e.target.value!=='custom')$('ntpHost').value=e.target.value;};
$('ntpTestBtn').onclick=async()=>{try{const st=Date.now();const d=await api('/api/ntp?host='+encodeURIComponent($('ntpHost').value));$('ntpHostLabel').textContent=d.host;$('ntpDelay').textContent=(Date.now()-st)+'ms';setStatus('ntpStatus','Synced successfully');}catch(err){setStatus('ntpStatus',err.message);}};
async function saveAll(){await api('/api/admin/config',{method:'POST',body:JSON.stringify({ntpHost:$('ntpHost').value,defaultCityIds:selectedCities,defaultSelectedCityId:$('defaultSelectedCityInput').value,defaultOccasionTypes:[...$('occasionSelect').selectedOptions].map(o=>o.value)})});setStatus('defaultsStatus','Saved');setStatus('ntpStatus','Saved');}
$('defaultsSaveBtn').onclick=()=>saveAll().catch(e=>setStatus('defaultsStatus',e.message)); $('ntpSaveBtn').onclick=()=>saveAll().catch(e=>setStatus('ntpStatus',e.message));
$('jsonLoadBtn').onclick=()=>loadJson($('jsonFileSelect').value); $('jsonSaveBtn').onclick=async()=>{try{await api('/api/admin/json-file',{method:'POST',body:JSON.stringify({file:$('jsonFileSelect').value,content:JSON.parse($('jsonEditor').value)})});setStatus('jsonStatus','Saved');}catch(e){setStatus('jsonStatus',e.message);}};

setMode(false);
initCities();
refreshCaptcha();
checkAuth();

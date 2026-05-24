const t = {
  fa: {title:'پنل مدیریت',loginTitle:'ورود امن',usernameLabel:'نام کاربری',passwordLabel:'رمز عبور',captchaLabel:'کپچا',loginBtn:'ورود',logout:'خروج',ntpTitle:'تنظیمات NTP',ntpSave:'ذخیره',ntpTest:'تست',jsonTitle:'مدیریت فایل‌های JSON',jsonLoad:'بارگذاری',jsonSave:'ذخیره'},
  en: {title:'Admin Panel',loginTitle:'Secure Login',usernameLabel:'Username',passwordLabel:'Password',captchaLabel:'Captcha',loginBtn:'Login',logout:'Logout',ntpTitle:'NTP Settings',ntpSave:'Save',ntpTest:'Test',jsonTitle:'JSON Files Manager',jsonLoad:'Load',jsonSave:'Save'}
};
let lang='fa';
const $=id=>document.getElementById(id);
function applyLang(){const x=t[lang];document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';$('title').textContent=x.title;$('loginTitle').textContent=x.loginTitle;$('usernameLabel').textContent=x.usernameLabel;$('passwordLabel').textContent=x.passwordLabel;$('captchaLabel').textContent=x.captchaLabel;$('loginBtn').textContent=x.loginBtn;$('logoutBtn').textContent=x.logout;$('ntpTitle').textContent=x.ntpTitle;$('ntpSaveBtn').textContent=x.ntpSave;$('ntpTestBtn').textContent=x.ntpTest;$('jsonTitle').textContent=x.jsonTitle;$('jsonLoadBtn').textContent=x.jsonLoad;$('jsonSaveBtn').textContent=x.jsonSave;$('langToggle').textContent=lang==='fa'?'EN':'FA';}
async function api(path,opts={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok) throw new Error(d.error||'Request failed');return d;}
async function refreshCaptcha(){const d=await api('/api/admin/captcha');$('captchaText').textContent=d.captcha;}
async function checkAuth(){try{await api('/api/admin/session');$('loginCard').classList.add('hidden');$('dashboard').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');await loadConfig();await loadJsonFiles();}catch{}}
$('langToggle').onclick=()=>{lang=lang==='fa'?'en':'fa';applyLang();};
$('refreshCaptcha').onclick=refreshCaptcha;
$('loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/admin/login',{method:'POST',body:JSON.stringify(Object.fromEntries(f.entries()))});$('loginStatus').textContent='OK';await checkAuth();}catch(err){$('loginStatus').textContent=err.message;await refreshCaptcha();}};
$('logoutBtn').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});location.reload();};
async function loadConfig(){const d=await api('/api/admin/config');$('ntpHost').value=d.ntpHost||'';}
$('ntpForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/config',{method:'POST',body:JSON.stringify({ntpHost:$('ntpHost').value})});$('ntpStatus').textContent='Saved';}catch(err){$('ntpStatus').textContent=err.message;}};
$('ntpTestBtn').onclick=async()=>{try{const d=await api('/api/ntp?host='+encodeURIComponent($('ntpHost').value));$('ntpStatus').textContent=new Date(d.time).toISOString();}catch(err){$('ntpStatus').textContent=err.message;}};
async function loadJsonFiles(){const d=await api('/api/admin/json-files');$('jsonFileSelect').innerHTML=d.files.map(f=>`<option value="${f}">${f}</option>`).join('');if(d.files[0])loadJson(d.files[0]);}
async function loadJson(file){const d=await api('/api/admin/json-file?file='+encodeURIComponent(file));$('jsonEditor').value=JSON.stringify(d.content,null,2);}
$('jsonLoadBtn').onclick=()=>loadJson($('jsonFileSelect').value);
$('jsonSaveBtn').onclick=async()=>{try{const content=JSON.parse($('jsonEditor').value);await api('/api/admin/json-file',{method:'POST',body:JSON.stringify({file:$('jsonFileSelect').value,content})});$('jsonStatus').textContent='Saved';}catch(err){$('jsonStatus').textContent=err.message;}};
applyLang();refreshCaptcha();checkAuth();

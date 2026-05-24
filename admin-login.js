const $=id=>document.getElementById(id);
const i18n={fa:{loginTitle:'ورود امن مدیریت',username:'نام کاربری',password:'رمز عبور',loginBtn:'ورود',welcomeTitle:'خوش آمدید',welcomeDesc:'برای دسترسی به پنل مدیریت هوشمند زمان وارد شوید و تنظیمات پروژه را یکپارچه کنترل کنید.'},en:{loginTitle:'Secure Admin Login',username:'Username',password:'Password',loginBtn:'Login',welcomeTitle:'Welcome Back',welcomeDesc:'Sign in to access the smart time management console and centrally control project settings.'}};
async function api(path,opts={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
function apply(){const fa=document.documentElement.lang==='fa';const t=fa?i18n.fa:i18n.en;$('loginTitle').textContent=t.loginTitle;$('usernameLabel').textContent=t.username;$('passwordLabel').textContent=t.password;$('loginBtn').textContent=t.loginBtn;$('welcomeTitle').textContent=t.welcomeTitle;$('welcomeDesc').textContent=t.welcomeDesc;}
async function refreshCaptcha(){const d=await api('/api/admin/captcha');$('captchaText').textContent=d.captcha;}
$('langToggle').onclick=()=>{const fa=document.documentElement.lang==='fa';document.documentElement.lang=fa?'en':'fa';document.documentElement.dir=fa?'ltr':'rtl';$('langToggle').textContent=fa?'FA':'EN';apply();};
$('refreshCaptcha').onclick=refreshCaptcha;
$('loginForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))});location.href='/admin-dashboard.html';}catch(err){$('loginStatus').textContent=err.message;refreshCaptcha();}};
api('/api/admin/session').then(()=>location.href='/admin-dashboard.html').catch(()=>{});
apply();refreshCaptcha();

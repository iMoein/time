import crypto from 'node:crypto';
import dgram from 'node:dgram';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';

const port = Number(process.env.PORT || 8585);
const adminPort = Number(process.env.ADMIN_PORT || 8686);
const root = resolve(process.cwd());
const dataRoot = resolve(join(root, 'src/data'));
const configPath = resolve(join(root, '.admin-config.json'));
const ntpPort = 123;
const ntpTimeoutMs = 3000;
const ntpEpochOffset = 2208988800;
const adminUser = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const sessions = new Map();
const captchas = new Map();
const loginAttempts = new Map();

const contentTypes = {'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.woff':'font/woff','.ttf':'font/ttf'};

function sendJson(response, statusCode, payload){response.writeHead(statusCode,{'Content-Type':'application/json; charset=utf-8'});response.end(JSON.stringify(payload));}
function parseCookies(header=''){return Object.fromEntries(header.split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i),decodeURIComponent(v.slice(i+1))];}));}
function randomCode(len=6){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join('');}
function sanitizeNtpHost(value){const host=value.trim();if(!host||host.length>253||!/^[a-zA-Z0-9.-]+$/.test(host)||host.includes('..'))return null;return host;}
function getSafePath(url, basePort){const {pathname}=new URL(url,`http://localhost:${basePort}`);const decoded=decodeURIComponent(pathname);const reqPath=normalize(decoded==='/'?'/index.html':decoded);const fp=resolve(join(root,reqPath));return fp.startsWith(root)?fp:null;}
function isAuth(req){const sid=parseCookies(req.headers.cookie).admin_session;return sid&&sessions.has(sid);}
function readBody(req){return new Promise((resolveBody,reject)=>{let data='';req.on('data',c=>data+=c);req.on('end',()=>{try{resolveBody(data?JSON.parse(data):{});}catch{reject(new Error('Invalid JSON body'));}});req.on('error',reject);});}
function ensureConfig(){if(!existsSync(configPath)){writeFileSync(configPath,JSON.stringify({ntpHost:'pool.ntp.org'},null,2));}return JSON.parse(readFileSync(configPath,'utf8'));}
function writeConfig(c){writeFileSync(configPath,JSON.stringify(c,null,2));}
function listJsonFiles(dir){const out=[];for(const name of readdirSync(dir,{withFileTypes:true})){const full=join(dir,name.name);if(name.isDirectory()) out.push(...listJsonFiles(full)); else if(name.isFile()&&name.name.endsWith('.json')) out.push(relative(dataRoot,full));}return out.sort();}
function safeDataFile(rel){const full=resolve(join(dataRoot,rel));if(!full.startsWith(dataRoot)||!full.endsWith('.json')) return null;return full;}

function readNtpTimestamp(buffer, offset){const s=buffer.readUInt32BE(offset);const f=buffer.readUInt32BE(offset+4);return (s-ntpEpochOffset)*1000+(f*1000)/0x100000000;}
function fetchNtpTime(host){return new Promise((resolveNtp,rejectNtp)=>{const socket=dgram.createSocket('udp4');const packet=Buffer.alloc(48);let settled=false;let socketReady=false;packet[0]=0x1b;const finish=(error,time)=>{if(settled)return;settled=true;clearTimeout(timeout);socket.removeAllListeners('error');socket.removeAllListeners('message');if(socketReady)socket.close();if(error)return rejectNtp(error);resolveNtp(time);};const timeout=setTimeout(()=>finish(new Error('NTP request timed out')),ntpTimeoutMs);socket.once('listening',()=>{socketReady=true;});socket.once('close',()=>{socketReady=false;});socket.once('error',e=>finish(e));socket.once('message',m=>{if(m.length<48)return finish(new Error('Invalid NTP response'));finish(null,readNtpTimestamp(m,40));});socket.send(packet,0,packet.length,ntpPort,host,e=>{if(e)finish(e);});});}
async function handleNtpRequest(requestUrl,response){const host=sanitizeNtpHost(requestUrl.searchParams.get('host')||'');if(!host)return sendJson(response,400,{error:'Enter a valid NTP hostname.'});try{const time=await fetchNtpTime(host);sendJson(response,200,{host,time,receivedAt:Date.now()});}catch(error){sendJson(response,502,{error:error.message||'NTP sync failed.',host});}}

const appServer=createServer((request,response)=>{const requestUrl=new URL(request.url||'/',`http://localhost:${port}`);if(requestUrl.pathname==='/api/ntp') return void handleNtpRequest(requestUrl,response);const filePath=getSafePath(request.url||'/',port);if(!filePath||!existsSync(filePath)||!statSync(filePath).isFile()){response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return response.end('Not found');}response.writeHead(200,{'Content-Type':contentTypes[extname(filePath)]||'application/octet-stream','Cache-Control':'no-store, max-age=0'});createReadStream(filePath).pipe(response);});

const adminServer=createServer(async (request,response)=>{const requestUrl=new URL(request.url||'/',`http://localhost:${adminPort}`);try{
if(requestUrl.pathname==='/api/ntp') return await handleNtpRequest(requestUrl,response);
if(requestUrl.pathname==='/api/admin/captcha'){const id=crypto.randomUUID();const captcha=randomCode(6);captchas.set(id,{captcha,expires:Date.now()+5*60_000});response.writeHead(200,{'Set-Cookie':`captcha_id=${id}; HttpOnly; SameSite=Strict; Path=/`,'Content-Type':'application/json; charset=utf-8'});return response.end(JSON.stringify({captcha}));}
if(requestUrl.pathname==='/api/admin/login'&&request.method==='POST'){const ip=request.socket.remoteAddress||'unknown';const blocked=loginAttempts.get(ip);if(blocked&&blocked.count>=5&&Date.now()-blocked.last<15*60_000)return sendJson(response,429,{error:'Too many attempts'});const body=await readBody(request);const ck=parseCookies(request.headers.cookie);const cap=captchas.get(ck.captcha_id);if(!cap||Date.now()>cap.expires||String(body.captcha||'').toUpperCase()!==cap.captcha)return sendJson(response,401,{error:'Invalid captcha'});if(body.username!==adminUser||body.password!==adminPassword){const prev=loginAttempts.get(ip)||{count:0,last:0};loginAttempts.set(ip,{count:prev.count+1,last:Date.now()});return sendJson(response,401,{error:'Invalid credentials'});}loginAttempts.delete(ip);const sid=crypto.randomUUID();sessions.set(sid,{at:Date.now()});response.writeHead(200,{'Set-Cookie':`admin_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,'Content-Type':'application/json; charset=utf-8'});return response.end(JSON.stringify({ok:true}));}
if(requestUrl.pathname==='/api/admin/logout'&&request.method==='POST'){const sid=parseCookies(request.headers.cookie).admin_session;if(sid)sessions.delete(sid);response.writeHead(200,{'Set-Cookie':'admin_session=deleted; Path=/; Max-Age=0','Content-Type':'application/json; charset=utf-8'});return response.end(JSON.stringify({ok:true}));}
if(requestUrl.pathname.startsWith('/api/admin/')&&!isAuth(request)) return sendJson(response,401,{error:'Unauthorized'});
if(requestUrl.pathname==='/api/admin/session') return sendJson(response,200,{ok:true});
if(requestUrl.pathname==='/api/admin/config'&&request.method==='GET') return sendJson(response,200,ensureConfig());
if(requestUrl.pathname==='/api/admin/config'&&request.method==='POST'){const body=await readBody(request);const host=sanitizeNtpHost(body.ntpHost||'');if(!host) return sendJson(response,400,{error:'Invalid NTP host'});writeConfig({ntpHost:host});return sendJson(response,200,{ok:true});}
if(requestUrl.pathname==='/api/admin/json-files') return sendJson(response,200,{files:listJsonFiles(dataRoot)});
if(requestUrl.pathname==='/api/admin/json-file'&&request.method==='GET'){const rel=requestUrl.searchParams.get('file')||'';const full=safeDataFile(rel);if(!full||!existsSync(full)) return sendJson(response,404,{error:'File not found'});return sendJson(response,200,{file:rel,content:JSON.parse(readFileSync(full,'utf8'))});}
if(requestUrl.pathname==='/api/admin/json-file'&&request.method==='POST'){const body=await readBody(request);const full=safeDataFile(body.file||'');if(!full||!existsSync(full)) return sendJson(response,404,{error:'File not found'});writeFileSync(full,JSON.stringify(body.content,null,2)+'\n');return sendJson(response,200,{ok:true});}
let filePath=requestUrl.pathname==='/'?resolve(join(root,'admin.html')):resolve(join(root,requestUrl.pathname.slice(1)));
if(!filePath.startsWith(root)||!existsSync(filePath)||!statSync(filePath).isFile()){response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return response.end('Not found');}
response.writeHead(200,{'Content-Type':contentTypes[extname(filePath)]||'application/octet-stream','Cache-Control':'no-store, max-age=0'});createReadStream(filePath).pipe(response);
}catch(e){sendJson(response,500,{error:e.message||'Internal error'});} });

appServer.listen(port,()=>console.log(`Time app is running at http://localhost:${port}`));
adminServer.listen(adminPort,()=>console.log(`Admin panel is running at http://localhost:${adminPort}`));

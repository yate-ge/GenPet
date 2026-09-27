import http from 'node:http';
import { refreshViaIpc } from './native-ipc.js';
import { copyFile, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Store, configureState } from './store.js';
import { HOUR, addContext, createPet, evolvePet, updateProfile, removeContext, DEFAULT_PROFILE } from './core.js';
import { artRequest, installNative, actions } from './art.js';
import { isLiveNativeDestination, listInstalledSprites } from './native-refresh.js';

const debuggerRoot=path.resolve(import.meta.dirname,'..');
async function bundledAssets(){return {portraits:{}};}
const SPRITE_NAME=/^spritesheet-[a-f0-9]{8,64}\.(webp|png)$/;

function nativePetDirectory() {
 return path.join(process.env.CODEX_HOME||path.join(homedir(),'.codex'),'pets','genpet-companion');
}

export async function nativePetSelection() {
 try {
  const home=process.env.CODEX_HOME||path.join(homedir(),'.codex');
  const state=JSON.parse(await readFile(path.join(home,'.codex-global-state.json'),'utf8'));
  const value=state['electron-persisted-atom-state']?.['selected-avatar-id'];
  const selectedPetId=typeof value==='string'?value:null;
  return {selectedPetId,genpetSelected:selectedPetId==='custom:genpet-companion'};
 } catch {
  return {selectedPetId:null,genpetSelected:null};
 }
}

export async function listNativeSprites() {
 const destination=nativePetDirectory();
 let current:string|null=null;
 try { current=JSON.parse(await readFile(path.join(destination,'pet.json'),'utf8')).spritesheetPath??null; } catch { /* no live pet yet */ }
 const sprites=(await listInstalledSprites(destination)).filter(name=>SPRITE_NAME.test(name)).sort();
 return {destination,current,sprites,live:isLiveNativeDestination(destination)};
}

export async function runNativeIpc(mode:'probe'|'refresh') {
 if(mode==='probe')throw new Error('Use explicit refresh to request IPC refresh');
 if(!isLiveNativeDestination(nativePetDirectory()))throw new Error('Isolated destinations cannot refresh the host');
 return {...await refreshViaIpc(),selection:await nativePetSelection()};
}
type IpcRunner=typeof runNativeIpc;
export async function switchNativeSprite(name:string, method='ipc', ipcRunner:IpcRunner=runNativeIpc) {
 if(!['ipc','file'].includes(method))throw new Error('未知刷新方式');
 if(!SPRITE_NAME.test(name)||name!==path.basename(name)) throw new Error('只能选择已安装的图集文件');
 const destination=nativePetDirectory();
 const sprite=path.join(destination,name);
 const root=await realpath(destination);
 const resolved=await realpath(sprite);
 if(resolved!==path.join(root,name)) throw new Error('只能选择已安装的图集文件');
 const manifestPath=path.join(destination,'pet.json');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 const next={...manifest,spritesheetPath:name};
 await copyFile(manifestPath,path.join(destination,'previous-pet.json')).catch((error:NodeJS.ErrnoException)=>{if(error.code!=='ENOENT')throw error;});
 const temporary=path.join(destination,`.pet-${randomUUID()}.json`);
 await writeFile(temporary,JSON.stringify(next,null,2));
 await rename(temporary,manifestPath);
 const live=isLiveNativeDestination(destination);
 if(method==='file')return {spritesheet:name,refresh:{displayStatus:'unconfirmed',strategy:'file-only',notice:'只替换文件，尚未请求刷新。'}};
 if(method==='ipc')return {spritesheet:name,refresh:await ipcRunner('refresh')};

}

export async function startServer(port=Number(process.env.GENPET_PORT||47831), root?:string, options:{ipcRunner?:IpcRunner}={}) {
 const real=new Store(root),demo=new Store(path.join(real.root,'debugger'),true);const token=randomBytes(24).toString('hex');
 const server=http.createServer(async(req,res)=>{
  const json=(value:unknown,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try {
   const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return json({error:'Local access only'},403);
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json({error:'Origin rejected'},403);
   const url=new URL(req.url||'/','http://'+host);const store=url.searchParams.get('demo')==='1'?demo:real;
   if(req.method==='GET'&&url.pathname==='/api/health')return json({service:'genpet-debugger',root:real.root});
   if(req.method==='GET'&&url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
   if(req.method==='GET'&&url.pathname==='/api/state') {
    const state=await store.peek();return json({state,now:store.now(state),demo:store.demo,token,artRequest:artRequest(state),assets:await bundledAssets(),actions,nativeSprites:store.demo?null:await listNativeSprites(),nativeSelection:store.demo?null:await nativePetSelection()});
   }
   if(req.method==='GET'&&url.pathname==='/api/art-request')return json(artRequest(await store.peek()));
   if(req.method==='POST'&&url.pathname==='/api/action') {
    const origin=req.headers.origin;if(origin&&origin!==`http://${host}`)return json({error:'Origin rejected'},403);
    if(req.headers['x-genpet-token']!==token)return json({error:'Invalid request token'},403);
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16_384)throw new Error('Request too large');}
    const input=JSON.parse(body);let result:unknown;
    if(input.action==='stop'){json({ok:true,result:{stopped:true}});server.close();server.closeIdleConnections();return;}
    if(input.action==='export'){if(store.demo)throw new Error('演示模式不能安装真实原生宠物');result=await installNative(store);}
    else if(input.action==='ipc-probe'||input.action==='ipc-refresh'){if(store.demo)throw new Error('演示模式不能操作真实宿主 IPC');result=await (options.ipcRunner||runNativeIpc)(input.action==='ipc-probe'?'probe':'refresh');}
    else if(input.action==='switch-native'){if(store.demo)throw new Error('演示模式不能切换真实悬浮宠物');result=await switchNativeSprite(String(input.spritesheet||''),String(input.refreshMethod||'ipc'),options.ipcRunner||runNativeIpc);}
    else result=await store.transaction(async s=>{
     if(input.action==='adopt')return store.adopt(s,input.profile||{});
     if(input.action==='settings') {
      return configureState(s,input);
     }
     if(input.action==='clear-context') {
      if(s.pet)for(const c of [...s.pet.context])s.pet=removeContext(s.pet,c.id,store.now(s));
      // Keep hashes to prevent immediately re-importing a cleared window.
      return {cleared:true};
     }
     if(input.action==='scan'){await store.sync(s,true);return s.scanInfo;}
     if(!s.pet)throw new Error('Adopt a pet first');
     if(input.action==='profile'){s.pet=updateProfile(s.pet,input.profile);return s.pet;}
     if(input.action==='context'){s.pet=addContext(s.pet,{kind:input.kind,summary:input.summary||'',source:'user',milestone:input.milestone===true},store.now(s));return s.pet;}
     if(input.action==='advance') {
      if(!store.demo)throw new Error('Time travel is available only in the demo');
      if(typeof input.hours!=='number'||!Number.isFinite(input.hours)||input.hours<=0||input.hours>24*90)throw new Error('Invalid demo time jump');
      s.clockOffset+=input.hours*HOUR;s.pet=evolvePet(s.pet,store.now(s));return s.pet;
     }
     if(input.action==='reset-demo') {
      if(!store.demo)throw new Error('Only demo data can be reset');
      s.clockOffset=0;s.pet=createPet({...DEFAULT_PROFILE,name:'GenPet Demo'},Date.now(),'genpet-demo-egg');s.art=[];return s.pet;
     }
     throw new Error('Unknown action');
    });return json({ok:true,result});
   }
   if(req.method==='GET'&&url.pathname.startsWith('/art/')) {
    const state=await store.peek();const record=state.art.find(a=>`${a.id}-${a.kind}`===url.pathname.slice(5));
    if(!record)return json({error:'Art not found'},404);
    res.writeHead(200,{'Content-Type':record.file.endsWith('.webp')?'image/webp':'image/png','Cache-Control':'private, max-age=3600'});res.end(await readFile(record.file));return;
   }
   if(req.method!=='GET')return json({error:'Not found'},404);
   let file:string;
   {const routes:Record<string,string>={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(!routes[url.pathname])return json({error:'Not found'},404);file=path.join(debuggerRoot,'debugger-web',routes[url.pathname]);}
   const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"});res.end(await readFile(file));
  }catch(e){if(!res.headersSent)json({error:(e as Error).message},(e as NodeJS.ErrnoException).code==='ENOENT'?404:400);else res.end();}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=await startServer();console.log(`GenPet debugger is ready at http://127.0.0.1:${(server.address() as {port:number}).port}`);
 for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>process.exit(0)));
}

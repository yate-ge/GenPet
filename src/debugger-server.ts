import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Store } from './store.js';
import { artRequest } from './art.js';
import { pluginRoot } from './plugin-root.js';
import { packageHost } from './prompts.js';
import { getNativePetCatalog } from './native-pets.js';
import { readNativePetLive, selectNativePetLive } from './native-pet-live.js';

/** Explicitly launched, local, read-only pet inspection. Switching requires an explicit action. */
export async function startServer(port=Number(process.env.GENPET_PORT||47831), root?:string) {
 const store=new Store(root,packageHost()), token=randomBytes(24).toString('hex');
 const server=http.createServer(async(req,res)=>{
  const json=(value:unknown,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try {
   const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return json({error:'Local access only'},403);
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json({error:'Origin rejected'},403);
   const url=new URL(req.url||'/','http://'+host);
   if(req.method==='GET'&&url.pathname==='/api/health')return json({service:'genpet-debugger',root:store.root});
   if(req.method==='GET'&&url.pathname==='/api/state')return json({state:await store.peek(),token});
   if(req.method==='GET'&&url.pathname==='/api/art-request')return json(artRequest(await store.peek()));
   if(req.method==='GET'&&url.pathname==='/api/native-pets')return json(store.host==='desktop'?{...await getNativePetCatalog(),live:await readNativePetLive()}:null);
   if(req.method==='POST'&&url.pathname==='/api/action') {
    if(req.headers['x-genpet-token']!==token)return json({error:'Invalid request token'},403);
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16_384)throw new Error('Request too large');}
    const input=JSON.parse(body);
    if(input.action==='stop'){json({ok:true,result:{stopped:true}});server.close();server.closeIdleConnections();return;}
    if(input.action==='switch-pet') {
     if(store.host!=='desktop')throw new Error('Dots cannot switch the desktop Pet');
     const catalog=await getNativePetCatalog();if(!catalog.pets.some(pet=>pet.id===input.petId))throw new Error('Unknown pet ID');
     return json({ok:true,result:await selectNativePetLive(input.petId)});
    }
    return json({error:'Use the story workflow to change pet records'},400);
   }
   if(req.method==='GET'&&url.pathname.startsWith('/art/')) {
    const state=await store.peek(), record=state.art.find(art=>art.id===url.pathname.slice(5));
    if(!record||record.kind==='artifact')return json({error:'Image not found'},404);
    res.writeHead(200,{'Content-Type':record.file.endsWith('.webp')?'image/webp':'image/png','Cache-Control':'no-store'});res.end(await readFile(record.file));return;
   }
   const routes:Record<string,string>={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
   if(req.method!=='GET'||!routes[url.pathname])return json({error:'Not found'},404);
   const file=path.join(pluginRoot(),'debugger-web',routes[url.pathname]),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
   res.writeHead(200,{'Content-Type':types[path.extname(file)],'Content-Security-Policy':"default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'"});res.end(await readFile(file));
  }catch(error){if(!res.headersSent)json({error:(error as Error).message},400);else res.end();}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=await startServer();for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>process.exit(0)));
}

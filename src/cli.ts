#!/usr/bin/env node
import { Store } from './store.js';
import { artRequest, acceptArt, installNative, nativeTick } from './art.js';
import { refreshNativePet } from './native-refresh.js';
import { installCdpLauncher, removeCdpLauncher, ensureCdpLauncher, isCdpAvailable, CDP_PORT } from './cdp-launcher.js';
import { HOUR, evolvePet } from './core.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { debugReset, debugGrow, debugState, type GrowthTarget, type DebugState } from './debug.js';
const argv=process.argv.slice(2);const demo=argv[0]==='--demo';if(demo)argv.shift();
const [command,...args]=argv;const store=new Store(undefined,demo);
try {
 let output:unknown;
 switch(command){
  case 'status':output=await store.current();break;
  case 'tick':await nativeTick(store);output=await store.current();break;
  case 'adopt':output=await store.transaction(s=>store.adopt(s,args[0]?{name:args[0]}:demo?{name:'GenPet Demo'}:{}));break;
  case 'advance':{
   if(!demo)throw new Error('Time travel requires --demo; the real adoption clock is immutable.');
   const hours=Number(args[0]);if(!Number.isFinite(hours)||hours<=0||hours>24*90)throw new Error('Use a positive demo time jump of at most 90 days.');
   output=await store.transaction(s=>{if(!s.pet)throw new Error('Adopt a demo egg first.');s.clockOffset+=hours*HOUR;s.pet=evolvePet(s.pet,store.now(s));return s.pet;});break;
  }
  case 'art-request':output=artRequest(await store.current());break;
  case 'debug-reset':output=await debugReset(store,args[0]||randomUUID());break;
  case 'debug-grow':{
   const value=args[0]||'next';
   output=await debugGrow(store,args[1]||randomUUID(),(/^\d+$/.test(value)?'next':value) as GrowthTarget,/^\d+$/.test(value)?Number(value):undefined);break;
  }
  case 'debug-state':output=await debugState(store,args[1]||randomUUID(),args[0] as DebugState);break;
  case 'accept-art':{
   const [requestId,file,kind,...provenance]=args;if(kind!=='portrait'&&kind!=='atlas')throw new Error('Usage: accept-art REQUEST_ID /absolute/image.png portrait|atlas "Imagegen provenance and QA"');
   output=await acceptArt(store,{requestId,file,kind,provenance:provenance.join(' ')});break;
  }
  case 'install-native':output=await installNative(store);break;
  case 'install-cdp-launcher':output=await installCdpLauncher({port:args[0]?Number(args[0]):CDP_PORT});break;
  case 'remove-cdp-launcher':output=await removeCdpLauncher();break;
  case 'cdp-status':output={port:CDP_PORT,available:await isCdpAvailable(),launcher:await ensureCdpLauncher()};break;
  case 'refresh-native':{
   const s=await store.current();
   const destination=path.join(process.env.CODEX_HOME||path.join((await import('node:os')).homedir(),'.codex'),'pets','genpet-companion');
   const manifest=JSON.parse(await (await import('node:fs/promises')).readFile(path.join(destination,'pet.json'),'utf8'));
   output=await refreshNativePet({expectedSpritePath:path.join(destination,manifest.spritesheetPath),petId:`custom:${manifest.id||'genpet-companion'}`});
   break;
  }
  default:throw new Error('Commands: [--demo] status, tick, adopt [name], art-request, accept-art <id> <file> <portrait|atlas> <provenance>, install-native, refresh-native, install-cdp-launcher [port], remove-cdp-launcher, cdp-status; debug-reset [operationId], debug-grow [next|hatch|juvenile|adult|days] [operationId], debug-state <build|research|create|learn|rest|none|auto> [operationId]; --demo advance <hours>');
 }
 console.log(JSON.stringify(output,null,2));
}catch(e){console.error((e as Error).message);process.exitCode=1;}

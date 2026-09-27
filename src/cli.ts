#!/usr/bin/env node
import { launchDebugger } from './debugger.js';
import { Store, configureState } from './store.js';
import { artRequest, acceptArt, installNative, nativeTick } from './art.js';
import { refreshNativePet } from './native-refresh.js';
import { HOUR, evolvePet, removeContext, updateProfile, type Palette } from './core.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { debugReset, debugGrow, debugState, type GrowthTarget, type DebugState } from './debug.js';
const argv=process.argv.slice(2);const demo=argv[0]==='--demo';if(demo)argv.shift();
const [command,...args]=argv;const store=new Store(undefined,demo);
const boolean=(value:string,key:string)=>{if(value==='true')return true;if(value==='false')return false;throw new Error(`${key} must be true or false.`);};
try {
 let output:unknown;
 switch(command){
  case 'debugger':output=await launchDebugger();break;
  case 'status':output=await store.current();break;
  case 'tick':await nativeTick(store);output=await store.current();break;
  case 'adopt':{
   const [name,palette]=args;
   if(palette&&!['sage','peach','sky','lilac'].includes(palette))throw new Error('Palette must be sage, peach, sky, or lilac.');
   const profile:Record<string,unknown>={};
   if(name)profile.name=name;else if(demo)profile.name='GenPet Demo';
   if(palette)profile.palette=palette as Palette;
   output=await store.transaction(s=>store.adopt(s,profile));break;
  }
  case 'advance':{
   if(!demo)throw new Error('Time travel requires --demo; the real adoption clock is immutable.');
   const hours=Number(args[0]);if(!Number.isFinite(hours)||hours<=0||hours>24*90)throw new Error('Use a positive demo time jump of at most 90 days.');
   output=await store.transaction(s=>{if(!s.pet)throw new Error('Adopt a demo egg first.');s.clockOffset+=hours*HOUR;s.pet=evolvePet(s.pet,store.now(s));return s.pet;});break;
  }
  case 'art-request':output=artRequest(await store.current());break;
  case 'configure':{
   const input:Record<string,unknown>={};
   for(const argument of args){const split=argument.indexOf('=');if(split<1)throw new Error('Configure values use key=value.');const key=argument.slice(0,split),value=argument.slice(split+1);
    if(['autoContext','freezeOutfit','autoArt'].includes(key))input[key]=boolean(value,key);
    else if(key==='name')input.name=value;
    else throw new Error(`Unknown setting: ${key}`);
   }
   output=await store.transaction(s=>{configureState(s,input);if(typeof input.name==='string'&&s.pet)s.pet=updateProfile(s.pet,{name:input.name});return s;});break;
  }
  case 'clear-context':output=await store.transaction(s=>{if(s.pet)for(const entry of [...s.pet.context])s.pet=removeContext(s.pet,entry.id,store.now(s));return {cleared:true,state:s};});break;
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
  case 'refresh-native':{
   const s=await store.current();
   const destination=path.join(process.env.CODEX_HOME||path.join((await import('node:os')).homedir(),'.codex'),'pets','genpet-companion');
   const manifest=JSON.parse(await (await import('node:fs/promises')).readFile(path.join(destination,'pet.json'),'utf8'));
   output=await refreshNativePet({expectedSpritePath:path.join(destination,manifest.spritesheetPath)});
   break;
  }
  default:throw new Error('Commands: debugger; [--demo] status, tick, adopt [name] [sage|peach|sky|lilac], art-request, configure key=value..., clear-context, accept-art <id> <file> <portrait|atlas> <provenance>, install-native, refresh-native; debug-reset [operationId], debug-grow [next|hatch|juvenile|adult|days] [operationId], debug-state <build|research|create|learn|rest|none|auto> [operationId]; --demo advance <hours>');
 }
 console.log(JSON.stringify(output,null,2));
}catch(e){console.error((e as Error).message);process.exitCode=1;}

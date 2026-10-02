import { spawn } from 'node:child_process';
import path from 'node:path';
import { Store, dataRoot } from './store.js';
import { packageHost } from './prompts.js';
export async function launchDebugger(port=Number(process.env.GENPET_PORT||(packageHost()==='dots'?47832:47831))) {
 if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid debugger port');
 const url=`http://127.0.0.1:${port}`, root=new Store(undefined,false,packageHost()).root;
 async function inspect() {
  let response:Response;try{response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});}catch{return false;}
  const value=await response.json().catch(()=>null);
  if(value?.service!=='genpet-debugger'||value.root!==root)throw new Error('Debugger port belongs to another service or data directory');return true;
 }
 if(await inspect())return {url,reused:true};
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'debugger-server.js')],{detached:true,stdio:'ignore',env:{...process.env,GENPET_PORT:String(port),GENPET_DATA_DIR:path.resolve(dataRoot())}});
 let failure:Error|undefined;child.once('error',error=>{failure=error;});child.unref();
 for(let i=0;i<50;i++){if(failure)throw failure;await new Promise(resolve=>setTimeout(resolve,100));if(await inspect())return {url,reused:false};if(child.exitCode!==null)throw new Error('Debugger failed to start');}
 throw new Error('Debugger startup timed out');
}

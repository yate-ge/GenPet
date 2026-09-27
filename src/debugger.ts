import { spawn } from 'node:child_process';
import path from 'node:path';
import { dataRoot } from './store.js';

/** Only an explicit CLI invocation starts the optional web server. */
export async function launchDebugger(port=Number(process.env.GENPET_PORT||47831)) {
 if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('GENPET_PORT must be an integer between 1024 and 65535');
 const url=`http://127.0.0.1:${port}`;
 const root=path.resolve(dataRoot());
 async function inspect() {
  let response:Response;
  try { response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)}); }
  catch { return false; }
  const state=await response.json().catch(()=>null);
  if(state?.service!=='genpet-debugger'||state.root!==root)throw new Error('Debugger port is occupied by another service or data directory. Set GENPET_PORT to a different port.');
  return true;
 }
 if(await inspect())return {url,reused:true};
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'debugger-server.js')],{
  detached:true,stdio:'ignore',env:{...process.env,GENPET_PORT:String(port),GENPET_DATA_DIR:root},
 });
 let failure:Error|undefined;
 child.once('error',error=>{failure=error;});child.unref();
 for(let i=0;i<50;i++) {
  if(failure)throw failure;
  await new Promise(resolve=>setTimeout(resolve,100));
  if(await inspect())return {url,reused:false};
  if(child.exitCode!==null)throw new Error('Debugger failed to start; check whether the port is occupied.');
 }
 throw new Error('Debugger startup timed out.');
}

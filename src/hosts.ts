import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { text } from './core.js';
import { atomicJson, type Store, type State, type HostResult } from './store.js';
import { desiredAppearance, pendingFor, recordHostResult } from './story.js';

export function hostRequest(state: State) {
  if (state.host !== 'dots') throw new Error('This handoff is for Dots Avatar updates');
  if (!state.pending?.plan?.appearance) throw new Error('No planned Avatar update');
  if (!state.pet?.binding) throw new Error('Bind the actual Dots Avatar before requesting an update');
  const pending=pendingFor(state,state.pending.id), art=desiredAppearance(state);
  if (!art || art.kind!=='avatar') throw new Error('Complete or select Dots Avatar artwork first');
  return { operation:'update-avatar', petId:pending.petId, operationId:pending.id,
    name:state.pet!.name,
    target:state.pet!.binding, file:art.file, appearanceId:art.id,
    description:state.pending.plan.appearance.description, stage:state.pending.plan.stage,
    refreshWhenActive:true, preserveCurrentSelection:true };
}
export async function bindAvatar(store: Store, avatarId: string) {
  if (store.demo || store.host!=='dots') throw new Error('bind-avatar is for a real Dots pet');
  return store.transaction(state=>{
    if (!state.pet) throw new Error('Allocate the pet identity first');
    const id=text(avatarId,'avatarId');
    if (state.pet.binding && state.pet.binding.avatarId!==id) throw new Error('Target is already bound; preserve the existing Avatar');
    return state.pet.binding ??= {host:'dots',avatarId:id};
  });
}
export interface Adapter { command:string; args:string[]; }
export async function configureAdapter(store: Store, adapter: Adapter) {
  if (store.host!=='dots') throw new Error('Desktop has its own native adapter');
  if (!path.isAbsolute(adapter.command) || !(await stat(adapter.command)).isFile() || !Array.isArray(adapter.args) || !adapter.args.every(arg=>typeof arg==='string')) throw new Error('Adapter needs an absolute executable and string arguments');
  await atomicJson(path.join(store.root,'avatar-adapter.json'),adapter); return adapter;
}
/** Dots Agent may implement this small stdin/stdout bridge using its own host capabilities. */
async function invoke(adapter: Adapter, request: unknown): Promise<HostResult> {
  return new Promise((resolve,reject)=>{
    const child=spawn(adapter.command,adapter.args,{shell:false,stdio:['pipe','pipe','pipe']});
    let output='', error='', settled=false;
    const timer=setTimeout(()=>{child.kill();finish(new Error('Dots Avatar adapter timed out; resume this operation'));},20_000);
    function finish(failure?: Error,value?: HostResult) {
      if (settled) return; settled=true; clearTimeout(timer); if(failure)reject(failure);else resolve(value!);
    }
    child.once('error',error=>finish(error)); child.stdin.on('error',error=>finish(error));
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>1024*1024){child.kill();finish(new Error('Avatar adapter response is too large'));}});
    child.stderr.on('data',chunk=>{if(error.length<4096)error+=chunk;});
    child.once('close',code=>{
      if(code!==0)return finish(new Error(`Avatar adapter failed (${code}): ${error}`));
      try {finish(undefined,JSON.parse(output));}catch{finish(new Error('Avatar adapter must return one JSON result'));}
    });
    child.stdin.end(JSON.stringify(request));
  });
}
export async function publishDots(store: Store) {
  if (store.demo) throw new Error('Demo records cannot update a host Avatar');
  const request=hostRequest(await store.peek());
  // Persist operation/target before the external action. A failed or ambiguous action is resumed in place.
  const adapter=JSON.parse(await readFile(path.join(store.root,'avatar-adapter.json'),'utf8')) as Adapter;
  const result=await invoke(adapter,request);
  return recordHostResult(store,request.operationId,result);
}

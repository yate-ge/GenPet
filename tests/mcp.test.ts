import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
test('MCP starts, exposes tools, adopts once, and produces pixel-native generation requests',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-mcp-'));
 const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx','src/mcp.ts'],cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,GENPET_DATA_DIR:dir} as Record<string,string>,stderr:'pipe'});
 const client=new Client({name:'genpet-test',version:'1.0.0'});
 try {
  await client.connect(transport);const {tools}=await client.listTools();assert.equal(tools.length,12);assert.equal(tools.some(t=>t.name==='genpet_open_lab'||t.name==='genpet_demo_native'),false);
  assert.equal(tools.some(t=>t.name==='genpet_install_cdp_launcher'),true);
  assert.equal(tools.some(t=>t.name==='genpet_remove_cdp_launcher'),true);
  const call=async(name:string,args:Record<string,unknown>={})=>{const r=await client.callTool({name,arguments:args});return {error:r.isError,value:JSON.parse((r.content as any)[0].text)};};
  await call('genpet_configure',{autoContext:false});
  assert.equal((await call('genpet_status')).value.state.pet,null);
  const first=await call('genpet_adopt',{name:'Test Seed'});assert.equal(first.value.stage,'egg');
  assert.equal((await call('genpet_adopt')).error,true);
  const request=await call('genpet_art_request');assert.equal(request.value.status,'pending');assert.match(request.value.prompt,/pixel art/);assert.equal(request.value.contract.rows,11);
  assert.equal((await call('genpet_install_native')).error,true);
  const reset=await call('genpet_debug_reset',{operationId:'reset-mcp'});assert.equal(reset.value.state.pet.stage,'egg');assert.notEqual(reset.value.state.pet.seed,first.value.seed);
  assert.equal((await call('genpet_debug_reset',{operationId:'reset-mcp'})).value.alreadyApplied,true);
  assert.equal((await call('genpet_debug_state',{operationId:'state-egg',kind:'create'})).error,true);
  const req=(await call('genpet_art_request')).value;
  for(const kind of ['portrait','atlas'])await call('genpet_accept_art',{requestId:req.id,file:path.resolve('assets/pets/mystery-egg/spritesheet.webp'),kind,provenance:'Isolated MCP fixture; not visual generation evidence.'});
  const hatch=await call('genpet_debug_grow',{operationId:'grow-mcp'});assert.equal(hatch.value.state.pet.stage,'hatchling');
  assert.equal((await call('genpet_debug_grow',{operationId:'grow-mcp'})).value.alreadyApplied,true);
  assert.equal((await call('genpet_debug_state',{operationId:'brush-mcp',kind:'create'})).value.artRequest.visual.prop,'brush');
  assert.equal((await call('genpet_debug_state',{operationId:'auto-mcp',kind:'auto'})).value.state.debug.stateOverride,undefined);
  await call('genpet_configure',{autoArt:false});assert.equal((await call('genpet_art_request')).value.status,'paused');
 }finally{await client.close();await rm(dir,{recursive:true,force:true});}
});

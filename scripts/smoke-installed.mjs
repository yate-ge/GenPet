import { execFileSync } from 'node:child_process';
import { mkdtemp,rm,readFile,access,readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(process.argv[2]||'.');
const fixtureRoot=path.resolve(process.argv[3]||root);
const { readImageInfo }=await import(pathToFileURL(path.join(fixtureRoot,'dist','image.js')).href);
const temp=await mkdtemp(path.join(tmpdir(),'genpet-installed-'));
const env={...process.env,GENPET_DATA_DIR:path.join(temp,'data'),CODEX_HOME:path.join(temp,'codex')};
const call=(...args)=>JSON.parse(execFileSync(process.execPath,['dist/cli.js',...args],{cwd:root,env,encoding:'utf8',maxBuffer:16*1024*1024}));

try {
 for(const name of ['genpet-start','genpet-reset','genpet-grow','genpet-state'])await access(path.join(root,'skills',name,'SKILL.md'));
 await access(path.join(root,'docs','DEBUG_COMMANDS.zh-CN.md'));
 for(const removed of ['.mcp.json','dist/mcp.js','web','dist/server.js'])assert.equal(await access(path.join(root,removed)).then(()=>true,()=>false),false,`${removed} leaked into CLI-only plugin`);
 call('configure','autoContext=false');
 const born=call('adopt','Smoke Egg');assert.equal(born.stage,'egg');assert.equal(born.hatchIdentity,null);
 const request=call('art-request');assert.equal(request.status,'pending');assert.equal(request.contract.rows,11);
 call('accept-art',request.id,path.join(fixtureRoot,'assets/pets/mystery-egg/spritesheet.webp'),'portrait','Isolated repository egg fixture for CLI lifecycle smoke; not personalized visual evidence.');
 call('accept-art',request.id,path.join(fixtureRoot,'assets/pets/mystery-egg/spritesheet.webp'),'atlas','Isolated repository egg fixture for install smoke test; not personalized visual evidence.');
 const results=[];
 for(let repeat=0;repeat<2;repeat++){
  const installed=call('install-native');
  const manifest=JSON.parse(await readFile(path.join(installed.destination,'pet.json'),'utf8'));assert.equal(manifest.spriteVersionNumber,2);assert.equal(manifest.id,'genpet-companion');
  const meta=await readImageInfo(path.join(installed.destination,manifest.spritesheetPath));assert.equal(meta.width,1536);assert.equal(meta.height,2288);assert.ok(meta.hasAlpha);
  results.push({id:manifest.id,destination:installed.destination,sprite:manifest.spritesheetPath});
 }
 assert.deepEqual(results[0],results[1]);
 assert.deepEqual(await readdir(path.join(temp,'codex','pets')),['genpet-companion']);
 const egg=call('status');assert.equal(egg.pet.stage,'egg');assert.equal(egg.pet.adoptedAt,born.adoptedAt);
 const hatch=call('debug-grow','next','smoke-hatch');
 assert.equal(hatch.state.pet.stage,'hatchling');assert.equal(hatch.state.pet.growth.days,0);
 assert.equal(hatch.state.pet.adoptedAt,born.adoptedAt);assert.equal(hatch.state.pet.seed,born.seed);
 assert.equal(hatch.artRequest.status,'pending');
 const hatchFixture=path.join(fixtureRoot,'assets/pets/lifecycle-hatchling/spritesheet.webp');
 for(const kind of ['portrait','atlas'])call('accept-art',hatch.artRequest.id,hatchFixture,kind,'Isolated repository hatchling fixture for CLI lifecycle smoke; not visual identity evidence.');
 const hatchInstalled=call('install-native');assert.equal(hatchInstalled.manifest.id,'genpet-companion');
 assert.notEqual(hatchInstalled.manifest.spritesheetPath,results[0].sprite);
 const day=call('debug-grow','next','smoke-day1');
 assert.equal(day.state.pet.growth.days,1);assert.equal(day.state.pet.adoptedAt,born.adoptedAt);
 assert.deepEqual(day.state.pet.hatchIdentity,hatch.state.pet.hatchIdentity);
 assert.equal(call('debug-grow','next','smoke-day1').alreadyApplied,true);
 const empty=call('debug-state','none','smoke-empty');assert.equal(empty.artRequest.visual.prop,'none');
 const growthFixture=path.join(fixtureRoot,'assets/pets/lifecycle-growth/spritesheet.webp');
 for(const kind of ['portrait','atlas'])call('accept-art',empty.artRequest.id,growthFixture,kind,'Isolated repository growth fixture for CLI command wiring only; not personalized growth visual evidence.');
 const emptyInstalled=call('install-native');assert.equal(emptyInstalled.manifest.id,'genpet-companion');
 const brush=call('debug-state','create','smoke-brush');assert.equal(brush.artRequest.visual.prop,'brush');assert.equal(brush.artRequest.status,'pending');
 call('accept-art',brush.artRequest.id,path.join(fixtureRoot,'assets/pets/lifecycle-context/spritesheet.webp'),'atlas','Isolated repository context fixture for CLI A-B-A contract; not personalized visual evidence.');
 const brushInstalled=call('install-native');assert.notEqual(brushInstalled.manifest.spritesheetPath,emptyInstalled.manifest.spritesheetPath);
 const back=call('debug-state','none','smoke-empty-again');assert.equal(back.artRequest.id,empty.artRequest.id);assert.equal(back.artRequest.status,'ready');
 const backInstalled=call('install-native');assert.equal(backInstalled.manifest.spritesheetPath,emptyInstalled.manifest.spritesheetPath);
 assert.equal(call('debug-state','auto','smoke-auto').state.debug.stateOverride,undefined);
 assert.deepEqual(await readdir(path.join(temp,'codex','pets')),['genpet-companion']);
 const reset=call('debug-reset','smoke-reset');assert.equal(reset.state.pet.stage,'egg');assert.notEqual(reset.state.pet.seed,born.seed);
 assert.equal(call('debug-reset','smoke-reset').alreadyApplied,true);
 assert.deepEqual(await readdir(path.join(temp,'codex','pets')),['genpet-companion']);
 console.log(JSON.stringify({ok:true,interface:'cli',webBundled:false,sameEntryInstalls:results,isolatedFlow:['egg','hatch','day1','none','create','none','auto','reset'],realUserStateTouched:false,visibleNativeUIVerified:false},null,2));
}finally{await rm(temp,{recursive:true,force:true});}

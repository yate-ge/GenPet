import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
const plugin=path.resolve(process.argv[2]);
const root=await mkdtemp(path.join(tmpdir(),'genpet-debugger-smoke-'));
const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const env={...process.env,CODEX_HOME:path.join(root,'home'),GENPET_DATA_DIR:path.join(root,'data'),GENPET_PORT:String(port),CODEX_APP_TOOLS_PIPE_PATH:'',CODEX_THREAD_ID:''};
const launch=()=>JSON.parse(execFileSync(process.execPath,[path.join(plugin,'dist/cli.js'),'debugger'],{env,encoding:'utf8'}));
let url;
try {
 const first=launch();url=first.url;assert.equal(first.reused,false);assert.equal(launch().reused,true);
 const state=await (await fetch(url+'/api/state')).json();assert.equal(state.state.pet,null);
 await assert.rejects(access(path.join(root,'data',state.state.host,'state.json')));
 for(const page of ['/','/app.js','/style.css'])assert.equal((await fetch(url+page)).status,200);
 console.log('Installed debugger launch, reuse, assets and read-only state: passed');
} finally {
 if(url){const state=await (await fetch(url+'/api/state')).json();assert.equal((await fetch(url+'/api/action',{method:'POST',headers:{'X-GenPet-Token':state.token},body:JSON.stringify({action:'stop'})})).status,200);}
 await rm(root,{recursive:true,force:true});
}

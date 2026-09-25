import { mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { retireLegacyDemo } from '../dist/native-migration.js';
import { removeLegacyStartupMonitor } from '../dist/cdp-launcher.js';
import { copyRuntimeFiles } from './runtime-layout.js';
const source=path.resolve(import.meta.dirname,'..');
const target=path.join(homedir(),'plugins','genpet');
await mkdir(target,{recursive:true});
for(const item of ['dist','assets','web','skills','vendor','scripts','config','docs','.codex-plugin','.mcp.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md']) {
  // Remove obsolete GenPet-owned examples/dev files; user state is elsewhere.
  await rm(path.join(target,item),{recursive:true,force:true});
}
await copyRuntimeFiles(source,target);
const pkg=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));
await writeFile(path.join(target,'package.json'),JSON.stringify({...pkg,scripts:{start:'node dist/mcp.js',mcp:'node dist/mcp.js','pet:status':'node dist/cli.js status','pet:adopt':'node dist/cli.js adopt','pet:install':'node dist/cli.js install-native'}},null,2));
// Install the locked production dependencies for the user's platform.
execFileSync('npm',['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:target,stdio:'inherit'});
const marketplace=path.join(homedir(),'.agents','plugins','marketplace.json');
const catalog=JSON.parse(await readFile(marketplace,'utf8'));
if(!catalog.plugins?.some((p:any)=>p.name==='genpet'))throw new Error('GenPet marketplace entry is missing. Follow README setup first.');
if(!/^[A-Za-z0-9_-]+$/.test(catalog.name))throw new Error('Invalid marketplace identifier');
const creator=path.join(process.env.CODEX_HOME||path.join(homedir(),'.codex'),'skills','.system','plugin-creator','scripts');
const marketplaceName=execFileSync('python3',[path.join(creator,'read_marketplace_name.py')],{encoding:'utf8'}).trim();
execFileSync('python3',[path.join(creator,'update_plugin_cachebuster.py'),target],{stdio:'inherit'});
execFileSync('codex',['plugin','add',`genpet@${marketplaceName}`,'--json'],{stdio:'inherit'});
const retired=await retireLegacyDemo(process.env.CODEX_HOME||path.join(homedir(),'.codex'),path.join(homedir(),'.genpet','backups'));
if(retired)console.log(`Retired legacy GenPet Demo entry; recoverable backup: ${retired.backup}`);
console.log(`Installed GenPet from ${target}. New Codex tasks will load its skill and MCP tools.`);
await removeLegacyStartupMonitor();
console.log('Removed any legacy GenPet CDP startup monitor.');

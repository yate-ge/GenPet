/** Shared framework sources; each host keeps its own skills, manifest and records. */
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
const source=path.resolve(import.meta.dirname,'..'),pkg=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));
for(const name of ['genpet','genpet-dots']) {
 const target=path.join(source,'plugins',name),manifest=JSON.parse(await readFile(path.join(target,'.codex-plugin/plugin.json'),'utf8'));
 if(manifest.version!==pkg.version)throw new Error(`Version mismatch: ${name}`);
 for(const required of ['README.md','config/host.json','skills/genpet/SKILL.md','skills/genpet-story/SKILL.md','scripts/verify-install.mjs'])await access(path.join(target,required));
 await rm(path.join(target,'dist'),{recursive:true,force:true});await mkdir(path.join(target,'dist'),{recursive:true});
 for(const folder of ['prompts','references','debugger-web']) {
  await rm(path.join(target,folder),{recursive:true,force:true});await cp(path.join(source,'framework',folder),path.join(target,folder),{recursive:true});
 }
 await build({entryPoints:{cli:'src/cli.ts','debugger-server':'src/debugger-server.ts'},absWorkingDir:source,outdir:path.join(target,'dist'),bundle:true,platform:'node',format:'esm',target:'node22',legalComments:'eof',logLevel:'warning',banner:{js:"import { createRequire as __genpetCreateRequire } from 'node:module'; const require = __genpetCreateRequire(import.meta.url);"}});
 await cp(createRequire(import.meta.url).resolve('@jsquash/webp/codec/dec/webp_dec.wasm'),path.join(target,'dist/webp_dec.wasm'));
 await writeFile(path.join(target,'package.json'),JSON.stringify({name,version:pkg.version,private:true,type:'module',license:pkg.license,description:pkg.description,engines:pkg.engines,bin:{[name]:'dist/cli.js'},scripts:{'pet:status':'node dist/cli.js status'}},null,2)+'\n');
 async function verify(directory:string):Promise<void> {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
   const file=path.join(directory,entry.name);
   if(entry.isDirectory())await verify(file);
   else if(/\.(js|json|md|ts|py|ya?ml)$/.test(entry.name)&&/\bcdp\b|remote-debugging|DevToolsActivePort|webSocketDebuggerUrl|Runtime\.evaluate/i.test(await readFile(file,'utf8')))throw new Error(`Obsolete transport in ${file}`);
  }
 }
 await verify(target);console.log(`Built ${name} v${pkg.version}`);
}

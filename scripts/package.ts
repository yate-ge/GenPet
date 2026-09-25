/** Offline archive with the same layout as the GitHub marketplace: .agents/ plus plugins/genpet/. */
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const source=path.resolve(import.meta.dirname,'..');
const {version}=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));
await mkdir(path.join(source,'output'),{recursive:true});
const archive=path.join(source,'output',`genpet-${version}.zip`);await rm(archive,{force:true});
execFileSync('zip',['-qr',archive,'.agents/plugins/marketplace.json','plugins/genpet','-x','*.DS_Store','*__pycache__*'],{cwd:source});
console.log(archive);

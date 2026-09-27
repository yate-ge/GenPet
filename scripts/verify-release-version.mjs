/** Prevent republishing changed plugin contents under an existing version. */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
const current = JSON.parse(await readFile('package.json','utf8')).version;
const lock = JSON.parse(await readFile('package-lock.json','utf8'));
for (const file of ['plugins/genpet/package.json','plugins/genpet/.codex-plugin/plugin.json']) {
  if (JSON.parse(await readFile(file,'utf8')).version !== current) throw new Error(`Version mismatch: ${file}`);
}
if (lock.version !== current || lock.packages[''].version !== current) throw new Error('Lockfile version mismatch');
const base = process.env.GENPET_RELEASE_BASE || 'origin/main';
const previous = JSON.parse(git('show',`${base}:package.json`)).version;
const parse = v => { if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error(`Expected stable semantic version: ${v}`); return v.split('.').map(Number); };
const a=parse(current), b=parse(previous);
let comparison=0;
for(let i=0;i<3;i++) if(a[i]!==b[i]) { comparison=Math.sign(a[i]-b[i]); break; }
const changed = git('diff',base,'--','plugins/genpet');
const untracked = git('ls-files','--others','--exclude-standard','plugins/genpet');
if (comparison < 0 || (comparison === 0 && (changed || untracked))) throw new Error(`Changed release must increment ${previous}; current ${current} (base ${base})`);
console.log(`Release version verified: ${previous} -> ${current} (${base})`);

import { mkdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Retire only the legacy entry created by GenPet, keeping a recoverable backup. */
export async function retireLegacyDemo(codexHome:string, backupRoot:string) {
  const source=path.join(codexHome,'pets','genpet-demo');
  let manifest;
  try { manifest=JSON.parse(await readFile(path.join(source,'pet.json'),'utf8')); }
  catch(e) { if((e as NodeJS.ErrnoException).code==='ENOENT')return null; throw e; }
  if(manifest.id!=='genpet-demo'||manifest.displayName!=='GenPet Demo')return null;
  await mkdir(backupRoot,{recursive:true});
  const destination=path.join(backupRoot,`removed-demo-${Date.now()}-${randomUUID()}`);
  await rename(source,destination);
  return {source,backup:destination};
}

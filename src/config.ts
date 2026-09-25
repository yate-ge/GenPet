import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Profile,GrowthPolicy } from './core.js';
export async function adoptionConfig():Promise<{defaultProfile:Partial<Profile>;timing:Partial<GrowthPolicy>}> {
 const file=process.env.GENPET_POLICY_FILE||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../config/policy.json');
 const config=JSON.parse(await readFile(file,'utf8'));
 if(!config||typeof config!=='object'||!config.defaultProfile||!config.timing)throw new Error('Invalid GenPet adoption policy');
 return config;
}

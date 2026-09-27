import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Profile,GrowthPolicy } from './core.js';
import { pluginRoot } from './plugin-root.js';
export async function adoptionConfig():Promise<{defaultProfile:Partial<Profile>;timing:Partial<GrowthPolicy>}> {
 const file=process.env.GENPET_POLICY_FILE||path.join(pluginRoot(),'config','policy.json');
 const config=JSON.parse(await readFile(file,'utf8'));
 if(!config||typeof config!=='object'||!config.defaultProfile||!config.timing)throw new Error('Invalid GenPet adoption policy');
 return config;
}

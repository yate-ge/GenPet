/** Files needed by the installed plugin. Research examples and dev tools stay in source. */
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const directories = ['skills', 'vendor', 'config', '.codex-plugin'];
const files = ['.mcp.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md'];
const helpers = ['normalize_alpha_noise.py', 'audit_atlas_growth.py'];
const helpDocs = ['DEBUG_COMMANDS.zh-CN.md', 'NATIVE_REFRESH.zh-CN.md'];
const distributable = (file: string) => !file.split(path.sep).includes('__pycache__') && !/\.pyc$|\.DS_Store$/.test(file);

/** Copies everything except the bundled `dist/`, which scripts/build-plugin.ts produces. */
export async function copyRuntimeFiles(source: string, target: string): Promise<void> {
  for (const item of [...directories, ...files]) {
    await cp(path.join(source, item), path.join(target, item), { recursive: true, filter: distributable });
  }
  await mkdir(path.join(target, 'scripts'), { recursive: true });
  for (const helper of helpers) await cp(path.join(source, 'scripts', helper), path.join(target, 'scripts', helper));
  await mkdir(path.join(target, 'docs'), { recursive: true });
  for (const doc of helpDocs) await cp(path.join(source, 'docs', doc), path.join(target, 'docs', doc));
  await cp(path.join(source, 'PLUGIN_README.md'), path.join(target, 'README.md'));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { pluginRoot } from '../src/plugin-root.js';

const exists=(file:string)=>access(file).then(()=>true,()=>false);

test('plugins/genpet is the single source of installable static content',async()=>{
 const root=path.resolve('.');
 const plugin=path.join(root,'plugins','genpet');
 assert.equal(pluginRoot(),plugin);
 for(const relative of ['.codex-plugin/plugin.json','config/policy.json','debugger-web/index.html','skills/genpet/SKILL.md','vendor/hatch-pet/SKILL.md']) {
  assert.equal(await exists(path.join(plugin,relative)),true,`missing canonical plugin file: ${relative}`);
 }
 for(const relative of ['.codex-plugin','.mcp.json','config','debugger-web','skills','vendor','PLUGIN_README.md']) {
  assert.equal(await exists(path.join(root,relative)),false,`obsolete root-level plugin copy: ${relative}`);
 }
 assert.equal(await exists(path.join(plugin,'.mcp.json')),false,'CLI-only plugin must not publish an MCP server');
});

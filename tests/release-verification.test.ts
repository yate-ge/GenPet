import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, cp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
const verifier=path.resolve('scripts/verify-install.mjs');
const versionGate=path.resolve('scripts/verify-release-version.mjs');

test('installed verification rejects stale content, version mismatch and extra files',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-integrity-'));
 try {
  const expected=path.join(dir,'expected'), installed=path.join(dir,'installed');
  await mkdir(path.join(expected,'.codex-plugin'),{recursive:true});
  for(const name of ['package.json','.codex-plugin/plugin.json'])await writeFile(path.join(expected,name),JSON.stringify({version:'0.1.1'}));
  await writeFile(path.join(expected,'SKILL.md'),'Delegate image generation');
  await cp(expected,installed,{recursive:true});
  const check=()=>spawnSync(process.execPath,[verifier,installed,expected],{encoding:'utf8'});
  assert.equal(check().status,0);
  await writeFile(path.join(installed,'SKILL.md'),'Do not delegate');assert.notEqual(check().status,0);
  await cp(expected,installed,{recursive:true});
  await writeFile(path.join(installed,'package.json'),JSON.stringify({version:'0.1.0'}));assert.notEqual(check().status,0);
  await cp(expected,installed,{recursive:true});
  await writeFile(path.join(installed,'obsolete.js'),'stale runtime');assert.notEqual(check().status,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('release gate rejects same-version payload changes and permits a consistent patch bump',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-version-'));
 try {
  const git=(...args:string[])=>execFileSync('git',args,{cwd:dir,stdio:'pipe'});
  git('init');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  const manifests=['package.json','.codex-plugin/plugin.json','plugins/genpet/package.json','plugins/genpet/.codex-plugin/plugin.json'];
  const setVersion=async(version:string)=>{
   for(const f of manifests){await mkdir(path.dirname(path.join(dir,f)),{recursive:true});await writeFile(path.join(dir,f),JSON.stringify({version}));}
   await writeFile(path.join(dir,'package-lock.json'),JSON.stringify({version,packages:{'':{version}}}));
  };
  await setVersion('0.1.0');git('add','.');git('commit','-m','baseline');
  const check=()=>spawnSync(process.execPath,[versionGate],{cwd:dir,env:{...process.env,GENPET_RELEASE_BASE:'HEAD'},encoding:'utf8'});
  assert.equal(check().status,0);
  await writeFile(path.join(dir,'plugins/genpet/SKILL.md'),'new behavior');assert.notEqual(check().status,0);
  await setVersion('0.1.1');assert.equal(check().status,0);
  await writeFile(path.join(dir,'package-lock.json'),JSON.stringify({version:'0.1.0',packages:{'':{version:'0.1.0'}}}));assert.notEqual(check().status,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});

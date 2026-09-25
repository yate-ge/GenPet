/** Read-only compatibility check against the locally installed Codex bundle.
 * Extracts numeric contracts; never imports, executes or modifies application code.
 */
import {open,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {actions} from '../src/art.js';
const app=process.env.GENPET_CODEX_APP||'/Applications/ChatGPT.app';
const file=await open(path.join(app,'Contents/Resources/app.asar'),'r');
const prefix=Buffer.alloc(16);await file.read(prefix,0,16,0);
const headerBytes=Buffer.alloc(prefix.readUInt32LE(12));await file.read(headerBytes,0,headerBytes.length,16);
const header=JSON.parse(headerBytes.toString());const offset=8+prefix.readUInt32LE(4);
const candidates:{name:string;entry:any}[]=[];
function walk(dir:any,base=''){for(const [name,entry] of Object.entries(dir.files||{}) as [string,any][]){const full=base+'/'+name;if(entry.files)walk(entry,full);else if(full.startsWith('/webview/assets/app-initial-')&&full.endsWith('.js'))candidates.push({name:full,entry});}}
walk(header);assert.equal(candidates.length,1,'Cannot uniquely locate installed pet runtime; inspect this app version.');
const {name,entry}=candidates[0],buffer=Buffer.alloc(entry.size);await file.read(buffer,0,buffer.length,offset+Number(entry.offset));await file.close();const source=buffer.toString();
const layout=source.match(/version:2,width:(\d+),height:(\d+),cellWidth:(\d+),cellHeight:(\d+),columns:(\d+),rows:(\d+),requiredFramesByRow:\[([^\]]+)\]/);
assert.ok(layout,'No recognized native v2 layout');assert.deepEqual(layout.slice(1,7).map(Number),[1536,2288,192,208,8,11]);
assert.deepEqual(layout[7].split(',').map(Number),[...actions.map(a=>a.count),8,8]);
const idle=source.match(/\[\{rowIndex:0,columnIndex:0,frameDurationMs:\d+\}(?:,\{rowIndex:0,columnIndex:\d+,frameDurationMs:\d+\}){5}\]/);
assert.ok(idle,'Cannot find native idle frames');const idleDurations=[...idle[0].matchAll(/frameDurationMs:(\d+)/g)].map(m=>Number(m[1]));
assert.deepEqual(idleDurations,actions[0].durations);
for(const action of actions.slice(1)){
 const regex=new RegExp('(?:"'+action.name+'"|'+action.name+'):[A-Za-z0-9_$]+\\((\\d+),(\\d+),(\\d+),(\\d+)\\)');
 const m=source.match(regex);assert.ok(m,`Missing native action ${action.name}`);
 const [row,count,normal,last]=m.slice(1).map(Number);assert.equal(row,action.row);assert.equal(count,action.count);
 assert.deepEqual(Array.from({length:count},(_,i)=>i===count-1?last:normal),action.durations);
}
assert.match(source,/=22\.5,[A-Za-z0-9_$]+=16,[A-Za-z0-9_$]+=9,[A-Za-z0-9_$]+=8,[A-Za-z0-9_$]+=1/,'Direction quantization differs');
assert.match(source,/\.columns,[A-Za-z0-9_$]+=6,/,'Native idle multiplier changed');
assert.ok(source.includes('let r=[...n,...n,...n]'),'Native action repetition changed; inspect playback');
const report={ok:true,verifiedAt:new Date().toISOString(),runtime:name,version:2,width:1536,height:2288,cell:[192,208],grid:[8,11],actions:actions.map(a=>({name:a.name,row:a.row,frames:a.count,baseDurationsMs:a.durations})),standardAnimationFrames:57,directionPoses:16,utilityNeutralCell:[0,6],notes:['Built-in and custom pets share the same native sprite renderer.','Native actions repeat three times, then use idle at six times the base duration.','Pointer direction selects one of 16 poses in 22.5-degree increments; deadzone returns idle.','The official hatch-pet assembler also populates r0c6 as a neutral reference. It is not a seventh idle animation frame.']};
await mkdir('output',{recursive:true});await writeFile('output/native-contract-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:report.ok,standardFrames:57,directionPoses:16,officialUtilityNeutral:1,report:'output/native-contract-report.json'},null,2));

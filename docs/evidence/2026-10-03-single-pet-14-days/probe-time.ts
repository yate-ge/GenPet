import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {growth} from '../../../src/growth.ts';
import {dueStory} from '../../../src/schedule.ts';
const root=path.dirname(fileURLToPath(import.meta.url));
const before=JSON.parse(await readFile(path.join(root,'before-special.snapshot.json'),'utf8'));
const during=JSON.parse(await readFile(path.join(root,'during-special.snapshot.json'),'utf8'));
const timeline=JSON.parse(await readFile(path.join(root,'timeline.json'),'utf8')).episodes;
const enterBy=Date.parse(growth(before,Date.parse(timeline[5].at))!.special!.enterBy!);
const endBy=Date.parse(growth(during,Date.parse(timeline[7].at))!.special!.endBy!);
const samples=[];
for(const [label,state,deadline,expected] of [['enter',before,enterBy,'enter-special'],['end',during,endBy,'end-special']] as const){
 for(const offset of [-1,0,1]) {
  const at=deadline+offset, g=growth(state,at);
  assert.equal(g!.required,offset<0?null:expected);
  samples.push({label,offsetMs:offset,at:new Date(at).toISOString(),required:g!.required,due:dueStory(state,at,'Asia/Shanghai')});
 }
}
const result={ok:true,samples,scheduledEpisode07At:timeline[6].at,enterBy:new Date(enterBy).toISOString(),actualEnterDelayMs:Date.parse(timeline[6].at)-enterBy,actualEndDelayMs:Date.parse(timeline[8].at)-endBy,scope:'Pure growth/due boundary calls on actual stored snapshots; no Pet or host writes',strictEnterDeadlineSatisfied:false};
await writeFile(path.join(root,'time-boundary-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

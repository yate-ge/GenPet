/** Read-only inspection. Never imports, executes or patches desktop application code. */
import {open,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const app=process.env.GENPET_CODEX_APP||'/Applications/ChatGPT.app';
const file=await open(path.join(app,'Contents/Resources/app.asar'),'r');
const prefix=Buffer.alloc(16);await file.read(prefix,0,16,0);
const bytes=Buffer.alloc(prefix.readUInt32LE(12));await file.read(bytes,0,bytes.length,16);
const header=JSON.parse(bytes.toString()),offset=8+prefix.readUInt32LE(4);
const entries:Array<{name:string;entry:any}>=[];
function walk(dir:any,base=''){for(const [name,entry] of Object.entries(dir.files||{}) as [string,any][]){const full=base+'/'+name;if(entry.files)walk(entry,full);else entries.push({name:full,entry});}}
walk(header);
async function read(pattern:RegExp,contains?:string){
 const matches=[];
 for(const {name,entry} of entries.filter(e=>pattern.test(e.name))){
  const buffer=Buffer.alloc(entry.size);await file.read(buffer,0,buffer.length,offset+Number(entry.offset));
  const source=buffer.toString();if(contains&&!source.includes(contains))continue;
  matches.push({name,source,sha256:createHash('sha256').update(buffer).digest('hex')});
 }
 if(matches.length!==1)throw Error(`Ambiguous runtime: ${pattern}`);return matches[0];
}
try {
 const frontend=await read(/^\/webview\/assets\/app-initial-[^/]+\.js$/);
 const backend=await read(/^\/\.vite\/build\/src-[^/]+\.js$/,'spritesheetDataUrl:l.spritesheetDataUrl');
 const settings=await read(/^\/webview\/assets\/pets-settings-route-[^/]+\.js$/);
 const at=frontend.source.indexOf('queryFn:()=>Iq.customAvatars.load()');
 const query=at<0?'':frontend.source.slice(at,at+700);
 const findings={
  localPetQueryLocated:at>=0,
  infiniteStaleTime:query.includes('staleTime:Qx.INFINITE'),
  noFocusRefetch:query.includes('refetchOnWindowFocus:!1'),
  noMountRefetch:query.includes('refetchOnMount:!1'),
  noIntervalInLocalQuery:at>=0&&!query.includes('refetchInterval'),
  spriteReadIntoDataURL:backend.source.includes('spritesheetDataUrl:l.spritesheetDataUrl')&&backend.source.includes('readFileBase64(i,t)'),
  explicitSettingsRefresh:settings.source.includes('onRefreshCustomAvatars:H')&&settings.source.includes('H=()=>{_(j),_(k),_(Ye)}'),
 };
 const recognized=Object.values(findings).every(Boolean);
 const report={verifiedAt:new Date().toISOString(),method:'Read-only installed runtime inspection, not a live UI test',recognizedRuntime:recognized,
  runtimeFiles:[frontend,backend,settings].map(({name,sha256})=>({name,sha256})),findings,
  automaticRefreshImplemented:false,nativeUIObserved:false,
  conclusion:recognized?'File replacement alone does not invalidate the loaded local-pet query. No supported plugin refresh API was found in the inspected interface and official documentation. Automatic refresh requirement remains unmet.':'Unrecognized host implementation. Inspect this version before drawing a conclusion.',
  officialSources:['https://learn.chatgpt.com/docs/pets','https://learn.chatgpt.com/docs/reference/commands','https://developers.openai.com/plugins/build/plugins']};
 await mkdir('output',{recursive:true});await writeFile('output/native-refresh-audit.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(!recognized)process.exitCode=1;
}finally{await file.close();}

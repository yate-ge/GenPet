let token;
const el=id=>document.getElementById(id);
async function action(input){const r=await fetch('/api/action',{method:'POST',headers:{'X-GenPet-Token':token,'Content-Type':'application/json'},body:JSON.stringify(input)});const value=await r.json();if(!r.ok)throw new Error(value.error);return value;}
async function load(){
 const {state,token:secret}=await(await fetch('/api/state')).json();token=secret;
 el('identity').textContent=`${state.host} · ${state.pet?.id||'尚未领养'}`;
 el('record').textContent=JSON.stringify({pet:state.pet,pending:state.pending,schedule:state.schedule},null,2);
 for(const story of state.stories){const article=document.createElement('article');const text=document.createElement('p');text.textContent=story.text;article.append(text);el('stories').append(article);}
 for(const art of state.art){const figure=document.createElement('figure');if(art.kind!=='artifact'){const img=document.createElement('img');img.src='/art/'+encodeURIComponent(art.id);img.alt=art.description;figure.append(img);}const caption=document.createElement('figcaption');caption.textContent=`${art.kind} · ${art.stage} · ${art.description}`;figure.append(caption);el('art').append(figure);}
 const native=await(await fetch('/api/native-pets')).json();el('native').hidden=!native;
 if(native){for(const pet of native.pets){const option=document.createElement('option');option.value=pet.id;option.textContent=`${pet.displayName} (${pet.id})`;el('pets').append(option);}el('selection').textContent=JSON.stringify(native.live,null,2);}
}
el('stop').addEventListener('click',()=>action({action:'stop'}).then(()=>{el('identity').textContent='调试器已停止';}).catch(e=>{el('error').textContent=e.message;}));
el('switch').addEventListener('click',()=>action({action:'switch-pet',petId:el('pets').value}).then(value=>{el('selection').textContent=JSON.stringify(value.result,null,2);}).catch(e=>{el('error').textContent=e.message;}));
load().catch(e=>{el('error').textContent=e.message;});

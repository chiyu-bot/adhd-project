/* R02: adapters between draft storage and existing views. Session restoration is W02. */
const DRAFT_TEXT={
 conflict:['別のタブで更新されています。書きかけを残して最新の状態を読み直してください。','Your tasks changed in another tab. Load those changes to continue. Your draft will be kept.','दूसरे टैब में डेटा बदला है। मसौदा रखते हुए नया डेटा लोड करें।','다른 탭에서 변경됐어요. 초안을 남기고 최신 내용을 불러오세요.','其他标签页已更新数据。保留草稿并读取最新状态。','Otra pestaña cambió los datos. Carga el estado actual conservando el borrador.','Un autre onglet a modifié les données. Rechargez en conservant le brouillon.'],
 latest:['最新の状態を読み直す','Load saved changes','नया डेटा लोड करें','최신 내용 불러오기','读取最新状态','Cargar estado actual','Charger les dernières données'],
 error:['保存できませんでした。この画面に文章は残っています。閉じる前に再試行するか、文章をコピーしてください。','We couldn’t save your changes. Your text is still here. Try again, or copy it before closing this page.','सहेजा नहीं जा सका। पाठ इस पेज पर है। बंद करने से पहले फिर कोशिश करें या कॉपी करें।','저장하지 못했어요. 글은 이 화면에 남아 있어요. 닫기 전에 다시 시도하거나 복사해 주세요.','未能保存。文字仍在本页，关闭前请重试或复制。','No se pudo guardar. El texto sigue en esta página. Reintenta o cópialo antes de cerrar.','Enregistrement impossible. Le texte reste sur cette page. Réessayez ou copiez-le avant de fermer.'],
 retry:['保存を再試行','Retry saving','फिर सहेजें','다시 저장','重试保存','Reintentar','Réessayer'],
 recover:['書きかけを開く','Continue writing','अधूरा पाठ खोलें','작성 중인 글 열기','打开草稿','Abrir borrador','Ouvrir le brouillon'],
 next:['次の一歩の下書き','Unfinished next step','अगले कदम का मसौदा','다음 단계 초안','下一步草稿','Borrador del siguiente paso','Brouillon du prochain pas'],
 resume:['再開メモの下書き','Unfinished note','फिर शुरू करने के नोट का मसौदा','재개 메모 초안','继续时的备注草稿','Borrador de la nota para retomar','Brouillon de la note de reprise'],
 saved:['保存する','Save','सहेजें','저장','保存','Guardar','Enregistrer']
};
let storageFailed=false;
function dt(key){return DRAFT_TEXT[key][Math.max(0,LANG_ORDER.indexOf(S.lang))];}
function renderStorageStatus(){
 const node=document.getElementById('storage-status');if(!node)return;
 node.hidden=!storageFailed;
 node.innerHTML=storageFailed?`<span>${esc(dt(storageConflict?'conflict':'error'))}</span> <button class="btn-line" id="storage-retry">${esc(dt(storageConflict?'latest':'retry'))}</button>`:'';
 const retry=document.getElementById('storage-retry');if(retry)retry.onclick=()=>storageConflict?recoverLatestState():save();
}
function draftKey(field,taskId){return MazuStorage.draftKey(field,taskId);}
function bindDraft(id,field,taskId){
 const node=document.getElementById(id);if(!node)return;
 const key=draftKey(field,taskId);node.value=MazuStorage.getDraft(S,key);
 node.addEventListener('input',()=>{MazuStorage.setDraft(S,key,node.value);dirtyDraftKeys.add(key);save();});
}
/* Commit related changes and draft removal in ONE write. On failure keep the previous memory state. */
function commitChange(update){
 const before=S;S=MazuStorage.copy(before);
 try{update(S);}catch(error){S=before;throw error;}
 if(save())return true;
 S=before;return false;
}
function registerDraft(field,text,multiple=false){
 const raw=String(text);MazuStorage.setDraft(S,field,raw);dirtyDraftKeys.add(field);
 const lines=(multiple?raw.split(/\n+/):[raw]).map(x=>x.trim()).filter(Boolean);
 if(!lines.length)return null;
 let ids=[];
 if(!commitChange(state=>{
  ids=lines.map(line=>entrust(line,{silent:true,noHint:true,deferSave:true}).id);
  MazuStorage.clearDraft(state,field);
 }))return null;
 return ids.map(id=>S.projects.find(p=>p.id===id));
}
function saveTaskDraft(taskId,field,text){
 MazuStorage.setDraft(S,draftKey(field,taskId),text);dirtyDraftKeys.add(draftKey(field,taskId));
 return commitChange(state=>{
  const p=state.projects.find(p=>p.id===taskId);if(!p)throw Error('Missing draft task');
  const value=text.trim();
  if(field==='next'){
   if(value){p.queue=[value];p.level=0;p.userEdited=true;p.lastUserStep=value;p.nextUserSet=true;p.rev=(p.rev||0)+1;}
   else if(!p.queue.length){p.level=0;p.queue=[makeStep(p.name,0,p.objHint||'')];}
  }else p.resumeNote=value;
  MazuStorage.clearDraft(state,draftKey(field,taskId));
 });
}
function renderDraftRecovery(el){
 const pending=S.projects.flatMap(p=>['next','resume'].filter(field=>MazuStorage.getDraft(S,draftKey(field,p.id))).map(field=>({p,field})));
 if(!pending.length)return;
 const box=document.createElement('div');box.className='draft-recovery';
 box.innerHTML=pending.map(({p,field},i)=>`<button class="btn-line" id="recover-draft-${i}">${esc(dt('recover'))} · ${esc(p.name)} · ${esc(dt(field))}</button>`).join('');
 el.appendChild(box);
 pending.forEach(({p,field},i)=>document.getElementById(`recover-draft-${i}`).onclick=()=>openTaskDraft(p.id,field));
}
function openTaskDraft(taskId,field){
 const p=S.projects.find(p=>p.id===taskId);if(!p)return;
 if(field==='resume' && !Object.prototype.hasOwnProperty.call(S.drafts||{},draftKey(field,taskId)))MazuStorage.setDraft(S,draftKey(field,taskId),p.resumeNote||'');
 const root=dialog(`<p>${esc(p.name)} · ${esc(dt(field))}</p><input id="recovered-draft" type="text"><button class="btn-main" id="draft-save">${esc(dt('saved'))}</button><button class="btn-sub" id="draft-close">${t('dec_cancel')}</button>`);
 bindDraft('recovered-draft',field,taskId);
 root.querySelector('#draft-save').onclick=()=>{if(saveTaskDraft(taskId,field,root.querySelector('#recovered-draft').value)){closeDialog();render();}};
 root.querySelector('#draft-close').onclick=closeDialog;
}

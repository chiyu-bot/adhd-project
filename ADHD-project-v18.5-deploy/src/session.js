/* R06–R09: persisted session, explicit transitions, idempotent history. */
function sessionSnapshot(value){const copy={...value};delete copy.tick;return copy;}
function sessionHistory(state,session,kind){
 const id=session.id+':'+session.segment;
 let record=state.done.find(d=>d.eventId===id);
 const p=state.projects.find(x=>x.id===session.pid);
 if(!record){record={eventId:id,sessionId:session.id,ts:session.startedAt,pid:session.pid,text:session.actionText,customAction:session.customAction,generatedActions:p?.generatedActions||[],objHint:p?.objHint||''};state.done.push(record);}
 record.kind=kind;record.min=session.hideTimer?null:Math.floor((session.actionMs||0)/60000)||null;
}
function setSession(next,update){
 const oldTick=sess?.tick;
 if(!commitChange(state=>{state.activeSession=next.phase==='end'?null:sessionSnapshot(next);if(update)update(state,next);} ))return false;
 if(oldTick)clearInterval(oldTick);
 sess=next;
 if(next.phase==='run')sess.tick=setInterval(tick,500);
 return true;
}
function restoreSession(){
 const saved=S.activeSession;
 if(!saved || !S.projects.some(p=>p.id===saved.pid)){sess=null;return;}
 sess={...saved,tick:null,lastObservedAt:Date.now(),phase:['run','interrupted'].includes(saved.phase)?'interrupted':saved.phase};
}
function startSession(p,action){
 if(sess && ['run','interrupted'].includes(sess.phase))return;
 const now=Date.now();
 const next={id:uid(),pid:p.id,actionText:action,customAction:p.lastUserStep===action,chosenMin:ui.minutes,hideTimer:ui.hideTimer,startedAt:now,lastObservedAt:now,lastSavedAt:now,elapsedMs:0,actionMs:0,segment:0,phase:'run',chimed:false,valveShown:false};
 if(!setSession(next,(state,s)=>{const task=state.projects.find(x=>x.id===p.id);task.rev=(task.rev||0)+1;state.lastPid=p.id;state.lastTouched=p.id;sessionHistory(state,s,'start');}))return;
 ui.skip=0;renderNow();
}
function observeSession(){
 if(!sess || sess.phase!=='run')return;
 const now=Date.now(),delta=now-sess.lastObservedAt;
 if(!document.hidden && delta>=0 && delta<=1500){sess.elapsedMs+=delta;sess.actionMs+=delta;}
 sess.lastObservedAt=now;
}
function sessSec(){return Math.floor((sess?.elapsedMs||0)/1000);}
function resumeSession(){
 if(!sess || sess.phase!=='interrupted')return;
 if(setSession({...sessionSnapshot(sess),phase:'run',lastObservedAt:Date.now(),lastSavedAt:Date.now()}))renderNow();
}
function onActionDone(){
 if(!sess || sess.phase!=='run')return;
 observeSession();const next={...sessionSnapshot(sess),phase:'after'};
 if(!setSession(next,(state,s)=>{
  sessionHistory(state,s,'done');const p=state.projects.find(x=>x.id===s.pid);p.lastCompleted=s.actionText;p.reentry=true;
  if(p.lastUserStep===s.actionText)p.lastUserStep='';p.queue=[];
  if(p.origin?.length){p.queue=[p.origin.pop()];p.level=Math.max(0,(p.level||1)-1);p.reentry=false;}
  else if(p.next?.length){p.queue=[p.next.shift()];p.level=0;p.reentry=false;}
 }))return;
 renderNow();
}
function continueSession(){
 if(!sess || sess.phase!=='after')return;
 const p=S.projects.find(x=>x.id===sess.pid);if(!p)return;
 const action=p.queue[0]||pt('continue_work');
 const next={...sessionSnapshot(sess),phase:'run',segment:sess.segment+1,actionText:action,customAction:p.lastUserStep===action,freeWork:!p.queue.length,actionMs:0,startedAt:Date.now(),lastObservedAt:Date.now(),lastSavedAt:Date.now()};
 if(setSession(next,(state,s)=>sessionHistory(state,s,'start')))renderNow();
}
function endSession(){
 if(!sess || sess.phase==='end')return;
 observeSession();const next={...sessionSnapshot(sess),phase:'end'};
 const wasActive=['run','interrupted'].includes(sess.phase);
 if(!setSession(next,(state,s)=>{
  if(wasActive)sessionHistory(state,s,'touch');
  const p=state.projects.find(x=>x.id===s.pid);
  if(p && wasActive && !s.freeWork){p.queue=[s.actionText];p.reentry=false;}
 }))return;
 renderNow();
}
function onStop(){endSession();}
function logDone(kind,text){if(sess)commitChange(state=>sessionHistory(state,{...sess,actionText:text},kind));}
function renderSession(el){
 const p=S.projects.find(x=>x.id===sess.pid);
 if(!p){clearInterval(sess.tick);sess=null;renderNow();return;}
 if(['nextinput','resume'].includes(sess.phase)){renderLegacySession(el);return;}
 const name=`<div class="proj-name">${esc(p.name)}</div>`;
 const note=p.resumeNote?`<div class="resume-note">${esc(p.resumeNote)}</div>`:'';
 const action=sess.freeWork?esc(pt('continue_work')):actionHTML(sess.actionText,p,sess.customAction);
 if(sess.phase==='run'){
  el.innerHTML=`<div class="card" id="sess-card">${name}<div class="action-text">${action}</div>${note}${sess.hideTimer?'':`<div class="timer" id="timer"></div><div id="timer-hint">${t('only_n',{n:sess.chosenMin})}</div>`}<button class="btn-main" id="acted">${t('action_done')}</button><button class="btn-sub" id="stop">${t('stop_here')}</button></div>`;
  el.querySelector('#acted').onclick=onActionDone;el.querySelector('#stop').onclick=onStop;paintTimer();return;
 }
 if(sess.phase==='interrupted'){
  el.innerHTML=`<div class="card">${name}<p>${pt('interrupted')}</p><div class="action-text">${action}</div>${note}<button class="btn-main" id="resume-session">${pt('resume')}</button><button class="btn-sub" id="finish-session">${t('stop_here')}</button></div>`;
  el.querySelector('#resume-session').onclick=resumeSession;el.querySelector('#finish-session').onclick=endSession;return;
 }
 if(sess.phase==='after'){
  el.innerHTML=`<div class="card">${name}<p>${pt('recorded')}</p><button class="btn-main" id="continue-session">${t('do_it')}</button><button class="btn-sub" id="finish-session">${t('enough_today')}</button></div>`;
  el.querySelector('#continue-session').onclick=continueSession;el.querySelector('#finish-session').onclick=endSession;
 }else{
  el.innerHTML=`<div class="card">${name}<p>${pt('rest_saved')}</p><button class="btn-main" id="back">${t('nav_now')}</button></div>`;
  el.querySelector('#back').onclick=()=>{sess=null;renderNow();};
 }
 const optional=document.createElement('details');optional.innerHTML=`<summary>${pt('optional')}</summary><button class="btn-line" id="edit-note">${t('resume_q')}</button><button class="btn-line" id="edit-next">${pt('next_edit')}</button><button class="btn-line" id="complete-project">${t('projdone_yes')}</button>`;el.appendChild(optional);
 document.getElementById('edit-note').onclick=()=>openTaskDraft(p.id,'resume');
 document.getElementById('edit-next').onclick=()=>openTaskDraft(p.id,'next');
 document.getElementById('complete-project').onclick=()=>showConfirm(t('projdone_q',{t:p.name}),()=>{
  if(!commitChange(state=>{state.projects=state.projects.filter(x=>x.id!==p.id);state.done.push({ts:Date.now(),text:p.name,kind:'project'});state.activeSession=null;}))return;
  clearInterval(sess?.tick);sess=null;closeDialog();renderNow();
 });
}
function paintTimer(){
 const el=document.getElementById('timer');if(!el||!sess||sess.hideTimer)return;
 const seconds=sessSec(),goal=sess.chosenMin*60;
 el.textContent=seconds<goal?fmt(goal-seconds):'+'+fmt(seconds-goal);
 if(seconds>=goal && !sess.chimed){sess.chimed=true;chime();}
}
function tick(){
 if(!sess||sess.phase!=='run')return;
 observeSession();paintTimer();
 if(Date.now()-sess.lastSavedAt>=5000){sess.lastSavedAt=Date.now();commitChange(state=>{state.activeSession=sessionSnapshot(sess);sessionHistory(state,sess,'start');});}
 if(!sess.hideTimer && sessSec()>=VALVE_SEC && !sess.valveShown){sess.valveShown=true;showValve();}
}
function fmt(seconds){return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
const pickMsg=()=>L().end_msgs[0];
function pickNowLine(){return L().now_msgs[0];}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden && sess?.phase==='run'){
  observeSession();if(setSession({...sessionSnapshot(sess),phase:'interrupted'}))renderNow();
 }
});

/* R02 / T01–T03. Persistence has an explicit outcome; callers decide when to clear input. */
(function(root){
  'use strict';
  root.MazuStorage=Object.freeze({
    read(storage,key){const raw=storage.getItem(key);return raw?JSON.parse(raw):null;},
    write(storage,key,state){
      try{storage.setItem(key,JSON.stringify(state));return {ok:true};}
      catch(error){return {ok:false,error};}
    },
    copy(state){return JSON.parse(JSON.stringify(state));},
    draftKey(field,taskId){return taskId?`${field}:${taskId}`:field;},
    getDraft(state,key){return typeof state.drafts?.[key]==='string'?state.drafts[key]:'';},
    setDraft(state,key,text){state.drafts=state.drafts||{};state.drafts[key]=String(text);},
    clearDraft(state,key){if(state.drafts)delete state.drafts[key];}
  });
})(globalThis);

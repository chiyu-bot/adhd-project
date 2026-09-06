/* R04/R10/R11: shared product wording, multilingual classification, conservative split suggestions. */
const PROTOTYPE_TEXT={
 interrupted:['途中の一歩を残してあります。','Your unfinished step is saved.','आपका अधूरा कदम सुरक्षित है।','하던 한 걸음을 남겨 두었어요.','已保留你中途停下的一步。','Tu paso pendiente está guardado.','Votre pas en cours est conservé.'],
 resume:['再開する','Resume','फिर शुरू करें','다시 시작','继续','Retomar','Reprendre'],
 recorded:['この一歩を記録しました。','This step is recorded.','यह कदम दर्ज हो गया है।','이 한 걸음을 기록했어요.','已记录这一步。','Este paso quedó registrado.','Ce pas est enregistré.'],
 rest_saved:['ここまでを残しました。いつでも戻れます。','Saved up to here. You can return whenever you like.','यहाँ तक सहेज लिया है। जब चाहें लौट सकते हैं।','여기까지 남겼어요. 언제든 돌아올 수 있어요.','已保存到这里，随时可以回来。','Guardado hasta aquí. Puedes volver cuando quieras.','C’est enregistré. Vous pouvez revenir quand vous voulez.'],
 optional:['必要なら編集する','Optional edits','चाहें तो बदलें','필요하면 수정','需要时编辑','Editar si quieres','Modifier si besoin'],
 next_edit:['次の一歩を書く','Write a next step','अगला कदम लिखें','다음 한 걸음 쓰기','写下下一步','Escribir el siguiente paso','Écrire le prochain pas'],
 continue_work:['この課題にそのまま取り組む','Keep working on this task','इसी काम को जारी रखें','이 일을 계속하기','继续做这件事','Seguir con esta tarea','Continuer cette tâche'],
 reentry:['取りかかり直す入口','A way to start again','फिर शुरू करने का एक रास्ता','다시 시작하는 한 걸음','重新开始的入口','Un paso para volver a empezar','Un pas pour recommencer'],
 change_time:['時間を変更','Change time','समय बदलें','시간 변경','调整时间','Cambiar tiempo','Changer la durée'],
 started:['開始','Started','शुरू किया','시작','已开始','Iniciado','Démarré'],
 neutral:['一歩をここに置いておけます。','You can keep a step here.','आप एक कदम यहाँ रख सकते हैं।','한 걸음을 여기에 남겨 둘 수 있어요.','可以把一步留在这里。','Puedes dejar un paso aquí.','Vous pouvez garder un pas ici.'],
 smallest:['合わなければ、この一歩を変えられます。','If it does not fit, you can change this step.','यह ठीक न लगे तो कदम बदल सकते हैं।','맞지 않으면 이 한 걸음을 바꿀 수 있어요.','不合适的话，可以换一种做法。','Si no encaja, puedes cambiar este paso.','Si cela ne convient pas, vous pouvez changer ce pas.'],
 empty:['記録はここに残ります。','Your records will appear here.','आपके रिकॉर्ड यहाँ रहेंगे।','기록은 여기에 남아요.','记录会保存在这里。','Tus registros aparecerán aquí.','Vos traces apparaîtront ici.'],
 split_edit:['分け方を調整する','Adjust the split','विभाजन बदलें','나누는 방식 조정','调整分法','Ajustar la separación','Ajuster la séparation']
};
function pt(key){return PROTOTYPE_TEXT[key][Math.max(0,LANG_ORDER.indexOf(S.lang))];}
function applyPrototypeLanguage(){
 LANG_ORDER.forEach((lang,i)=>{
  LANGS[lang].now_msgs=[PROTOTYPE_TEXT.neutral[i]];
  LANGS[lang].end_msgs=[PROTOTYPE_TEXT.rest_saved[i]];
  LANGS[lang].smallest=PROTOTYPE_TEXT.smallest[i];
  LANGS[lang].done_empty=PROTOTYPE_TEXT.empty[i];
 });
}
const INPUT_PATTERNS={
 writing:/レポート|論文|履歴書|書類|スライド|原稿|\breport\b|\bessay\b|\bresume\b|\bcv\b|document|रिपोर्ट|निबंध|दस्तावेज|보고서|논문|이력서|报告|论文|简历|informe|ensayo|curr[ií]cul|rapport|m[eé]moire|r[eé]diger/iu,
 study:/勉強|資格|試験|宿題|学習|教材|\bstud(y|ying)\b|\bexam\b|homework|परीक्षा|पढ़ाई|अध्ययन|시험|공부|숙제|考试|学习|作业|estudi|examen|deberes|r[eé]viser|[eé]tudier|devoirs/iu,
 contact:/連絡|返信|メール|電話|\breply\b|\bemail\b|\bcall\b|message|जवाब|ईमेल|फ़ोन|답장|연락|이메일|回复|邮件|联系|responder|correo|llamar|r[eé]pondre|courriel|appeler/iu,
 tidy:/掃除|片付け|洗濯|引っ越し|部屋|\bclean|\btidy|laundry|moving house|सफाई|सफ़ाई|कपड़े धोना|청소|정리|이사|打扫|收拾|搬家|limpiar|ordenar|mudanza|nettoyer|ranger|d[eé]m[eé]nag/iu,
 admin:/手続き|税|支払|保険|銀行|\btax|pay.*bill|insurance|कर भुगतान|बीमा|세금|납부|보험|缴费|税务|保险|impuesto|factura|seguro|imp[oô]t|facture|assurance/iu,
 body:/運動|筋トレ|散歩|ヨガ|ストレッチ|exercise|workout|\bwalk\b|\byoga\b|व्यायाम|टहलना|운동|산책|运动|散步|ejercicio|caminar|entrenar|exercice|promenade|marcher/iu
};
function classifyInput(text){
 const value=String(text||'').normalize('NFKC').toLocaleLowerCase();
 for(const [key,pattern] of Object.entries(INPUT_PATTERNS))if(pattern.test(value))return key;
 return null;
}
function offlineSplitCuts(text){
 // Suggestions only. Sequential clauses and unknown segments are not auto-classified as independent tasks.
 if(/して|読んで|書いて|してから|してから|\bthen\b|\bafter\b|\bpuis\b|然后|그다음/iu.test(text))return null;
 const chunks=text.split(/[、,;；\n]+/).map(x=>x.trim()).filter(Boolean);
 if(chunks.length<2||chunks.length>6||chunks.some(x=>!classifyInput(x)))return null;
 return splitCuts(text,chunks);
}

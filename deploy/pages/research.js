/* Researcher inspection only. Never part of agent prompt construction. */
window.TRIADResearch=(()=>{
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function valueNodes(value){
  if(Array.isArray(value)){const list=node('ul');for(const text of value){const li=node('li');if(typeof text==='string')li.textContent=text;else li.textContent='未保存有效文字 / Invalid recorded text';list.append(li);}return list;}
  if(value&&typeof value==='object'){const list=node('dl');for(const [key,item] of Object.entries(value)){list.append(node('dt',key));const dd=node('dd');dd.append(valueNodes(item));list.append(dd);}return list;}
  return node('p',typeof value==='string'?value:typeof value==='number'?String(value):'未另行指定');
 }
 let current={},dialog;
 function panel(title){if(!dialog){dialog=node('dialog');dialog.id='researchInspector';document.body.append(dialog);}dialog.replaceChildren();const head=node('div');head.className='section-head';head.append(node('h2',title));const close=node('button','×');close.setAttribute('aria-label','Close researcher panel');close.onclick=()=>dialog.close();head.append(close);dialog.append(head);const body=node('div');body.className='research-body';dialog.append(body);if(!dialog.open)dialog.showModal();return body;}
 function role(pid){const c=current.cards?.[pid],body=panel('Participant role card / 參與者角色卡');if(!c){body.append(node('p','完整角色卡未獲批准公開或未保存。 / Card not approved for publication or not recorded.'));return;}
  body.append(node('p','研究者檢視 / Researcher view · 可見不等於已向其他參與者披露。'));
  if(current.publication_notice)body.append(node('p',current.publication_notice));
  const labels={participant_id:'Participant ID',role:'Role / 角色',background:'Background / 背景',goals:'Goals / 目標',priorities:'Priorities / 優先事項',expertise:'Expertise / 專業',authority:'Authority / 權限',affectedness:'Affectedness / 受影響程度',constraints:'Constraints / 約束',initial_beliefs:'Initial position / 初始立場',private_information:'Role-private information / 角色專屬資訊',uncertainties:'Uncertainties / 未知',conflicts:'Potential conflicts / 潛在分歧',disclosure_rules:'Disclosure rules / 披露規則',conversation_style:'Conversational style / 語氣',authority_rights:'Declared rights / 已明確權責',layer:'Role layer',category:'Category',version:'Version'};
  for(const [key,label] of Object.entries(labels)){if(c[key]===undefined)continue;body.append(node('h3',label));body.append(valueNodes(c[key]));}
  body.append(node('h3','Disclosure history / 披露歷史（截至所選狀態）'));
  const history=(current.disclosures||[]).filter(d=>d.participant_id===pid);if(!history.length)body.append(node('p','尚無已錄製的公開披露。'));
  for(const d of history){const b=node('button',`Turn ${d.turn_id} · ${d.information}`);b.onclick=()=>{dialog.close();current.onTurn?.(d.turn_id);};body.append(b);}
 }
 function inspect(item){const body=panel('Item inspection / 條目檢查');body.append(node('h3',item.statement||item.label||item.id),node('p',`Status: ${item.status||'unresolved'}`));
  if(item.assessment)body.append(node('p',item.assessment.explanation));
  if(item.tool_id){const b=node('button',`Tool / 工具 · ${item.tool_id}${item.field?' → '+item.field:''}`);b.onclick=()=>{dialog.close();current.onTool?.(item.tool_id,item.field);};body.append(b);}else body.append(node('p','未連結工具欄位；保留原始提問，不猜測對應關係。'));
  if(!(item.turn_ids||[]).length)body.append(node('p','此必填項尚無相關提案或發言。'));
  for(const turn of item.turn_ids||[]){const b=node('button','Discussion / 發言 '+turn);b.onclick=()=>{dialog.close();current.onTurn?.(turn);};body.append(b);}
  for(const id of item.entry_ids||[]){const b=node('button','Provenance / 來源 '+id);b.onclick=()=>{dialog.close();current.onEntry?.(id);};body.append(b);}
  if(item.history?.length)body.append(node('pre',JSON.stringify(item.history,null,2)));
 }
 function render(data){current=data;let area=document.getElementById('researchOverview');if(!area){area=node('section');area.id='researchOverview';document.getElementById('stages').before(area);}
  const expanded=new Set([...area.querySelectorAll('details[open]')].map(e=>e.id||e.dataset.diagnostic));
  area.replaceChildren();const scenario=node('details');scenario.id='scenarioOverview';scenario.append(node('summary','Scenario Overview / 場景概覽'));
  const s=data.scenario||{},labels={title:'Title / 標題',question:'Central question / 核心問題',background:'Background / 背景',objectives:'Objectives / 目標',constraints:'Known constraints / 已知約束',language:'Language / 語言',scenario_id:'Scenario ID',scenario_version:'Scenario version'};
  for(const [k,label] of Object.entries(labels)){const row=node('p');row.append(node('strong',label+': '));if(Array.isArray(s[k])){row.append(valueNodes(s[k]));if(!s[k].length)row.append(node('span','未另行指定'));}else row.append(node('span',typeof s[k]==='string'&&s[k]?s[k]:'原始記錄未另行保存'));scenario.append(row);}
  scenario.append(node('p',(data.participants||[]).map(p=>p.role).join(' · ')));area.append(scenario);
  const di=data.diagnostics||{counts:{},fields:[]};const cards=node('div');cards.className='diagnostic-cards';
  for(const [key,title] of [['incomplete','Incomplete required items / 必填未完成'],['unresolved','Unresolved issues / 未解決議題'],['evidence','Outstanding evidence / 待補證據']]){const details=node('details');details.dataset.diagnostic=key;details.append(node('summary',`${title} · ${di.counts?.[key]||0}`));const list=node('div');list.className='diagnostic-list';for(const item of di[key]||[]){const b=node('button',(item.statement||item.label)+' · '+(item.status||'unresolved'));b.onclick=()=>inspect(item);list.append(b);}if(!(di[key]||[]).length)list.append(node('p','此類別沒有已記錄的待處理項目。'));details.append(list);cards.append(details);}
  area.append(cards);const all=node('details');all.append(node('summary','Field applicability / 欄位適用性（missing · optional · not applicable · unresolved · completed）'));const list=node('div');list.className='diagnostic-list';for(const f of di.fields||[]){const b=node('button',`${f.tool_id} · ${f.label} · ${f.status}`);b.onclick=()=>inspect(f);list.append(b);}all.append(list);area.append(all);
  all.id='fieldApplicability';for(const details of area.querySelectorAll('details'))details.open=expanded.has(details.id||details.dataset.diagnostic);
  for(const el of document.querySelectorAll('#participants .person')){const pid=el.dataset.pid||el.querySelector('b')?.textContent.match(/P[1-6]/)?.[0];el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`Inspect role card ${pid}`);el.onclick=()=>role(pid);el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();role(pid);}};}
 }
 return {render,role,inspect};
})();

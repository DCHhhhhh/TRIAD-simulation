'use strict';
const $=id=>document.getElementById(id), stages=['Target','Represent','Identify','Assess','Decide'];
const base=new URL('./',document.baseURI);
let catalog=null, recording=null, recordingBase=null, frameKey='final', selectedStage=null, toolId='decision_charter', sheetPage=0, zoom=100, serial=0, runSerial=0;
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const frame=()=>recording?.frames[frameKey];
const number=n=>n===null||n===undefined?'unknown / 未知':Number(n).toLocaleString();
function auditUI(){
 const host=$('recordingAudit'),a=recording?.execution;host.replaceChildren();host.hidden=!a;if(!a)return;
 const usage=node('details');usage.id='historicalUsage';usage.append(node('summary','Historical Azure usage / 歷史 Azure 用量'));
 const u=a.usage;usage.append(node('p',`${a.provider} · ${a.deployment} · ${a.response_models.join(', ')} · ${a.status}`),node('p',`Requests / 請求 ${u.request_count} · Retries / 重試 ${u.retry_count} · Failed / 失敗 ${u.unsuccessful_attempts}`),node('p',`Known tokens / 已知用量：input ${number(u.known_usage.prompt_tokens)} · output ${number(u.known_usage.completion_tokens)} · total ${number(u.known_usage.total_tokens)}`),node('p',u.usage_available?'All request usage is available.':'Complete total unknown / 完整總量未知：'+u.usage_unavailable_requests+' 次請求未返回 usage；沒有將失敗用量記為零。'),node('p','These are historical cumulative counts, not per-minute usage. Browser replay makes zero Azure calls. / 這是歷史累計用量，不是 TPM；網頁回放不調用 Azure。'));
 const table=node('table'),head=node('tr');for(const label of ['Participant','Requests','Input (known)','Output (known)','Total (known)'])head.append(node('th',label));table.append(head);
 for(const [pid,item] of Object.entries(u.by_participant)){const row=node('tr');for(const value of [pid,item.request_count,number(item.known_usage.prompt_tokens),number(item.known_usage.completion_tokens),number(item.known_usage.total_tokens)])row.append(node('td',String(value)));table.append(row);}const wrap=node('div');wrap.className='audit-table';wrap.append(table);usage.append(wrap);host.append(usage);
 const recovery=node('details');recovery.id='recoveryTrace';recovery.append(node('summary','Recovery and wording trace / 恢復與措辭記錄'),node('p',a.recovery_note));
 for(const failure of a.failures)recovery.append(node('p',`Turn ${failure.turn_id} · ${failure.participant_id} · HTTP ${failure.status_code} / ${failure.error_code}`));
 for(const change of a.request_wording_changes){const item=node('details');item.append(node('summary',`Turn ${change.turn_id} · ${change.participant_id} · ${change.status}`));for(const c of change.changes)item.append(node('p',`「${c.source}」 → 「${c.transmitted}」 · ${c.occurrences} occurrences · request message ${c.message_index}`));item.append(node('p','Original input SHA-256: '+change.original_input_sha256),node('p','Transmitted input SHA-256: '+change.transmitted_input_sha256));recovery.append(item);}host.append(recovery);
}
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function asset(path,parent=base){const u=new URL(path,parent);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||u.search||u.hash)throw Error('Invalid static asset path');return u;}
async function read(url,asText=false){const r=await fetch(url,{credentials:'omit',cache:'no-cache'});if(!r.ok)throw Error(`無法載入靜態檔案 / Static file unavailable (${r.status})`);return asText?r.text():r.json();}
function download(value,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function stagesUI(){
 $('stages').replaceChildren(...stages.map(s=>{const saved=recording?.stages[s];const b=node('button',`${s} · ${saved?'已保存':'無快照'}`,'stage');b.dataset.stage=s;b.disabled=!recording;b.setAttribute('aria-pressed',String(selectedStage===s));b.onclick=()=>{selectedStage=s;frameKey=saved?.frame||'';sheetPage=0;render();};return b;}));
}
function inspect(ids){
 const entries=Object.values(frame()?.state.proposal_history||{}).flat().filter(e=>ids.includes(e.entry_id));if(!entries.length)return;
 const body=$('inspectorBody');body.replaceChildren();for(const e of entries){body.append(node('h3',`${e.participant_role} · ${e.entry_id}`),node('p',`TURN ${e.turn_id} · ${e.stage} · ${e.status}`),node('h3','原始提案 / Original proposal'),node('pre',JSON.stringify(e.original_content,null,2)),node('h3','當前提案 / Current proposal'),node('pre',JSON.stringify(e.content,null,2)),node('h3','來源與修訂 / Provenance'),node('pre',JSON.stringify({public_justification:e.public_justification,supporters:e.supporters,challengers:e.challengers,revisions:e.revision_history},null,2)));}
 if(!$('inspector').open)$('inspector').showModal();
}
function render(){
 ++serial;stagesUI();const f=frame();notice('');
 $('participants').replaceChildren(...(recording?.participants||[]).map(p=>{const e=node('div',undefined,'person');e.dataset.category=p.category;e.append(node('b',`${p.participant_id} · ${p.role}`),node('small',p.layer));return e;}));
 TRIADResearch.render({scenario:recording?.scenario,cards:recording?.researcher_cards,diagnostics:f?.diagnostics,disclosures:f?.disclosures,participants:recording?.participants,publication_notice:'Synthetic role-card inputs / 合成角色設定：以下角色專屬資訊不是現實中的人員、排班、預算或技術事實。公開供研究者檢視，不表示這些資訊曾提供給其他代理。',
 onTool:async(id,field)=>{toolId=id;sheetPage=0;render();await sheet();const el=$('worksheet').querySelector(`[data-shared-field="${field}"]`);if(el){el.classList.add('field-highlight');el.scrollIntoView({block:'center'});}},
 onTurn:n=>{selectedStage=null;frameKey='turn-'+n;sheetPage=0;render();$('transcript').lastElementChild?.scrollIntoView({block:'center'});},onEntry:id=>inspect([id])});
 const recordedLabel=recording?.execution?'Recorded Azure Simulation / 已錄製 Azure 模擬':'Recorded Simulation / 已錄製模擬';$('status').textContent=recordedLabel;
 $('runProvenance').replaceChildren(node('strong',recordedLabel),node('span',recording?.title||'尚未選擇示範資料'),node('span',recording?.source_kind==='scripted_demo'?'離線腳本示範 · 六個虛構角色 · 非模型實驗結果':'真實 Azure 生成的歷史記錄 · 六個虛構研究角色 · 本頁只讀回放'));
 $('viewContext').textContent=selectedStage?`歷史階段快照 · ${selectedStage}${f?' · turn '+f.state.turn_count:' · 此階段沒有已保存快照；不以最終狀態代替。'}`:frameKey==='final'?'最終已錄製狀態 / Final recorded state':`逐次發言回放 / Recorded turn ${f?.state.turn_count??0}`;
 $('timeline').disabled=!recording;$('timeline').max=recording?.frames.final.state.turn_count||0;$('timeline').value=f?.state.turn_count||0;$('replayTurn').textContent=selectedStage?'階段快照':frameKey==='final'?'最終記錄':`第 ${f?.state.turn_count||0} 次`;$('latest').disabled=!recording;
 $('transcript').replaceChildren(...(f?.transcript||[]).map(t=>{const e=node('article',undefined,'message');e.append(node('div',`TURN ${t.turn_id} · ${t.stage}`,'meta'),node('h3',`${t.participant_id} — ${t.role}`),node('p',t.utterance));return e;}));$('turnCount').textContent=`${f?.transcript.length||0} 次發言`;
 $('toolTabs').replaceChildren(...Object.entries(recording?.tools||{}).map(([id,tool])=>{const stat=f?.tools[id];const b=node('button',`${tool.title} · ${stat?stat.current_entries+' entries / 條目':'無快照'}${stat?.unplaced_actors?' · '+stat.unplaced_actors+' 未定位':''}`,id===toolId?'selected':'');b.dataset.tool=id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===toolId));b.onclick=()=>{toolId=id;sheetPage=0;render();};return b;}));
 const stat=f?.tools[toolId];$('provenanceCounts').textContent=stat?`來源歷史：${stat.proposal_count} 個提案 · ${stat.revision_count} 次修訂 · ${stat.history_event_count} 次操作`:'';
 $('entryList').replaceChildren(...(f?.state.proposal_history[toolId]||[]).map(e=>{const b=node('button',`${e.entry_id} · ${e.participant_role} · ${e.status}`);b.onclick=()=>inspect([e.entry_id]);return b;}));
 $('downloadJson').disabled=!f;$('downloadSvg').hidden=true;$('prev').disabled=true;$('next').disabled=true;$('pageLabel').textContent='—';
 if(!f){$('worksheet').replaceChildren(node('div','此階段沒有已保存快照。 / No recorded snapshot.','empty'));return;}
 $('worksheet').replaceChildren(node('div','載入已錄製工具…','empty'));sheet().catch(e=>notice(e.message));
}
async function sheet(){
 const f=frame();if(!f)return;const paths=f.svgs[toolId],request=++serial;
 sheetPage=Math.max(0,Math.min(sheetPage,paths.length-1));const url=asset(paths[sheetPage],recordingBase);const text=await read(url,true);if(request!==serial)return;
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Invalid worksheet SVG');
 // Defense in depth: generated SVGs are validated during export too.
 if(doc.querySelector('script, foreignObject, iframe, image'))throw Error('Unexpected active SVG content');
 for(const e of doc.querySelectorAll('*'))for(const a of e.attributes){if(a.name.toLowerCase().startsWith('on')||(['href','src'].includes(a.localName)&&!a.value.startsWith('#')))throw Error('Unexpected SVG reference');}
 const svg=document.importNode(doc.documentElement,true);svg.style.width=zoom+'%';$('worksheet').replaceChildren(svg);
 $('pageLabel').textContent=`${sheetPage+1} / ${paths.length}`;$('prev').disabled=sheetPage===0;$('next').disabled=sheetPage+1===paths.length;
 $('downloadSvg').href=url.href;$('downloadSvg').download=`${recording.slug}-${frameKey}-${toolId}-${sheetPage+1}.svg`;$('downloadSvg').hidden=false;
 svg.querySelectorAll('[data-entry-id]').forEach(el=>{const ids=(el.dataset.entryIds||el.dataset.entryId).split(',');el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label','Inspect proposal '+ids.join(', '));el.onclick=()=>inspect(ids);el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();inspect(ids);}};});
}
async function selectRecording(slug){
 const request=++runSerial;++serial;recording=null;recordingBase=null;frameKey='final';selectedStage=null;sheetPage=0;$('downloadRecording').hidden=true;
 $('worksheet').replaceChildren(node('div','載入記錄…','empty'));$('transcript').replaceChildren();
 const item=catalog.recordings.find(r=>r.slug===slug);if(!item){stagesUI();return;}
 try{const url=asset(item.path),data=await read(url);if(request!==runSerial)return;recording=data;recordingBase=new URL('./',url);$('downloadRecording').href=url.href;$('downloadRecording').download=`${data.slug}.json`;$('downloadRecording').hidden=false;auditUI();render();}catch(e){notice(e.message);stagesUI();}
}
$('runSelect').onchange=()=>selectRecording($('runSelect').value);
$('timeline').oninput=()=>{selectedStage=null;frameKey='turn-'+$('timeline').value;sheetPage=0;render();};
$('latest').onclick=()=>{selectedStage=null;frameKey='final';sheetPage=0;render();};
$('prev').onclick=()=>{sheetPage--;sheet().catch(e=>notice(e.message));};$('next').onclick=()=>{sheetPage++;sheet().catch(e=>notice(e.message));};
for(const [id,delta] of [['zoomIn',25],['zoomOut',-25]])$(id).onclick=()=>{zoom=Math.max(100,Math.min(300,zoom+delta));$('zoomLabel').textContent=zoom===100?'適應寬度':zoom+'%';const svg=$('worksheet').querySelector('svg');if(svg)svg.style.width=zoom+'%';};
$('downloadJson').onclick=()=>download({recording:recording.slug,view:frameKey,tool:toolId,state:frame().state.tools[toolId],provenance:frame().state.proposal_history[toolId]},`${recording.slug}-${frameKey}-${toolId}.json`);
$('closeInspector').onclick=()=>$('inspector').close();
(async()=>{try{catalog=await read(asset('catalog.json'));if(catalog.scenarios?.length){$('scenarioLibrary').hidden=false;for(const s of catalog.scenarios){const d=node('details');d.append(node('summary',s.title),node('p',s.discussion_question),node('p',s.background));for(const key of ['objectives','known_constraints']){d.append(node('h3',key==='objectives'?'Objectives / 目標':'Known constraints / 約束'));const ul=node('ul');for(const text of s[key])ul.append(node('li',text));d.append(ul);}$('scenarioDescriptions').append(d);}}if(catalog.approved_for_publication===false){const banner=node('p','LOCAL PREVIEW · 新版公開內容待批准，尚未部署');banner.id='publicationStatus';document.querySelector('.local-only').append(banner);}stagesUI();if(!catalog.recordings.length){$('viewContext').textContent='尚未批准任何示範資料。此預覽不包含研究記錄。';return;}$('runSelect').replaceChildren(...catalog.recordings.map(r=>{const option=node('option',r.title);option.value=r.slug;return option;}));await selectRecording(catalog.recordings[0].slug);}catch(e){notice(e.message);}})();

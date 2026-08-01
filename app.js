const state = {
  view: 'home',
  selectedType: null,
  selectedGroup: null,
  currentMeetingId: null,
};

const TYPES = {
  position: {label:'ポジション別ミーティング', icon:'🏐', groups:['セッター','アウトサイド','ミドル','オポジット','リベロ','マネージャー']},
  grade: {label:'学年別ミーティング', icon:'🎓', groups:['1年','2年','3年']},
  all: {label:'全体ミーティング', icon:'🤝', groups:['チーム全員']},
};

function loadMeetings(){ return JSON.parse(localStorage.getItem('tt_meetings') || '[]'); }
function saveMeetings(v){ localStorage.setItem('tt_meetings', JSON.stringify(v)); }
function uid(){ return 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
function esc(s=''){ return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function shell(content, active='home'){
  return `<div class="topbar"><div class="brand"><div><h1>TEAM Theory</h1><div class="team-name">佐沼高校 女子バレーボール部</div></div><div class="version">Prototype 0.1</div></div></div>
  <main class="content">${content}</main>
  <nav class="bottom-nav">
    ${nav('home','⌂','ホーム',active)}${nav('meetings','▣','履歴',active)}${nav('growth','↗','成長',active)}${nav('profile','●','設定',active)}
  </nav>`;
}
function nav(view,icon,label,active){return `<button class="nav-btn ${active===view?'active':''}" onclick="go('${view}')"><span>${icon}</span>${label}</button>`}

function render(){
  const app=document.getElementById('app');
  if(state.view==='home') app.innerHTML=shell(homeView(),'home');
  else if(state.view==='select') app.innerHTML=shell(selectView(),'home');
  else if(state.view==='room') app.innerHTML=shell(roomView(),'home');
  else if(state.view==='summary') app.innerHTML=shell(summaryView(),'home');
  else if(state.view==='meetings') app.innerHTML=shell(historyView(),'meetings');
  else if(state.view==='growth') app.innerHTML=shell(growthView(),'growth');
  else app.innerHTML=shell(profileView(),'profile');
}

function homeView(){
  const active=loadMeetings().find(m=>m.status==='open');
  return `<section class="hero"><div class="eyebrow">教わるから、考えるへ。</div><h2>今日は何を話し合いますか？</h2><p>それぞれの意見を集め、最後にチームの一つの結論へまとめます。</p></section>
  ${active?`<div class="section-title"><h3>進行中</h3><span>${active.entries.length}件の意見</span></div><div class="progress-card"><span class="pill">進行中</span><h3>${esc(active.group)}ミーティング</h3><p class="subtitle">${esc(active.theme||'テーマ未設定')}</p><div class="actions"><button class="btn primary" onclick="resume('${active.id}')">続きから</button></div></div>`:''}
  <div class="section-title"><h3>ミーティングを始める</h3><span>3種類</span></div>
  <div class="card-grid">
    ${meetingCard('position','ポジション別','同じ役割だから見える課題を共有')}
    ${meetingCard('grade','学年別','学年ごとの役割と行動を整理')}
    ${meetingCard('all','全体','各グループの結論をチームの方針へ')}
  </div>`;
}
function meetingCard(type,title,desc){return `<button class="meeting-card" onclick="startType('${type}')"><div class="icon">${TYPES[type].icon}</div><div><b>${title}ミーティング</b><small>${desc}</small></div><div class="chev">›</div></button>`}

function selectView(){
 const t=TYPES[state.selectedType];
 return `<button class="back" onclick="go('home')">‹ 戻る</button><h2 class="page-title">${t.icon} ${t.label}</h2><p class="subtitle">参加するグループを選択してください。</p><div class="choice-list">${t.groups.map(g=>`<button class="meeting-card" onclick="createMeeting('${esc(g)}')"><div><b>${esc(g)}</b><small>ミーティングを開始</small></div><div class="chev">›</div></button>`).join('')}</div>`;
}
function roomView(){
 const m=getCurrent(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 return `<button class="back" onclick="go('home')">‹ ホーム</button><h2 class="page-title">${esc(m.group)}ミーティング</h2><p class="subtitle">${TYPES[m.type].label}</p>
 <div class="form-card"><label class="label">今日のテーマ</label><input id="theme" class="input" value="${esc(m.theme||'')}" placeholder="例：レセプションの連携" onchange="updateTheme(this.value)">
 <label class="label">名前</label><input id="name" class="input" placeholder="例：佐藤">
 <label class="label">意見・気付き・提案</label><textarea id="text" class="textarea" placeholder="短くても大丈夫です。"></textarea>
 <div class="actions"><button class="btn gold" onclick="addEntry()">意見を送る</button></div></div>
 <div class="section-title"><h3>集まった意見</h3><span>${m.entries.length}件</span></div>
 <div class="form-card">${m.entries.length?m.entries.map(e=>`<div class="entry"><strong>${esc(e.name)}</strong><p>${esc(e.text)}</p></div>`).join(''):'<div class="empty">まだ意見はありません。</div>'}</div>
 <div class="actions"><button class="btn secondary" onclick="go('home')">一時保存</button><button class="btn primary" onclick="openSummary()">まとめへ</button></div>`;
}
function summaryView(){
 const m=getCurrent(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 const draft=m.summary || makeSummary(m);
 return `<button class="back" onclick="state.view='room';render()">‹ 入力へ戻る</button><h2 class="page-title">Aquilaまとめ</h2><p class="subtitle">集まった意見を一つの情報に整理します。</p>
 <div class="form-card"><label class="label">まとめ案</label><textarea id="summaryText" class="textarea" style="min-height:240px">${esc(draft)}</textarea></div>
 <div class="actions"><button class="btn secondary" onclick="regenerate()">作り直す</button><button class="btn primary" onclick="finalize()">確定して保存</button></div>`;
}
function historyView(){
 const ms=loadMeetings().sort((a,b)=>b.createdAt-a.createdAt);
 return `<h2 class="page-title">ミーティング履歴</h2><p class="subtitle">過去の話し合いと結論を見返せます。</p>${ms.length?ms.map(m=>`<div class="history-card"><span class="pill ${m.status==='closed'?'closed':''}">${m.status==='closed'?'完了':'進行中'}</span><h3>${esc(m.group)}ミーティング</h3><p class="subtitle">${new Date(m.createdAt).toLocaleString('ja-JP')}・意見${m.entries.length}件</p>${m.summary?`<div class="summary-box">${esc(m.summary)}</div>`:''}${m.status==='open'?`<div class="actions"><button class="btn primary" onclick="resume('${m.id}')">開く</button></div>`:''}</div>`).join(''):'<div class="empty">履歴はまだありません。</div>'}`;
}
function growthView(){
 const ms=loadMeetings().filter(m=>m.status==='closed'); const entries=ms.reduce((n,m)=>n+m.entries.length,0);
 return `<h2 class="page-title">チームの成長</h2><p class="subtitle">試作版では活動量を表示します。</p><div class="card-grid"><div class="progress-card"><small>完了したミーティング</small><h2>${ms.length}回</h2></div><div class="progress-card"><small>集まった意見</small><h2>${entries}件</h2></div><div class="progress-card"><small>チームの結論</small><h2>${ms.filter(m=>m.summary).length}件</h2></div></div>`;
}
function profileView(){return `<h2 class="page-title">設定</h2><p class="subtitle">試作品の端末内設定です。</p><div class="form-card"><label class="label">チーム名</label><input class="input" value="佐沼高校 女子バレーボール部" disabled><div class="actions"><button class="btn danger" onclick="resetData()">試作データを削除</button></div></div><div class="form-card"><b>現在の保存方式</b><p class="subtitle" style="margin-top:8px">この試作版は、この端末のブラウザ内に保存します。複数スマホのリアルタイム共有は次段階でオンラインデータベースへ接続します。</p></div>`}

function startType(type){state.selectedType=type;state.view='select';render()}
function createMeeting(group){
 const meetings=loadMeetings(); const m={id:uid(),type:state.selectedType,group,theme:'',entries:[],summary:'',status:'open',createdAt:Date.now()}; meetings.push(m);saveMeetings(meetings);state.currentMeetingId=m.id;state.view='room';render();
}
function getCurrent(){return loadMeetings().find(m=>m.id===state.currentMeetingId)}
function mutate(fn){const ms=loadMeetings();const i=ms.findIndex(m=>m.id===state.currentMeetingId);if(i<0)return;fn(ms[i]);saveMeetings(ms);}
function updateTheme(v){mutate(m=>m.theme=v)}
function addEntry(){const name=document.getElementById('name').value.trim();const text=document.getElementById('text').value.trim();if(!name||!text){toast('名前と意見を入力してください');return}mutate(m=>m.entries.push({name,text,createdAt:Date.now()}));render();toast('意見を追加しました')}
function makeSummary(m){
 const theme=m.theme||'今回のテーマ'; if(!m.entries.length)return `テーマ：${theme}\n\nまだ意見が入力されていません。`;
 const points=m.entries.slice(0,5).map((e,i)=>`${i+1}. ${e.text}`).join('\n');
 return `テーマ：${theme}\n\n【集まった意見】\n${points}\n\n【チームとして決めること】\n・共通する課題：\n・次回までの行動：\n・担当・確認方法：`;
}
function openSummary(){state.view='summary';render()}
function regenerate(){const m=getCurrent();document.getElementById('summaryText').value=makeSummary(m);toast('まとめ案を作り直しました')}
function finalize(){const s=document.getElementById('summaryText').value.trim();if(!s){toast('まとめを入力してください');return}mutate(m=>{m.summary=s;m.status='closed';m.closedAt=Date.now()});state.view='meetings';render();toast('ミーティングを保存しました')}
function resume(id){state.currentMeetingId=id;state.view='room';render()}
function go(v){state.view=v;render()}
function resetData(){if(confirm('試作データをすべて削除しますか？')){localStorage.removeItem('tt_meetings');state.currentMeetingId=null;go('home')}}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),1800)}

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();

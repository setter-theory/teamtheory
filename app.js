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
const ROLES = ['監督','コーチ','マネージャー','キャプテン','副キャプテン','選手'];

function read(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback} }
function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function loadMeetings(){ return read('tt_meetings', []); }
function saveMeetings(v){ write('tt_meetings', v); }
function loadAccount(){ return read('tt_account', null); }
function saveAccount(v){ write('tt_account', v); }
function uid(prefix='m'){ return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
function teamCode(){ return Math.random().toString(36).replace(/[^a-z0-9]/g,'').slice(0,6).toUpperCase(); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function shell(content, active='home'){
  const a=loadAccount();
  const team=a?.teamName || 'TEAM Theory';
  return `<div class="topbar"><div class="brand"><img class="brand-icon" src="./icons/icon-192.png?v=0.11" alt=""><div><h1>TEAM Theory</h1><div class="team-name">${esc(team)}</div></div><div class="version">Prototype 0.11</div></div></div>
  <main class="content">${content}</main>
  <nav class="bottom-nav">
    ${nav('home','⌂','ホーム',active)}${nav('meetings','▣','履歴',active)}${nav('growth','↗','成長',active)}${nav('profile','●','設定',active)}
  </nav>`;
}
function nav(view,icon,label,active){return `<button class="nav-btn ${active===view?'active':''}" onclick="go('${view}')"><span>${icon}</span>${label}</button>`}

function render(){
  const app=document.getElementById('app');
  if(!loadAccount() && !['welcome','createTeam','joinTeam'].includes(state.view)) state.view='welcome';
  if(state.view==='welcome') app.innerHTML=welcomeView();
  else if(state.view==='createTeam') app.innerHTML=createTeamView();
  else if(state.view==='joinTeam') app.innerHTML=joinTeamView();
  else if(state.view==='home') app.innerHTML=shell(homeView(),'home');
  else if(state.view==='select') app.innerHTML=shell(selectView(),'home');
  else if(state.view==='room') app.innerHTML=shell(roomView(),'home');
  else if(state.view==='summary') app.innerHTML=shell(summaryView(),'home');
  else if(state.view==='meetings') app.innerHTML=shell(historyView(),'meetings');
  else if(state.view==='growth') app.innerHTML=shell(growthView(),'growth');
  else app.innerHTML=shell(profileView(),'profile');
}

function welcomeView(){
 return `<main class="onboarding alia-home">
   <div class="alia-title-block">
     <h1><span>TEAM</span> Theory</h1>
     <p class="alia-tagline">教わるから、考えるへ。</p>
   </div>
   <div class="alia-character-stage">
     <div class="alia-bubble"><strong>Alia</strong><span>今日も最高のチームにしようね！</span></div>
     <img class="alia-character" src="./icons/alia-standalone.png?v=0.11" alt="Alia">
   </div>
   <div class="welcome-actions">
     <button class="welcome-action create" onclick="go('createTeam')"><span class="action-icon">👥</span><span><b>チームで始める</b><small>代表者はチームを作成。選手は招待コードで参加します。</small></span><span class="action-arrow">›</span></button>
     <button class="welcome-action join" onclick="go('joinTeam')"><span class="action-icon">▦</span><span><b>コードで参加する</b><small>招待コードを入力してチームに参加します。</small></span><span class="action-arrow">›</span></button>
   </div>
   <div class="alia-support">♥ Aliaがチームの成長をサポートするよ！ ♥</div>
   <div class="welcome-version">Version 0.11</div>
 </main>`;
}
function roleOptions(){return ROLES.map(r=>`<option value="${r}">${r}</option>`).join('')}
function createTeamView(){
 return `<main class="onboarding compact"><button class="back standalone" onclick="go('welcome')">‹ 戻る</button><h1>チームを作る</h1><div class="welcome-card form-card"><label class="label">チーム名</label><input id="teamName" class="input" placeholder="例：Alia高校"><label class="label">あなたの名前</label><input id="displayName" class="input" placeholder="例：Alia"><label class="label">役割</label><select id="role" class="input">${roleOptions()}</select><button class="btn primary wide" onclick="createTeamAccount()">作成する</button></div></main>`;
}
function joinTeamView(){
 return `<main class="onboarding compact"><button class="back standalone" onclick="go('welcome')">‹ 戻る</button><h1>チームに参加</h1><div class="welcome-card form-card"><label class="label">招待コード</label><input id="joinCode" class="input code-input" maxlength="6" placeholder="ABC123"><label class="label">チーム名</label><input id="joinTeamName" class="input" placeholder="例：Alia高校"><label class="label">あなたの名前</label><input id="joinName" class="input" placeholder="例：Alia"><label class="label">役割</label><select id="joinRole" class="input">${roleOptions()}</select><button class="btn primary wide" onclick="joinTeamAccount()">参加する</button><p class="note">試作版では参加情報をこの端末に登録します。複数端末同期はオンライン接続版で有効になります。</p></div></main>`;
}

function homeView(){
  const a=loadAccount(); const active=loadMeetings().find(m=>m.status==='open');
  return `<section class="hero"><div class="eyebrow">${esc(a.displayName)}さん・${esc(a.role)}</div><h2>今日は何を話し合いますか？</h2><p>それぞれの意見を集め、最後にチームの一つの結論へまとめます。</p></section>
  <div class="invite-strip"><div><small>チーム招待コード</small><strong>${esc(a.teamCode)}</strong></div><button class="mini-btn" onclick="copyCode()">コピー</button></div>
  ${active?`<div class="section-title"><h3>進行中</h3><span>${active.entries.length}件の意見</span></div><div class="progress-card"><span class="pill">進行中</span><h3>${esc(active.group)}ミーティング</h3><p class="subtitle">${esc(active.theme||'テーマ未設定')}</p><div class="actions"><button class="btn primary" onclick="resume('${active.id}')">続きから</button></div></div>`:''}
  <div class="section-title"><h3>ミーティングを始める</h3><span>3種類</span></div>
  <div class="card-grid">${meetingCard('position','ポジション別','同じ役割だから見える課題を共有')}${meetingCard('grade','学年別','学年ごとの役割と行動を整理')}${meetingCard('all','全体','各グループの結論をチームの方針へ')}</div>`;
}
function meetingCard(type,title,desc){return `<button class="meeting-card" onclick="startType('${type}')"><div class="icon">${TYPES[type].icon}</div><div><b>${title}ミーティング</b><small>${desc}</small></div><div class="chev">›</div></button>`}
function selectView(){ const t=TYPES[state.selectedType]; return `<button class="back" onclick="go('home')">‹ 戻る</button><h2 class="page-title">${t.icon} ${t.label}</h2><p class="subtitle">参加するグループを選択してください。</p><div class="choice-list">${t.groups.map(g=>`<button class="meeting-card" onclick="createMeeting('${esc(g)}')"><div><b>${esc(g)}</b><small>ミーティングを開始</small></div><div class="chev">›</div></button>`).join('')}</div>`; }
function roomView(){
 const m=getCurrent(); const a=loadAccount(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 return `<button class="back" onclick="go('home')">‹ ホーム</button><h2 class="page-title">${esc(m.group)}ミーティング</h2><p class="subtitle">${TYPES[m.type].label}</p><div class="room-meta"><span>作成者：${esc(m.ownerName)}</span><span>コード：${esc(a.teamCode)}</span></div>
 <div class="form-card"><label class="label">今日のテーマ</label><input id="theme" class="input" value="${esc(m.theme||'')}" placeholder="例：レセプションの連携" onchange="updateTheme(this.value)"><label class="label">名前</label><input id="name" class="input" value="${esc(a.displayName)}"><label class="label">意見・気付き・提案</label><textarea id="text" class="textarea" placeholder="短くても大丈夫です。"></textarea><div class="actions"><button class="btn gold" onclick="addEntry()">意見を送る</button></div></div>
 <div class="section-title"><h3>集まった意見</h3><span>${m.entries.length}件</span></div><div class="form-card">${m.entries.length?m.entries.map(e=>`<div class="entry"><strong>${esc(e.name)}</strong><p>${esc(e.text)}</p></div>`).join(''):'<div class="empty">まだ意見はありません。</div>'}</div><div class="actions"><button class="btn secondary" onclick="go('home')">一時保存</button><button class="btn primary" onclick="openSummary()">まとめへ</button></div>`;
}
function summaryView(){ const m=getCurrent(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>'; const draft=m.summary || makeSummary(m); return `<button class="back" onclick="state.view='room';render()">‹ 入力へ戻る</button><h2 class="page-title">Aliaまとめ</h2><p class="subtitle">集まった意見を一つの情報に整理します。</p><div class="form-card"><label class="label">まとめ案</label><textarea id="summaryText" class="textarea" style="min-height:240px">${esc(draft)}</textarea></div><div class="actions"><button class="btn secondary" onclick="regenerate()">作り直す</button><button class="btn primary" onclick="finalize()">確定して保存</button></div>`; }
function historyView(){ const ms=loadMeetings().sort((a,b)=>b.createdAt-a.createdAt); return `<h2 class="page-title">ミーティング履歴</h2><p class="subtitle">過去の話し合いと結論を見返せます。</p>${ms.length?ms.map(m=>`<div class="history-card"><span class="pill ${m.status==='closed'?'closed':''}">${m.status==='closed'?'完了':'進行中'}</span><h3>${esc(m.group)}ミーティング</h3><p class="subtitle">${new Date(m.createdAt).toLocaleString('ja-JP')}・意見${m.entries.length}件</p>${m.summary?`<div class="summary-box">${esc(m.summary)}</div>`:''}${m.status==='open'?`<div class="actions"><button class="btn primary" onclick="resume('${m.id}')">開く</button></div>`:''}</div>`).join(''):'<div class="empty">履歴はまだありません。</div>'}`; }
function growthView(){ const ms=loadMeetings().filter(m=>m.status==='closed'); const entries=ms.reduce((n,m)=>n+m.entries.length,0); return `<h2 class="page-title">チームの成長</h2><p class="subtitle">試作版では活動量を表示します。</p><div class="card-grid"><div class="progress-card"><small>完了したミーティング</small><h2>${ms.length}回</h2></div><div class="progress-card"><small>集まった意見</small><h2>${entries}件</h2></div><div class="progress-card"><small>チームの結論</small><h2>${ms.filter(m=>m.summary).length}件</h2></div></div>`; }
function profileView(){ const a=loadAccount(); return `<h2 class="page-title">設定</h2><div class="form-card"><label class="label">チーム名</label><input class="input" value="${esc(a.teamName)}" disabled><label class="label">招待コード</label><div class="code-row"><input class="input code-input" value="${esc(a.teamCode)}" disabled><button class="mini-btn" onclick="copyCode()">コピー</button></div><label class="label">名前</label><input id="profileName" class="input" value="${esc(a.displayName)}"><label class="label">役割</label><select id="profileRole" class="input">${ROLES.map(r=>`<option ${r===a.role?'selected':''}>${r}</option>`).join('')}</select><div class="actions"><button class="btn primary" onclick="saveProfile()">保存</button></div></div><div class="form-card"><b>オンライン共有</b><p class="subtitle" style="margin-top:8px">チームコードと権限の土台を追加しました。次の段階でオンラインデータベースへ接続し、複数スマホへ同時反映します。</p></div><div class="actions"><button class="btn danger" onclick="resetAll()">この端末の登録を削除</button></div>`; }

function createTeamAccount(){ const teamName=document.getElementById('teamName').value.trim(); const displayName=document.getElementById('displayName').value.trim(); const role=document.getElementById('role').value; if(!teamName||!displayName){toast('チーム名と名前を入力してください');return} saveAccount({teamId:uid('t'),teamName,teamCode:teamCode(),displayName,role,createdAt:Date.now(),mode:'owner'}); go('home'); }
function joinTeamAccount(){ const code=document.getElementById('joinCode').value.trim().toUpperCase(); const teamName=document.getElementById('joinTeamName').value.trim(); const displayName=document.getElementById('joinName').value.trim(); const role=document.getElementById('joinRole').value; if(code.length!==6||!teamName||!displayName){toast('6文字のコード・チーム名・名前を入力してください');return} saveAccount({teamId:'remote_'+code,teamName,teamCode:code,displayName,role,createdAt:Date.now(),mode:'member'}); go('home'); }
function copyCode(){ const code=loadAccount()?.teamCode||''; navigator.clipboard?.writeText(code).then(()=>toast('招待コードをコピーしました')).catch(()=>toast(`招待コード：${code}`)); }
function saveProfile(){ const a=loadAccount(); a.displayName=document.getElementById('profileName').value.trim()||a.displayName; a.role=document.getElementById('profileRole').value; saveAccount(a); render(); toast('プロフィールを保存しました'); }
function startType(type){state.selectedType=type;state.view='select';render()}
function createMeeting(group){ const a=loadAccount(); const meetings=loadMeetings(); const m={id:uid(),teamId:a.teamId,type:state.selectedType,group,theme:'',entries:[],summary:'',status:'open',createdAt:Date.now(),ownerName:a.displayName}; meetings.push(m);saveMeetings(meetings);state.currentMeetingId=m.id;state.view='room';render(); }
function getCurrent(){return loadMeetings().find(m=>m.id===state.currentMeetingId)}
function mutate(fn){const ms=loadMeetings();const i=ms.findIndex(m=>m.id===state.currentMeetingId);if(i<0)return;fn(ms[i]);saveMeetings(ms);}
function updateTheme(v){mutate(m=>m.theme=v)}
function addEntry(){const name=document.getElementById('name').value.trim();const text=document.getElementById('text').value.trim();if(!name||!text){toast('名前と意見を入力してください');return}mutate(m=>m.entries.push({name,text,createdAt:Date.now()}));render();toast('意見を追加しました')}
function makeSummary(m){ const theme=m.theme||'今回のテーマ'; if(!m.entries.length)return `テーマ：${theme}\n\nまだ意見が入力されていません。`; const points=m.entries.slice(0,8).map((e,i)=>`${i+1}. ${e.text}`).join('\n'); return `テーマ：${theme}\n\n【集まった意見】\n${points}\n\n【チームとして決めること】\n・共通する課題：\n・次回までの行動：\n・担当・確認方法：`; }
function openSummary(){state.view='summary';render()}
function regenerate(){const m=getCurrent();document.getElementById('summaryText').value=makeSummary(m);toast('まとめ案を作り直しました')}
function finalize(){const s=document.getElementById('summaryText').value.trim();if(!s){toast('まとめを入力してください');return}mutate(m=>{m.summary=s;m.status='closed';m.closedAt=Date.now()});state.view='meetings';render();toast('ミーティングを保存しました')}
function resume(id){state.currentMeetingId=id;state.view='room';render()}
function go(v){state.view=v;render()}
function resetAll(){if(confirm('この端末のチーム登録と試作データを削除しますか？')){localStorage.removeItem('tt_account');localStorage.removeItem('tt_meetings');state.currentMeetingId=null;state.view='welcome';render();}}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),1800)}

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js?v=0.11', { updateViaCache: 'none' })
    .then(reg => {
      reg.update().catch(()=>{});
      setInterval(() => reg.update().catch(()=>{}), 60 * 1000);
    })
    .catch(()=>{});
}
render();

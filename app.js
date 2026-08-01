const state = {
  view: 'home',
  selectedType: null,
  selectedGroup: null,
  currentMeetingId: null,
};

const TYPES = {
  position: {label:'ポジション別ミーティング', icon:'🏐', groups:['セッター','アウトサイドヒッター','オポジット','ミドルブロッカー','リベロ']},
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
  return `<main class="content content-no-header">${content}</main>
  <nav class="bottom-nav">
    ${nav('home','⌂','ホーム',active)}${nav('meetings','▤','ミーティング',active)}${nav('growth','↗','成長',active)}${nav('menu','☰','メニュー',active)}
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
  else if(state.view==='menu') app.innerHTML=shell(menuView(),'menu');
  else app.innerHTML=shell(profileView(),'menu');
}

function welcomeView(){
 return `<main class="onboarding alia-home">
   <div class="alia-title-block">
     <h1><span>TEAM</span> Theory</h1>
     <p class="alia-tagline">教わるから、考えるへ。</p>
   </div>
   <div class="alia-character-stage">
     <div class="alia-sparkle alia-sparkle-1">♥</div>
     <div class="alia-sparkle alia-sparkle-2">✦</div>
     <div class="alia-sparkle alia-sparkle-3">♡</div>
     <div class="alia-feather alia-feather-1">❧</div>
     <div class="alia-feather alia-feather-2">❧</div>
     <div class="alia-sparkle alia-sparkle-4">♥</div>
     <div class="alia-feather alia-feather-3">❧</div>
     <div class="alia-thought">
       <svg class="thought-cloud" viewBox="0 0 320 220" aria-hidden="true">
         <path d="M74 196C34 196 10 171 15 139C-3 116 8 78 40 66C41 31 76 12 105 28C129 1 178 5 196 34C226 15 268 34 270 69C309 76 323 112 304 139C311 173 280 199 244 194C225 221 181 224 157 202C132 223 91 220 74 196Z"/>
       </svg>
       <span class="thought-dot thought-dot-1"></span><span class="thought-dot thought-dot-2"></span><span class="thought-dot thought-dot-3"></span>
       <div class="thought-copy"><strong>Alia</strong><span>今日も最高のチームに<br>しようね！</span></div>
     </div>
     <img class="alia-character" src="./icons/alia-standalone.png?v=0.21" alt="Alia">
   </div>
   <div class="welcome-actions">
     <button class="welcome-action create" onclick="go('createTeam')"><span class="action-icon">👥</span><span><b>チームで始める</b><small>代表者はチームを作成。選手は招待コードで参加します。</small></span><span class="action-arrow">›</span></button>
     <button class="welcome-action join" onclick="go('joinTeam')"><span class="action-icon">▦</span><span><b>コードで参加する</b><small>招待コードを入力してチームに参加します。</small></span><span class="action-arrow">›</span></button>
   </div>
   <div class="alia-support">♥ Aliaがチームの成長をサポートするよ！ ♥</div>
   <div class="welcome-version">Version 0.26</div>
 </main>`;
}
function roleOptions(){return ROLES.map(r=>`<option value="${r}">${r}</option>`).join('')}
function createTeamView(){
 return `<main class="onboarding compact form-onboarding create-team-screen">
   <div class="create-decor create-heart">♥</div><div class="create-decor create-sparkle">✦</div><div class="create-decor create-wing">❧</div>
   <header class="create-team-header"><h1><span>チーム</span>を作る</h1><p class="form-lead">チーム名とあなたの情報を登録します。</p></header>
   <section class="create-team-card">
     <div class="create-field"><label class="create-label"><span class="create-label-icon">♟</span><span>チーム名</span></label><input id="teamName" class="input create-input" placeholder="例：Alia高校"></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon person-icon">●</span><span>あなたの名前</span></label><input id="displayName" class="input create-input" placeholder="例：Alia"></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon shield-icon">✦</span><span>役割</span></label><select id="role" class="input create-input create-select">${roleOptions()}</select></div>
     <div class="create-alia-zone"><div class="create-alia-bubble">チーム名は<br>後から変更できるよ♪</div><img src="./icons/alia-standalone.png?v=0.22" class="create-alia" alt="Alia"></div>
   </section>
   <div class="onboarding-bottom-actions create-bottom-actions"><button class="bottom-action secondary-action" onclick="go('welcome')"><span class="bottom-action-icon home-svg">⌂</span><span>ホーム</span></button><button class="bottom-action primary-action" onclick="createTeamAccount()"><span>チームを作成する</span><span class="bottom-action-arrow">›</span></button></div>
 </main>`;
}
function joinTeamView(){
 return `<main class="onboarding compact form-onboarding join-team-screen">
   <span class="join-decor join-heart">♥</span><span class="join-decor join-sparkle">✦</span><span class="join-decor join-wing">ʚ</span>
   <header class="join-team-header"><h1>チームに<span>参加</span></h1><p class="form-lead">招待コードを入力してチームに参加します。</p></header>
   <section class="join-team-card">
     <div class="join-field"><label class="join-label"><span class="join-label-icon code-mark">⌘</span><span>招待コード</span></label><div class="join-code-wrap"><input id="joinCode" class="input join-input join-code-input" maxlength="6" placeholder="ABC123" autocomplete="one-time-code" autocapitalize="characters"><span class="join-scan-mark" aria-hidden="true"></span></div><small class="join-help">招待コードはチーム作成者から共有されます。</small></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon team-icon">♟</span><span>チーム名</span></label><input id="joinTeamName" class="input join-input" placeholder="例：Alia高校"><small class="join-help">参加先のチーム名を入力してください。</small></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon person-icon"></span><span>あなたの名前</span></label><input id="joinName" class="input join-input" placeholder="例：Alia"><small class="join-help">チーム内で表示されるあなたの名前です。</small></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon shield-icon">★</span><span>役割</span></label><select id="joinRole" class="input join-input join-select">${roleOptions()}</select><small class="join-help">チーム内でのあなたの役割を選択してください。</small></div>
     <div class="join-alia-zone"><div class="join-alia-bubble">招待コードは<br>大文字・小文字を<br>気にしなくて<br>大丈夫だよ♪</div><img src="./icons/alia-standalone.png?v=0.28" class="join-alia" alt="Alia"></div>
   </section>
   <div class="onboarding-bottom-actions join-bottom-actions"><button class="bottom-action secondary-action" onclick="go('welcome')"><span class="bottom-action-icon">⌂</span><span>ホーム</span></button><button class="bottom-action join-action" onclick="joinTeamAccount()"><span>参加する</span><span class="bottom-action-arrow">›</span></button></div>
 </main>`;
}

function homeView(){
  const a=loadAccount(); const active=loadMeetings().find(m=>m.status==='open');
  return `<section class="hero home-hero"><div class="hero-copy"><div class="home-team-name"><span>♟</span>${esc(a.teamName)}</div><div class="eyebrow"><span class="eyebrow-icon">♙</span>${esc(a.displayName)}さん・${esc(a.role)}</div><h2>今日は何を話し合いますか？</h2><p>それぞれの意見を集め、最後にチームの一つの結論へまとめます。</p></div><img class="home-alia" src="./icons/alia-standalone.png?v=0.28" alt="Alia"></section>
  <div class="invite-strip"><div><small><span class="invite-icon">⚿</span>チーム招待コード</small><strong>${esc(a.teamCode)}</strong><p>このコードを共有して仲間をチームに招待できます。</p></div><button class="mini-btn" onclick="copyCode()"><span>▣</span>コピー</button></div>
  ${active?`<div class="section-title"><h3>進行中</h3><span>${active.entries.length}件の意見</span></div><div class="progress-card progress-card-modern"><div class="progress-card-top"><span class="pill">進行中</span><span>${esc(active.group)}</span></div><h3>${esc(active.theme||'テーマ未設定')}</h3><div class="progress-stats"><span>意見 <b>${active.entries.length}</b>件</span><span>作成者 <b>${esc(active.ownerName)}</b></span></div><div class="actions"><button class="btn primary" onclick="resume('${active.id}')">続きから</button></div></div>`:''}
  <div class="section-title"><h3>ミーティングを始める</h3><span>3種類</span></div>
  <div class="card-grid">${meetingCard('position','ポジション別','同じ役割だから見える課題を共有')}${meetingCard('grade','学年別','学年ごとの役割と行動を整理')}${meetingCard('all','全体','各グループの結論をチームの方針へ')}</div>`;
}
function meetingCard(type,title,desc){return `<button class="meeting-card" onclick="startType('${type}')"><div class="icon">${TYPES[type].icon}</div><div><b>${title}ミーティング</b><small>${desc}</small></div><div class="chev">›</div></button>`}
function selectView(){ const t=TYPES[state.selectedType]; return `<button class="back" onclick="go('home')">‹ 戻る</button><h2 class="page-title">${t.icon} ${t.label}</h2><p class="subtitle">参加するグループを選択してください。</p><div class="choice-list">${t.groups.map(g=>`<button class="meeting-card" onclick="createMeeting('${esc(g)}')"><div><b>${esc(g)}</b><small>ミーティングを開始</small></div><div class="chev">›</div></button>`).join('')}</div>`; }
function roomView(){
 const m=getCurrent(); const a=loadAccount(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 const typeLabel = m.type==='position' ? 'ポジション別ミーティング' : TYPES[m.type].label;
 const themePlaceholder = m.type==='grade' ? '例：学年として意識したいこと' : m.type==='all' ? '例：次の大会へ向けて' : '例：レセプションの連携';
 return `<section class="meeting-room">
   <header class="meeting-room-head"><div><small>${esc(typeLabel)}</small><h2>${esc(m.group)}ミーティング</h2></div><span class="meeting-room-mark">✦</span></header>
   <div class="room-meta room-meta-modern"><span><b>作成者</b>${esc(m.ownerName)}</span><span><b>ミーティングコード</b>${esc(a.teamCode)}</span></div>
   <div class="form-card meeting-form-card"><div class="meeting-form-title"><span>✎</span><div><b>意見を送る</b><small>短くても大丈夫。今感じていることを言葉にしよう。</small></div></div>
     <label class="label">今日のテーマ</label><input id="theme" class="input" value="${esc(m.theme||'')}" placeholder="${themePlaceholder}" onchange="updateTheme(this.value)">
     <label class="label">名前</label><input id="name" class="input" value="${esc(a.displayName)}">
     <label class="label">意見・気付き・提案</label><textarea id="text" class="textarea" placeholder="短くても大丈夫です。"></textarea>
     <div class="actions meeting-send-actions"><button class="btn gold meeting-send" onclick="addEntry()">意見を送る <span>➤</span></button></div>
   </div>
   <div class="section-title meeting-opinion-title"><h3>集まった意見</h3><span>${m.entries.length}件</span></div>
   <div class="opinion-list">${m.entries.length?m.entries.map(e=>`<article class="opinion-card"><div class="opinion-meta"><span class="opinion-avatar">${esc((e.name||'?').slice(0,1))}</span><div><strong>${esc(e.name)}</strong><small>${new Date(e.createdAt||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</small></div></div><p>${esc(e.text)}</p></article>`).join(''):'<div class="meeting-empty dark-empty"><span>♡</span><b>まだ意見はありません</b><small>最初の意見を送ってみよう！</small></div>'}</div>
   <div class="meeting-bottom-actions"><button class="btn back-action" onclick="state.view='select';render()">‹ 戻る</button><button class="btn secondary" onclick="go('home')">一時保存</button><button class="btn gold alia-summary-action" onclick="openSummary()">✦ Aliaまとめへ</button></div>
 </section>`;
}
function summaryView(){
 const m=getCurrent(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 const draft=m.summary || makeSummary(m);
 return `<section class="summary-page"><h2 class="page-title">✦ Aliaまとめ</h2><p class="subtitle">集まった意見を、チームの次の行動へ整理します。</p><div class="alia-summary-card"><div class="summary-card-head"><span>Alia</span><b>${esc(m.theme||'今回のテーマ')}</b></div><label class="label">まとめ案</label><textarea id="summaryText" class="textarea summary-textarea">${esc(draft)}</textarea><div class="alia-tip">💡 共通する課題・次回までの行動・担当を確認して保存しよう。</div></div><div class="summary-bottom-actions"><button class="btn back-action" onclick="state.view='room';render()">‹ 入力へ戻る</button><button class="btn secondary" onclick="regenerate()">作り直す</button><button class="btn gold" onclick="finalize()">確定して保存</button></div></section>`;
}
function historyView(){
 const ms=loadMeetings().sort((a,b)=>b.createdAt-a.createdAt);
 return `<section class="history-page"><h2 class="page-title">ミーティング履歴</h2><p class="subtitle">過去の話し合いと結論を見返せます。</p>${ms.length?`<div class="history-list">${ms.map(m=>`<article class="history-card history-card-modern"><div class="history-head"><span class="pill ${m.status==='closed'?'closed':''}">${m.status==='closed'?'完了':'進行中'}</span><span>${new Date(m.createdAt).toLocaleDateString('ja-JP')}</span></div><h3>${esc(m.group)}ミーティング</h3><p class="history-theme">${esc(m.theme||'テーマ未設定')}</p><div class="history-stats"><span>意見 <b>${m.entries.length}</b>件</span><span>${new Date(m.createdAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</span></div>${m.summary?`<div class="summary-preview">${esc(m.summary).split('\n').join('<br>')}</div>`:''}<div class="actions"><button class="btn primary" onclick="resume('${m.id}')">${m.status==='open'?'続きから':'詳細を見る'}</button></div></article>`).join('')}</div>`:'<div class="meeting-empty dark-empty"><span>▤</span><b>履歴はまだありません</b><small>ミーティングを保存するとここに表示されます。</small></div>'}<div class="history-bottom-actions"><button class="btn back-action" onclick="go('home')">‹ ホームへ戻る</button></div></section>`;
}
function growthView(){ const ms=loadMeetings().filter(m=>m.status==='closed'); const entries=ms.reduce((n,m)=>n+m.entries.length,0); return `<h2 class="page-title">チームの成長</h2><p class="subtitle">試作版では活動量を表示します。</p><div class="card-grid"><div class="progress-card"><small>完了したミーティング</small><h2>${ms.length}回</h2></div><div class="progress-card"><small>集まった意見</small><h2>${entries}件</h2></div><div class="progress-card"><small>チームの結論</small><h2>${ms.filter(m=>m.summary).length}件</h2></div></div>`; }

function menuView(){
  const a=loadAccount();
  return `<section class="menu-page">
    <div class="menu-page-head"><div><small>TEAM MENU</small><h2>メニュー</h2><p>${esc(a.teamName)}の管理・設定</p></div><img src="./icons/alia-standalone.png?v=0.28" alt="Alia"></div>
    <div class="menu-list">
      ${menuItem('👥','メンバー管理','メンバー・役割を確認')}
      ${menuItem('🔑','招待コード','コードの確認・コピー','copyCode()')}
      ${menuItem('🔔','通知','新着情報を確認')}
      ${menuItem('⚙','チーム設定','チーム名や運用設定')}
      ${menuItem('●','プロフィール','表示名・役割を変更',"go('profile')")}
      ${menuItem('⇧','データ出力','記録の共有・保存')}
      ${menuItem('?','ヘルプ','使い方を確認')}
      ${menuItem('ⓘ','アプリ情報','バージョン・利用情報')}
    </div>
  </section>`;
}
function menuItem(icon,title,desc,action="toast('この機能は準備中です')"){
  return `<button class="menu-list-item" onclick="${action}"><span class="menu-list-icon">${icon}</span><span><b>${title}</b><small>${desc}</small></span><span class="menu-list-chevron">›</span></button>`;
}
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
  navigator.serviceWorker.register('./sw.js?v=0.28', { updateViaCache: 'none' })
    .then(reg => {
      reg.update().catch(()=>{});
      setInterval(() => reg.update().catch(()=>{}), 60 * 1000);
    })
    .catch(()=>{});
}
render();

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

const THEME_CATEGORIES = {
  position: [
    ['technique','技術・フォーム'],
    ['tactics','戦術・判断'],
    ['coordination','連携・コミュニケーション'],
    ['mental','メンタル'],
    ['conditioning','体調管理'],
    ['other','その他']
  ],
  grade: [
    ['role','学年としての役割'],
    ['life','学校生活・私生活'],
    ['time','時間管理・両立'],
    ['relationship','人間関係・雰囲気'],
    ['goal','目標・振り返り'],
    ['mental','メンタル'],
    ['conditioning','体調管理'],
    ['other','その他']
  ],
  all: [
    ['team_issue','チーム全体の課題'],
    ['tactics','戦術・プレー方針'],
    ['teamwork','チームワーク・雰囲気'],
    ['rule','チームルール・約束'],
    ['goal','目標・大会への準備'],
    ['mental','メンタル'],
    ['conditioning','体調管理'],
    ['other','その他']
  ]
};
function themeCategoryOptions(type, selected=''){
  const options = THEME_CATEGORIES[type] || THEME_CATEGORIES.all;
  return `<option value="">選択してください</option>` + options.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
}
function themeCategoryLabel(type, value){
  const options = THEME_CATEGORIES[type] || [];
  return (options.find(([key])=>key===value)||[])[1] || '';
}


function read(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback} }
function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function looksLikeMeeting(item){
  return !!item && typeof item==='object' && (
    Array.isArray(item.entries) || 'group' in item || 'theme' in item ||
    'summary' in item || 'status' in item || 'createdAt' in item
  );
}
function normalizeMeetingArray(value){
  if(Array.isArray(value)) return value.filter(looksLikeMeeting);
  if(value && typeof value==='object'){
    for(const key of ['meetings','meetingHistory','history','items','data']){
      if(Array.isArray(value[key])) return value[key].filter(looksLikeMeeting);
    }
  }
  return [];
}
function meetingFingerprint(m){
  return [m.id||'',m.createdAt||'',m.group||'',m.theme||'',(m.entries||[]).length].join('|');
}
function loadMeetings(){
  const primary=normalizeMeetingArray(read('tt_meetings', []));
  const recovered=[];
  // 過去版・試作版で保存キーが変わっていても履歴を回収する。
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(key==='tt_meetings' || !/(meeting|history|議事|履歴)/i.test(key)) continue;
    try{ recovered.push(...normalizeMeetingArray(JSON.parse(localStorage.getItem(key)))); }catch{}
  }
  const merged=[]; const seen=new Set();
  [...primary,...recovered].forEach(m=>{
    const fp=meetingFingerprint(m);
    if(seen.has(fp)) return;
    seen.add(fp); merged.push(m);
  });
  if(merged.length!==primary.length) write('tt_meetings',merged);
  return merged;
}
function saveMeetings(v){
  write('tt_meetings', v);
  // 復旧用バックアップ。今後の更新でも履歴を失わない。
  write('tt_meetings_backup', v);
}
function loadAccounts(){
  let accounts=read('tt_accounts', []);
  const legacy=read('tt_account', null);
  if(legacy && !accounts.some(a=>a.teamId===legacy.teamId)){
    accounts.push(legacy); write('tt_accounts', accounts);
  }
  return accounts;
}
function loadAccount(){
  const accounts=loadAccounts();
  if(!accounts.length) return null;
  const activeId=localStorage.getItem('tt_active_team');
  const active=accounts.find(a=>a.teamId===activeId) || accounts[0];
  if(active) localStorage.setItem('tt_active_team', active.teamId);
  return active || null;
}
function saveAccount(v){
  const accounts=loadAccounts();
  const i=accounts.findIndex(a=>a.teamId===v.teamId);
  if(i>=0) accounts[i]=v; else accounts.push(v);
  write('tt_accounts',accounts);
  write('tt_account',v);
  localStorage.setItem('tt_active_team',v.teamId);
}
function migrateLegacyMeetingOwnership(){
  const accounts=loadAccounts();
  if(!accounts.length) return;
  const meetings=loadMeetings();
  if(!meetings.length) return;
  const validIds=new Set(accounts.map(a=>a.teamId));
  const active=loadAccount();
  if(!active) return;
  let changed=false;
  let migrated=meetings.map(m=>{
    // v0.38以前の履歴・旧ID・IDなし履歴を現在の保存チームへ引き継ぐ。
    if(!m.teamId || !validIds.has(m.teamId)){
      changed=true;
      return {...m,teamId:active.teamId,teamName:m.teamName||active.teamName};
    }
    if(!m.teamName){ changed=true; return {...m,teamName:(accounts.find(a=>a.teamId===m.teamId)||active).teamName}; }
    return m;
  });
  // 保存チームが1つだけなら、過去履歴はすべてそのチームのものとして復旧する。
  if(accounts.length===1 && migrated.some(m=>m.teamId!==active.teamId)){
    migrated=migrated.map(m=>({...m,teamId:active.teamId,teamName:active.teamName||m.teamName}));
    changed=true;
  }
  if(changed) saveMeetings(migrated);
}
function currentTeamMeetings(){
  const a=loadAccount();
  if(!a) return loadMeetings();
  migrateLegacyMeetingOwnership();
  const all=loadMeetings();
  const own=all.filter(m=>m.teamId===a.teamId);
  const accounts=loadAccounts();
  // v0.38以前はチーム情報を持たない履歴が多いため、最初に保存したチームでは
  // 旧履歴をまとめて確認できるようにする。新規作成分はteamIdで分離される。
  if(accounts[0] && accounts[0].teamId===a.teamId && own.length<all.length){
    return all;
  }
  return own;
}
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
   <div class="alia-hero-v396">
     <div class="alia-sparkle alia-sparkle-1">♥</div>
     <div class="alia-sparkle alia-sparkle-2">✦</div>
     <div class="alia-sparkle alia-sparkle-3">♡</div>
     <div class="alia-feather alia-feather-1">❧</div>
     <div class="alia-feather alia-feather-2">❧</div>
     <div class="alia-sparkle alia-sparkle-4">♥</div>
     <div class="alia-feather alia-feather-3">❧</div>
     <div class="alia-hero-left-v396">
       <div class="alia-thought alia-thought-v396">
         <svg class="thought-cloud" viewBox="0 0 320 220" aria-hidden="true">
           <path d="M74 196C34 196 10 171 15 139C-3 116 8 78 40 66C41 31 76 12 105 28C129 1 178 5 196 34C226 15 268 34 270 69C309 76 323 112 304 139C311 173 280 199 244 194C225 221 181 224 157 202C132 223 91 220 74 196Z"/>
         </svg>
         <span class="thought-dot thought-dot-1"></span><span class="thought-dot thought-dot-2"></span><span class="thought-dot thought-dot-3"></span>
         <div class="thought-copy"><strong>Alia</strong><span>今日も最高のチームに<br>しようね！</span></div>
       </div>
       <div class="alia-title-block alia-title-v396">
         <h1><span>TEAM</span> Theory</h1>
         <p class="alia-tagline">教わるから、考えるへ。</p>
       </div>
     </div>
     <img class="alia-character alia-character-v396" src="./icons/alia-standalone.png?v=0.39.6" alt="Alia">
   </div>
   ${savedTeamsView()}
   <div class="welcome-actions">
     <button class="welcome-action create" onclick="go('createTeam')"><span class="action-icon">👥</span><span><b>チームで始める</b><small>新しいチームを作成します。</small></span><span class="action-arrow">›</span></button>
     <button class="welcome-action join" onclick="go('joinTeam')"><span class="action-icon qr-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM18 14h2v2h-2zM14 17h2v3h-2zM17 18h3v2h-3z"/></svg></span><span><b>コードで参加する</b><small>招待コードでチームに参加します。</small></span><span class="action-arrow">›</span></button>
   </div>
   <button class="welcome-utility" onclick="showTopSettingsNotice()"><span class="welcome-utility-icon">⚙</span><span>設定・その他</span><span class="welcome-utility-arrow">›</span></button>
   <div class="alia-support">♥ Aliaがチームの成長をサポートするよ！ ♥</div>
   <div class="welcome-version">Version 0.39.6</div>
 </main>`;
}
function savedTeamsView(){
 const teams=loadAccounts();
 if(!teams.length) return '';
 const visible=teams.slice(0,2);
 const rest=teams.length-visible.length;
 return `<section class="saved-teams-panel"><div class="saved-teams-head"><div><small>SAVED TEAMS</small><h2>保存したチーム</h2></div><span>${teams.length}件</span></div><div class="saved-teams-list">${visible.map(a=>`<button class="saved-team-card" onclick="switchTeam('${a.teamId}')"><span class="saved-team-icon">♟</span><span><b>${esc(a.teamName)}</b><small>${esc(a.displayName)}・${esc(a.role)}</small></span><span class="saved-team-arrow">›</span></button>`).join('')}</div>${rest>0?`<button class="saved-teams-more" onclick="go('menu')">ほか${rest}件を見る ›</button>`:''}</section>`;
}
function showTopSettingsNotice(){alert("設定・その他は、保存したチームを選択すると利用できます。")}
function roleOptions(){return ROLES.map(r=>`<option value="${r}">${r}</option>`).join('')}
function createTeamView(){
 return `<main class="onboarding compact form-onboarding create-team-screen">
   <div class="create-decor create-heart">♥</div><div class="create-decor create-sparkle">✦</div><div class="create-decor create-wing">❧</div>
   <header class="create-team-header"><h1><span>チーム</span>を作る</h1><p class="form-lead">チーム名とあなたの情報を登録します。</p></header>
   <section class="create-team-card">
     <div class="create-field"><label class="create-label"><span class="create-label-icon">♟</span><span>チーム名</span></label><input id="teamName" class="input create-input" placeholder="例：Alia高校"></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon person-icon">●</span><span>あなたの名前</span></label><input id="displayName" class="input create-input" placeholder="例：Alia"></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon shield-icon">✦</span><span>役割</span></label><select id="role" class="input create-input create-select">${roleOptions()}</select></div>
     <div class="create-alia-zone"><div class="create-alia-bubble">チーム名は<br>後から変更できるよ♪</div><img src="./icons/alia-standalone.png?v=0.39.6" class="create-alia" alt="Alia"></div>
   </section>
   <div class="onboarding-bottom-actions create-bottom-actions"><button class="bottom-action secondary-action" onclick="go('welcome')"><span class="bottom-action-icon home-svg">⌂</span><span>トップ</span></button><button class="bottom-action primary-action" onclick="createTeamAccount()"><span>チームを作成する</span><span class="bottom-action-arrow">›</span></button></div>
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
     <div class="join-alia-zone"><div class="join-alia-bubble">招待コードは<br>大文字・小文字を<br>気にしなくて<br>大丈夫だよ♪</div><img src="./icons/alia-standalone.png?v=0.37" class="join-alia" alt="Alia"></div>
   </section>
   <div class="onboarding-bottom-actions join-bottom-actions"><button class="bottom-action secondary-action" onclick="go('welcome')"><span class="bottom-action-icon">⌂</span><span>トップ</span></button><button class="bottom-action join-action" onclick="joinTeamAccount()"><span>参加する</span><span class="bottom-action-arrow">›</span></button></div>
 </main>`;
}

function homeView(){
  const a=loadAccount(); const active=currentTeamMeetings().find(m=>m.status==='open');
  return `<section class="hero home-hero"><div class="hero-copy"><div class="home-team-name"><span>♟</span>${esc(a.teamName)}</div><div class="eyebrow"><span class="eyebrow-icon">♙</span>${esc(a.displayName)}さん・${esc(a.role)}</div><h2>今日は何を話し合いますか？</h2><p>それぞれの意見を集め、最後にチームの一つの結論へまとめます。</p></div><img class="home-alia" src="./icons/alia-standalone.png?v=0.37" alt="Alia"></section>
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
 const themePlaceholder = m.type==='grade' ? '例：部活と勉強を両立するには' : m.type==='all' ? '例：次の大会へ向けて改善すること' : '例：ミドルをもっと使うには';
 const categoryLabel = themeCategoryLabel(m.type,m.themeCategory||'');
 return `<section class="meeting-room">
   <header class="meeting-room-head"><div><small>${esc(typeLabel)}</small><h2>${esc(m.group)}ミーティング</h2></div><span class="meeting-room-mark">✦</span></header>
   <div class="room-meta room-meta-modern"><span><b>作成者</b>${esc(m.ownerName)}</span><span><b>ミーティングコード</b>${esc(a.teamCode)}</span></div>
   <div class="form-card meeting-form-card"><div class="meeting-form-title"><span>✎</span><div><b>意見を送る</b><small>短くても大丈夫。今感じていることを言葉にしよう。</small></div></div>
     <div class="theme-picker-card">
       <label class="label">今日のテーマ</label>
       <select id="themeCategory" class="input theme-category-select" onchange="updateThemeCategory(this.value)">${themeCategoryOptions(m.type,m.themeCategory||'')}</select>
       <label class="label theme-detail-label">具体的なテーマ</label>
       <input id="theme" class="input" value="${esc(m.theme||'')}" placeholder="${themePlaceholder}" onchange="updateTheme(this.value)">
       ${categoryLabel?`<small class="theme-selection-note">選択中：${esc(categoryLabel)}</small>`:''}
     </div>
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
 const plan=parseActionPlan(m.summary || makeSummary(m),m);
 const adviceSections=buildAdaptiveAdviceSections(m,plan);
 const methodSections=adviceSections.map(section=>`<div class="method-block adaptive-method-block"><strong>${esc(section.icon)} ${esc(section.label)}</strong><div>${esc(section.text)}</div></div>`).join('');
 const sourceOpinions = m.entries.length ? m.entries.map((e,i)=>`<article class="summary-source-card"><div class="summary-source-number">${i+1}</div><div class="summary-source-body"><div class="summary-source-meta"><strong>${esc(e.name)}</strong><small>${new Date(e.createdAt||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</small></div><p>${esc(e.text)}</p></div></article>`).join('') : '<div class="meeting-empty dark-empty"><span>♡</span><b>意見はまだありません</b><small>意見を入力すると、発言者と内容がここに残ります。</small></div>';
 return `<section class="summary-page"><h2 class="page-title">ミーティングまとめ</h2><div class="summary-source-section player-opinions-main"><div class="summary-panel-head player-voices-head"><div><small>PLAYER VOICES</small><h3>選手から出た意見</h3></div><span>${m.entries.length}件</span></div><div class="summary-source-list">${sourceOpinions}</div></div><div class="alia-plan-card"><div class="summary-panel-head alia-plan-head"><div><small>ALIA ADVICE</small></div></div><div class="action-plan-list"><div class="action-plan-card issue"><span class="action-plan-label">課題</span><div class="action-plan-answer">${esc(plan.issue)}</div></div><div class="action-plan-card action"><span class="action-plan-label">行動</span><div class="action-plan-answer">${esc(plan.action)}</div></div><div class="action-plan-card method"><span class="action-plan-label">方法</span><div class="action-plan-answer method-answer">${methodSections}</div></div></div></div><div class="summary-bottom-actions two-actions"><button class="btn back-action" onclick="state.view='room';render()">‹ 入力へ戻る</button><button class="btn gold" onclick="finalize()">確定して保存</button></div></section>`;
}
function historyView(){
 const ms=currentTeamMeetings().sort((a,b)=>b.createdAt-a.createdAt);
 return `<section class="history-page"><h2 class="page-title">ミーティング履歴</h2><p class="subtitle">過去の話し合いと結論を見返せます。</p>${ms.length?`<div class="history-list">${ms.map(m=>`<article class="history-card history-card-modern"><div class="history-head"><span class="pill ${m.status==='closed'?'closed':''}">${m.status==='closed'?'完了':'進行中'}</span><span>${new Date(m.createdAt).toLocaleDateString('ja-JP')}</span></div><h3>${esc(m.group)}ミーティング</h3><p class="history-theme">${esc(m.theme||'テーマ未設定')}</p><div class="history-stats"><span>意見 <b>${m.entries.length}</b>件</span><span>${new Date(m.createdAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</span></div>${m.summary?`<div class="summary-preview">${esc(m.summary).split('\n').join('<br>')}</div>`:''}<div class="actions"><button class="btn primary" onclick="resume('${m.id}')">${m.status==='open'?'続きから':'詳細を見る'}</button></div></article>`).join('')}</div>`:'<div class="meeting-empty dark-empty"><span>▤</span><b>履歴はまだありません</b><small>ミーティングを保存するとここに表示されます。</small></div>'}<div class="history-bottom-actions"><button class="btn back-action" onclick="go('home')">‹ ホームへ戻る</button></div></section>`;
}
function growthView(){ const ms=currentTeamMeetings().filter(m=>m.status==='closed'); const entries=ms.reduce((n,m)=>n+m.entries.length,0); return `<h2 class="page-title">チームの成長</h2><p class="subtitle">試作版では活動量を表示します。</p><div class="card-grid"><div class="progress-card"><small>完了したミーティング</small><h2>${ms.length}回</h2></div><div class="progress-card"><small>集まった意見</small><h2>${entries}件</h2></div><div class="progress-card"><small>チームの結論</small><h2>${ms.filter(m=>m.summary).length}件</h2></div></div>`; }

function menuView(){
  const a=loadAccount();
  return `<section class="menu-page">
    <div class="menu-page-head"><div><small>TEAM MENU</small><h2>メニュー</h2><p>${esc(a.teamName)}の管理・設定</p></div><img src="./icons/alia-standalone.png?v=0.37" alt="Alia"></div>
    <div class="menu-list">
      ${menuItem('⇄','チームを切り替える','保存したチームを選択','goTop()')}
      ${menuItem('⌂','トップ画面へ戻る','チーム作成・参加・切り替え','goTop()')}
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
function createMeeting(group){ const a=loadAccount(); const meetings=loadMeetings(); const m={id:uid(),teamId:a.teamId,type:state.selectedType,group,themeCategory:'',theme:'',entries:[],summary:'',status:'open',createdAt:Date.now(),ownerName:a.displayName}; meetings.push(m);saveMeetings(meetings);state.currentMeetingId=m.id;state.view='room';render(); }
function getCurrent(){return loadMeetings().find(m=>m.id===state.currentMeetingId)}
function mutate(fn){const ms=loadMeetings();const i=ms.findIndex(m=>m.id===state.currentMeetingId);if(i<0)return;fn(ms[i]);saveMeetings(ms);}
function updateThemeCategory(v){mutate(m=>m.themeCategory=v);render()}
function updateTheme(v){mutate(m=>m.theme=v)}
function addEntry(){const m=getCurrent();const category=document.getElementById('themeCategory')?.value||m?.themeCategory||'';const theme=document.getElementById('theme')?.value.trim()||m?.theme||'';const name=document.getElementById('name').value.trim();const text=document.getElementById('text').value.trim();if(!category){toast('今日のテーマを選択してください');return}if(!theme){toast('具体的なテーマを入力してください');return}if(!name||!text){toast('名前と意見を入力してください');return}mutate(item=>{item.themeCategory=category;item.theme=theme;item.entries.push({name,text,createdAt:Date.now()})});render();toast('意見を追加しました')}
function buildAdaptiveAdviceSections(m,plan){
 const theme=(m.theme||'').trim();
 const voices=(m.entries||[]).map(e=>e.text||'').join(' ');
 const category=m.themeCategory||'';
 const text=`${theme} ${voices}`;
 const first=(m.entries||[]).map(e=>(e.text||'').trim()).find(Boolean)||theme||'今回のテーマ';
 const compact=value=>String(value||'').replace(/^・/gm,'').replace(/\n+/g,'／');

 if(['life','time'].includes(category) || /私生活|生活習慣|生活態度|規則正しい|朝|夜更かし|スマホ|整理整頓|身だしなみ/.test(text)){
   return [
    {icon:'🏠',label:'生活習慣',text:'起床・就寝・食事の時刻をまず3日間記録し、直す項目を1つだけ決めます。'},
    {icon:'⏰',label:'時間の使い方',text:'学校・部活・家庭の予定を前日に確認し、準備と移動に10分の余裕をつくります。'},
    {icon:'🔁',label:'続け方',text:'できた日をチェックし、週末に「続いた理由／崩れた理由」を短く振り返ります。'}
   ];
 }
 if(category==='time' || /勉強|学習|宿題|成績|テスト|進路|受験|両立/.test(text)){
   return [
    {icon:'📚',label:'学習計画',text:'次の締切から逆算し、1日15〜30分で終わる単位に分けます。'},
    {icon:'🗓',label:'部活との両立',text:'練習日の前後に短時間枠を固定し、疲れている日は復習だけに絞ります。'},
    {icon:'✅',label:'確認方法',text:'週1回、予定と実績を見比べて、無理だった計画だけ調整します。'}
   ];
 }
 if(['relationship','teamwork','coordination'].includes(category) || /人間関係|仲間|雰囲気|信頼|喧嘩|ケンカ|話し合い|コミュニケーション|声掛け|声かけ/.test(text)){
   return [
    {icon:'🗣',label:'伝え方',text:'「事実→自分の気持ち→お願い」の順で、相手を責めずに短く伝えます。'},
    {icon:'👂',label:'聞き方',text:'途中で否定せず最後まで聞き、最後に相手の意図を一文で確認します。'},
    {icon:'🤝',label:'チームでの実践',text:'練習後に2分だけ共有時間をつくり、良かった声掛けを1つ挙げます。'}
   ];
 }
 if(category==='role' || /キャプテン|副キャプテン|リーダー|役割|責任|まとめる/.test(text)){
   return [
    {icon:'⭐',label:'役割',text:'自分が全部決めず、目的と締切を示して担当を分けます。'},
    {icon:'🗣',label:'働きかけ',text:'指示の前に理由を一言添え、最後に質問を受ける時間をつくります。'},
    {icon:'👥',label:'チームづくり',text:'週1回、困っている人と良かった行動を確認し、次の一歩を決めます。'}
   ];
 }
 if(category==='mental' || /緊張|不安|プレッシャー|自信|メンタル|怖い/.test(text)){
   return [
    {icon:'🧠',label:'気持ちの整え方',text:'4秒吸って6秒吐く呼吸を5回行い、意識を結果ではなく次の1プレーへ戻します。'},
    {icon:'🔁',label:'ルーティン',text:'試合前とプレー前の動作を毎回同じ順番にし、練習から繰り返します。'},
    {icon:'📝',label:'振り返り',text:'緊張した場面と実行できた行動を1つずつ記録し、次回の対策を決めます。'}
   ];
 }
 if(category==='conditioning' || /睡眠|疲れ|疲労|休養|回復|体調|食事|栄養|水分/.test(text)){
   return [
    {icon:'🌙',label:'休養',text:'起床時刻を大きくずらさず、就寝前30分は強い光とスマホ操作を減らします。'},
    {icon:'🥤',label:'補給',text:'普段飲み慣れた水分をこまめに取り、練習後は食事を抜かずに回復を優先します。'},
    {icon:'📋',label:'体調確認',text:'睡眠時間・疲労感・痛みを毎日簡単に記録し、悪化時は指導者へ早めに伝えます。'}
   ];
 }
 if(['technique','tactics','team_issue'].includes(category) || /ミドル|クイック|速攻|トス|レセプション|サーブレシーブ|返球|サーブ|スパイク|ブロック|ディグ|バレー|試合|練習/.test(text)){
   return [
    {icon:'🏐',label:'練習',text:compact(plan.method)},
    {icon:'🏆',label:'試合',text:`「${first}」を使う条件と合図を事前に決め、試合中は1セットごとに実行できたか確認します。`},
    {icon:'📊',label:'振り返り',text:'本数・成功した場面・できなかった理由を記録し、次の練習で試すことを1つ決めます。'}
   ];
 }
 return [
   {icon:'🔍',label:'原因',text:`「${first}」が起きる場面を具体的に3つ挙げ、共通点を探します。`},
   {icon:'🚶',label:'最初の一歩',text:'明日から全員ができる小さな行動を1つ選び、実施するタイミングを決めます。'},
   {icon:'✅',label:'確認',text:'1週間後にできた回数と変化を確認し、続けるか方法を変えるか話し合います。'}
 ];
}

function buildAliaAdvice(m){
 const texts=(m.entries||[]).map(e=>(e.text||'').trim()).filter(Boolean);
 if(!texts.length) return 'まずは一人ずつ、今感じていることを短く出してみよう。';
 if(texts.length===1) return '出た意見をもとに、チームで一つだけ実行することを決めてみよう。';
 return `意見が${texts.length}件集まりました。共通する内容から、続けられる行動を一つ選んでみよう。`;
}
function buildActionPlan(m){
 const theme=m.theme||'今回のテーマ';
 const texts=(m.entries||[]).map(e=>(e.text||'').trim()).filter(Boolean);
 if(!texts.length) return {issue:`「${theme}」について、まだ意見が集まっていません。`,action:'まず全員の意見を集め、共通する課題を一つに絞ります。',method:'・一人1つずつ意見を出す\n・似た意見をまとめる\n・次の練習で試すことを1つ決める'};
 const joined=texts.join(' ');
 const first=texts[0];
 let issue=`「${theme}」について、選手から出た意見に共通する課題を整理する必要があります。`;
 let action=`まずは「${first}」を優先し、次の練習で全員が同じ行動を試します。`;
 let method='・練習前に実行内容を30秒で確認する\n・練習中に一度だけ全員で確認する\n・終了後に「できた／できなかった」を振り返る';
 if(/緊張|不安|プレッシャー/.test(joined)){
   issue='試合や重要な場面で緊張が強くなり、普段どおりの判断や動きが出にくくなっています。';
   action='緊張をなくそうとせず、試合前とプレー前の行動を固定して集中を戻します。';
   method='・試合前に4秒吸って6秒吐く呼吸を5回行う\n・サーブ前などのルーティンを毎回同じ順番にする\n・練習でも点数・時間制限を入れ、本番に近い状況を作る';
 }else if(/声|コミュニケーション|連携/.test(joined)){
   issue='プレー前後の声掛けが少なく、役割確認と次の準備が遅れています。';
   action='短い共通コールを決め、全員が同じタイミングで使います。';
   method='・サーブ前に担当範囲を声で確認する\n・返球後はセッターへ必ずコールする\n・1セットごとに声掛けができた場面を1つ振り返る';
 }else if(/ミドル|クイック|速攻/.test(joined)){
   issue='ミドル攻撃を使う条件とタイミングが共有されず、攻撃がサイドへ偏っています。';
   action='返球と相手ブロックの状態を見て、使うクイックを事前に共有します。';
   method='・レセプション返球をセッター前1m以内へ集める\n・各ローテーションで最初の良い返球はミドルを選択肢に入れる\n・相手ミドルの位置を見てA・Bクイックを使い分ける';
 }else if(/レセプション|サーブレシーブ|返球/.test(joined)){
   issue='レセプションが乱れた時に役割と返球目標が揃わず、攻撃の選択肢が減っています。';
   action='担当範囲と返球目標を統一し、乱れた後の次の一手まで準備します。';
   method='・サーブ前に前後左右の担当を確認する\n・返球目標をセッター前へ統一する\n・乱れた返球から切り返す練習を連続5本行う';
 }else if(/サーブ/.test(joined)){
   issue='狙いと目的が曖昧なままサーブを打ち、相手を崩す確率が安定していません。';
   action='コースと狙う相手を決めてから、同じルーティンで打ちます。';
   method='・打つ前に狙うゾーンを声か指で確認する\n・練習で同じコースへ10本中何本入るか記録する\n・試合では相手の苦手な選手か連携の間を優先する';
 }
 return {issue,action,method};
}
function parseActionPlan(summary,m){
 const fallback=buildActionPlan(m);
 if(!summary) return fallback;
 const get=(label,next)=>{
   const marker=`【${label}】`;
   const start=summary.indexOf(marker);
   if(start<0) return '';
   const from=start+marker.length;
   const end=next?summary.indexOf(`【${next}】`,from):-1;
   return summary.slice(from,end<0?undefined:end).trim();
 };
 return {issue:get('課題','行動')||fallback.issue,action:get('行動','方法')||fallback.action,method:get('方法','元の発言')||fallback.method};
}
function makeSummary(m){
 const theme=m.theme||'今回のテーマ';
 const plan=buildActionPlan(m);
 const points=(m.entries||[]).length ? m.entries.slice(0,20).map((e,i)=>`${i+1}. ${e.text}（${e.name}）`).join('\n') : 'まだ意見はありません。';
 const categoryLabel=themeCategoryLabel(m.type,m.themeCategory||'');
 return `分類：${categoryLabel||'未選択'}\nテーマ：${theme}\n\n【課題】\n${plan.issue}\n\n【行動】\n${plan.action}\n\n【方法】\n${plan.method}\n\n【元の発言】\n${points}`;
}
function composeSummary(){
 const m=getCurrent();
 if(!m) return '';
 const plan=parseActionPlan(m.summary || makeSummary(m),m);
 const points=(m.entries||[]).length ? m.entries.map((e,i)=>`${i+1}. ${e.text}（${e.name}）`).join('\n') : 'まだ意見はありません。';
 const categoryLabel=themeCategoryLabel(m.type,m.themeCategory||'');
 return `分類：${categoryLabel||'未選択'}\nテーマ：${m.theme||'今回のテーマ'}\n\n【課題】\n${plan.issue}\n\n【行動】\n${plan.action}\n\n【方法】\n${plan.method}\n\n【元の発言】\n${points}`;
}
function openSummary(){state.view='summary';render()}
function finalize(){const m=getCurrent();if(!m){toast('ミーティングが見つかりません');return}const s=composeSummary();mutate(item=>{item.summary=s;item.status='closed';item.closedAt=Date.now()});state.view='meetings';render();toast('ミーティングを保存しました')}
function resume(id){state.currentMeetingId=id;const m=getCurrent();state.view=m?.status==='closed'?'summary':'room';render()}
function switchTeam(teamId){
 const account=loadAccounts().find(a=>a.teamId===teamId);
 if(!account){toast('保存したチームが見つかりません');return}
 localStorage.setItem('tt_active_team',teamId);
 write('tt_account',account);
 state.selectedType=null; state.selectedGroup=null; state.currentMeetingId=null; state.view='home'; render();
}
function goTop(){ state.selectedType=null; state.selectedGroup=null; state.currentMeetingId=null; state.view='welcome'; render(); }
function go(v){state.view=v;render()}
function resetAll(){
 const active=loadAccount();
 if(!active) return goTop();
 if(confirm(`「${active.teamName}」の端末登録と、このチームの試作データを削除しますか？`)){
   const accounts=loadAccounts().filter(a=>a.teamId!==active.teamId);
   write('tt_accounts',accounts);
   const meetings=loadMeetings().filter(m=>m.teamId!==active.teamId);
   saveMeetings(meetings);
   if(accounts.length){ localStorage.setItem('tt_active_team',accounts[0].teamId); write('tt_account',accounts[0]); }
   else { localStorage.removeItem('tt_active_team'); localStorage.removeItem('tt_account'); }
   state.currentMeetingId=null;state.view='welcome';render();
 }
}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),1800)}

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js?v=0.39.3', { updateViaCache: 'none' })
    .then(reg => {
      reg.update().catch(()=>{});
      setInterval(() => reg.update().catch(()=>{}), 60 * 1000);
    })
    .catch(()=>{});
}
render();

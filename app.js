const state = {
  view: 'welcome',
  selectedType: null,
  selectedGroup: null,
  currentMeetingId: null,
  directorIssueId: null,
  directorIssueTab: 'open',
  notificationFilter: 'all',
  growthRange: 30,
  growthMetric: 'score',
  growthCompare: 'all',
};

const TYPES = {
  position: {label:'ポジション別ミーティング', icon:'🏐', groups:['セッター','アウトサイドヒッター','オポジット','ミドルブロッカー','リベロ']},
  grade: {label:'学年別ミーティング', icon:'🎓', groups:['1年','2年','3年']},
  all: {label:'全体ミーティング', icon:'🤝', groups:['チーム全員']},
};
const ROLES = ['監督','コーチ','マネージャー','キャプテン','副キャプテン','選手'];
const POSITIONS = ['未設定','セッター','アウトサイドヒッター','オポジット','ミドルブロッカー','リベロ','スタッフ'];
const GRADES = ['未設定','1年','2年','3年','対象外'];
const CATEGORIES = ['未設定','中学','高校','大学','クラブ'];
const TEAM_LEVELS = ['未設定','初心者','地区大会','県大会','全国大会'];
const DOMINANT_HANDS = ['未設定','右','左','両方'];

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


const ALIA_THEME_DOMAINS = [
  {id:'volleyball_skill', label:'技術', keywords:/トス|セッター|ミドル|クイック|速攻|レセプション|サーブレシーブ|返球|サーブ|スパイク|アタック|ブロック|ディグ|レシーブ|フォーム|助走|打点/},
  {id:'volleyball_tactics', label:'戦術・判断', keywords:/戦術|配球|判断|ローテーション|相手ブロック|攻撃|守備|コンビ|コース|ゲームプラン/},
  {id:'mental', label:'メンタル', keywords:/緊張|不安|プレッシャー|自信|集中|気持ち|失敗が怖い|切り替え/},
  {id:'teamwork', label:'チームワーク', keywords:/声|連携|コミュニケーション|雰囲気|仲間|協力|役割|信頼|伝え方|聞き方/},
  {id:'leadership', label:'リーダーシップ', keywords:/キャプテン|副キャプテン|リーダー|引っ張る|まとめる|率先|指示/},
  {id:'life', label:'学校生活・私生活', keywords:/私生活|生活習慣|生活態度|遅刻|夜更かし|スマホ|整理整頓|身だしなみ|挨拶/},
  {id:'study', label:'勉強・両立', keywords:/勉強|学習|宿題|テスト|進路|両立|授業|提出物/},
  {id:'conditioning', label:'コンディショニング', keywords:/睡眠|疲れ|疲労|休養|回復|体調|食事|栄養|水分|痛み|ケガ|怪我/},
  {id:'goal', label:'目標・振り返り', keywords:/目標|大会|振り返り|反省|成長|達成|計画|次回/}
];


function positionKeyForMeeting(m){
  if(m?.type!=='position') return '';
  const group=m?.group||'';
  if(/セッター/.test(group)) return 'setter';
  if(/ミドル/.test(group)) return 'middle';
  if(/アウトサイド|OH|レフト/.test(group)) return 'outside';
  if(/オポジット|OP|ライト/.test(group)) return 'opposite';
  if(/リベロ/.test(group)) return 'libero';
  return '';
}
function positionLabelForKey(key){
  return ({setter:'セッター',middle:'ミドルブロッカー',outside:'アウトサイドヒッター',opposite:'オポジット',libero:'リベロ'})[key]||'';
}
function positionPlanOverride(m,joined,theme){
  const key=positionKeyForMeeting(m);
  if(!key) return null;
  const isMiddle=/ミドル|クイック|速攻/.test(`${theme} ${joined}`);
  const isReception=/レセプション|サーブレシーブ|返球/.test(`${theme} ${joined}`);
  const isBlock=/ブロック/.test(`${theme} ${joined}`);
  const isServe=/サーブ/.test(`${theme} ${joined}`);
  const isAttack=/スパイク|アタック|決定率/.test(`${theme} ${joined}`);
  const isSet=/トス|配球|セッター/.test(`${theme} ${joined}`);
  if(key==='setter'){
    if(isMiddle) return {
      issue:'良い返球でもミドルを使う条件が曖昧で、配球がサイドへ偏っています。',
      action:'返球位置と相手ミドルの動きを見て、序盤からミドルを選択肢に入れます。',
      method:`・Aパス時は各ローテーション最初の3本以内にミドルを1回使う
・相手ミドルが中央に残るか外へ寄るかをトス前に確認する
・ローテーション別のミドル配球数と決定率を試合後に確認する`
    };
    if(isSet) return {
      issue:'配球判断とトス精度の基準が揃わず、攻撃の選択肢が狭くなっています。',
      action:'返球前に第一候補と第二候補を決め、同じ構えから複数方向へ配球します。',
      method:`・同じ構えからレフト・ライト・ミドルへ各10本上げる
・返球前に相手ブロックと味方の助走を一度確認する
・ローテーション別の配球本数と決定率を記録する`
    };
  }
  if(key==='middle'){
    if(isMiddle || isSet) return {
      issue:'助走開始とセッターへの合図が揃わず、ミドルを使えるタイミングが減っています。',
      action:'返球と同時に助走準備へ入り、セッターと攻撃テンポを共有します。',
      method:`・A・Bクイックを各10本、助走開始の合図を決めて合わせる
・良い返球時は毎回助走に入り、おとりでも中央を引きつける
・打てた本数だけでなく助走に入れた回数も記録する`
    };
    if(isBlock) return {
      issue:'相手セッターとアタッカーを見る順番が定まらず、ブロックの移動が遅れています。',
      action:'返球・セッター・助走の順に視線を移し、基準位置から早く動きます。',
      method:`・台上練習で返球からトス方向を判断する反復を10本行う
・隣のブロッカーと止めるコースをサーブ前に共有する
・タッチ本数と抜かれたコースをローテーション別に記録する`
    };
  }
  if(key==='outside'){
    if(isMiddle) return {
      issue:'ミドルが使われない場面で相手ブロックがサイドへ集まり、打てるコースが狭くなっています。',
      action:'ミドルの助走を生かし、ブロックの寄りを見て打ち方を選びます。',
      method:`・ミドルが助走に入った状態からサイド攻撃を各コース5本ずつ打つ
・相手ミドルが残ればストレート、寄ればブロックアウトも選ぶ
・ミドル使用後のサイド決定率を確認する`
    };
    if(isReception) return {
      issue:'レセプション後の助走準備が遅れ、攻撃参加のタイミングがずれています。',
      action:'返球後すぐに助走開始位置へ戻り、攻撃までを一連の動作にします。',
      method:`・レセプションからスパイクまでを5本連続で行う
・返球後の最初の一歩を決めて助走位置へ戻る
・Aパス時の攻撃参加率と決定率を確認する`
    };
  }
  if(key==='opposite'){
    if(isMiddle || isAttack) return {
      issue:'ミドルとの連動が少なく、ライト攻撃とバックアタックの選択が単調になっています。',
      action:'ミドルの動きに合わせて、ライト・時間差・バックアタックを使い分けます。',
      method:`・ミドルとの時間差とライト攻撃を各10本合わせる
・相手ブロックが中央に残ればライト、外へ寄ればバックアタックを選ぶ
・ローテーション別の攻撃本数と決定率を確認する`
    };
    if(isBlock) return {
      issue:'相手レフトへのブロック位置が安定せず、ストレートとクロスの役割が曖昧です。',
      action:'隣のミドルと基準位置を合わせ、止めるコースを明確にします。',
      method:`・相手助走に合わせて基準位置から移動する練習を10本行う
・サーブ前にストレートを閉めるかクロスを優先するか共有する
・タッチと抜かれたコースをセットごとに確認する`
    };
  }
  if(key==='libero'){
    if(isMiddle || isReception) return {
      issue:'ミドルを使える返球位置が安定せず、攻撃の選択肢がサイドへ偏っています。',
      action:'セッターが前後に大きく動かずミドルを選べる返球を増やします。',
      method:`・ネットから約1m、セッター前を目標に同じ球種を5本連続で返す
・サーブ前に担当範囲と短い球への対応を確認する
・Aパス率と、その後にミドルを使えた本数を確認する`
    };
    if(isServe) return {
      issue:'相手サーブの球種と狙いを共有できず、受ける位置の修正が遅れています。',
      action:'サーバーの特徴を短い言葉で共有し、全員の守備位置を早めに調整します。',
      method:`・サーバーごとに球種と狙われやすい場所を記録する
・サーブ前に「短い・深い・間」を一言で共有する
・失点後に位置を半歩単位で修正する`
    };
  }
  return null;
}

function gradeKeyForMeeting(m){
  const raw=m?.type==='grade' ? (m?.group||'') : (m?.ownerGrade||loadAccount()?.grade||'');
  if(/1年/.test(raw)) return 'grade1';
  if(/2年/.test(raw)) return 'grade2';
  if(/3年/.test(raw)) return 'grade3';
  return '';
}
function gradeLabelForKey(key){
  return ({grade1:'1年生',grade2:'2年生',grade3:'3年生'})[key]||'';
}
function applyGradePerspective(m,plan){
  const key=gradeKeyForMeeting(m);
  if(!key || !plan) return plan;
  const lines=String(plan.method||'').split(/\n+/).filter(Boolean).map(x=>x.startsWith('・')?x:`・${x}`);
  if(key==='grade1'){
    return {
      issue:`${plan.issue} 1年生は遠慮や経験不足で、分からないことを抱え込みやすい点にも注意が必要です。`,
      action:`${plan.action} まずは自分から一度動き、分からない点をその日のうちに確認します。`,
      method:[...lines.slice(0,2),'・練習後に「できたこと1つ・質問1つ」を先輩か指導者へ伝える'].join('\n')
    };
  }
  if(key==='grade2'){
    return {
      issue:`${plan.issue} 2年生は自分の実行だけでなく、下級生を支える中核としての働きかけが求められます。`,
      action:`${plan.action} 自分が実行した後、1年生にも同じ基準を短く伝えます。`,
      method:[...lines.slice(0,2),'・練習中に1年生1人へ具体的な声掛けを行い、終了後に伝わったか確認する'].join('\n')
    };
  }
  return {
    issue:`${plan.issue} 3年生は個人の改善を、チーム全体で再現できる形へ広げる必要があります。`,
    action:`${plan.action} 判断基準を言葉にし、全員が同じ行動を選べる状態をつくります。`,
    method:[...lines.slice(0,2),'・練習前に基準を30秒で共有し、終了後に次回も続ける行動を1つ決める'].join('\n')
  };
}
function gradeAwareSections(m,sections){
  const key=gradeKeyForMeeting(m);
  if(!key) return sections;
  const extra={
    grade1:'分からない点はその日のうちに質問し、小さな成功を1つ記録します。',
    grade2:'自分の実行後に1年生へ伝え、相手が再現できたか確認します。',
    grade3:'基準を短く言語化して全体へ共有し、次回へ引き継ぎます。'
  }[key];
  return sections.map((x,i)=>i===sections.length-1?{...x,text:`${x.text} ${extra}`} : x);
}
function classifyAliaContext(m){
  const theme=(m?.theme||'').trim();
  const voices=(m?.entries||[]).map(e=>e?.text||'').join(' ');
  const text=`${theme} ${voices}`;
  const selected=m?.themeCategory||'';
  const categoryMap={
    technique:'volleyball_skill', tactics:'volleyball_tactics', coordination:'teamwork', mental:'mental', conditioning:'conditioning',
    role:'leadership', life:'life', time:'study', relationship:'teamwork', goal:'goal',
    team_issue:'teamwork', teamwork:'teamwork', rule:'teamwork'
  };
  let domainId=categoryMap[selected]||'';
  let confidence=selected && selected!=='other' ? 0.85 : 0.45;
  if(!domainId || selected==='other'){
    let best=null; let bestScore=0;
    for(const domain of ALIA_THEME_DOMAINS){
      const hits=(text.match(new RegExp(domain.keywords.source,'g'))||[]).length;
      if(hits>bestScore){ bestScore=hits; best=domain; }
    }
    if(best){ domainId=best.id; confidence=Math.min(0.95,0.55+bestScore*0.12); }
  }
  if(!domainId){
    domainId=m?.type==='position'?'volleyball_skill':m?.type==='grade'?'teamwork':'goal';
    confidence=0.4;
  }
  const domain=ALIA_THEME_DOMAINS.find(d=>d.id===domainId)||ALIA_THEME_DOMAINS[0];
  const account=loadAccount()||{};
  const gradeText=m?.type==='grade'?(m.group||'未設定'):(m?.ownerGrade||account.grade||'未設定');
  const positionText=m?.type==='position'?(m.group||'未設定'):(m?.ownerPosition||account.position||'未設定');
  const audience=m?.type==='all'?'対象：チーム全体':`対象：${positionText}・${gradeText}`;
  const level=aliaTeamLevel(account);
  return {domainId:domain.id, domainLabel:domain.label, confidence, audience, source:selected&&selected!=='other'?'選択テーマ':'内容判定', levelId:level.id, levelLabel:level.label, meetingType:m?.type||'all'};
}



function getAliaPrefs(){
  const p=getUiPrefs();
  return {
    level:p.aliaLevel||'標準',
    detail:p.aliaDetail||'標準',
    notify:!!p.aliaNotify
  };
}
function aliaTeamLevel(account){
  const pref=getAliaPrefs().level;
  if(pref==='やさしい') return {id:'beginner',label:'やさしい'};
  if(pref==='専門的') return {id:'advanced',label:'専門的'};
  const raw=String(account?.teamLevel||account?.level||'').toLowerCase();
  if(/全国|elite|advanced|強豪/.test(raw)) return {id:'advanced',label:'競技志向'};
  if(/県|intermediate|中級/.test(raw)) return {id:'intermediate',label:'中級'};
  if(/初心|beginner|初級/.test(raw)) return {id:'beginner',label:'初心者'};
  return {id:'standard',label:'標準'};
}
function aliaEvidence(m,ctx){
  const domain=ctx?.domainId||'goal';
  const common={
    volleyball_skill:['反復は回数だけでなく、成功条件と判断基準を決めて行う。','試合に近い状況で練習し、実行結果を記録して次の練習へつなげる。'],
    strategy:['相手・自分たちの条件を観察し、使う場面を事前に共有する。','実行回数と結果を記録し、次の判断基準を更新する。'],
    mental:['緊張を消すのではなく、呼吸やルーティンで注意を自分が操作できる行動へ戻す。','本番に近い状況を段階的に経験し、振り返りで再現できた行動を確認する。'],
    lifestyle:['一度に多く変えず、記録できる小さな行動を1つ決めて継続日数を確認する。','睡眠・食事・時間管理は、普段の状態を記録してから無理のない改善を行う。'],
    teamwork:['役割・合図・確認するタイミングを具体的に決め、全員が同じ言葉で実行する。','発言者だけでなく、聞き手の復唱や確認も行動として決める。'],
    conditioning:['安全性を優先し、普段から試していない補給法や成分を本番だけで使わない。','体調や摂取内容を記録し、必要に応じて保護者・指導者・専門職へ相談する。'],
    goal:['目標を行動へ分解し、期限・回数・確認方法を決める。','短い周期で振り返り、続けるか方法を変えるかをチームで判断する。']
  };
  return common[domain]||common.goal;
}
function toggleAliaEvidence(){
  const el=document.getElementById('alia-evidence');
  const btn=document.getElementById('alia-evidence-btn');
  if(!el) return;
  el.hidden=!el.hidden;
  if(btn) btn.textContent=el.hidden?'根拠を見る':'根拠を閉じる';
}

function read(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback} }
function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
let ttSupabase=null;
function cloudConfigured(){
  const c=window.TEAM_THEORY_SUPABASE||{};
  return !!(window.supabase&&c.url&&c.anonKey&& !c.anonKey.includes('PASTE_'));
}
function cloudClient(){
  if(!cloudConfigured()) return null;
  if(!ttSupabase) ttSupabase=window.supabase.createClient(window.TEAM_THEORY_SUPABASE.url,window.TEAM_THEORY_SUPABASE.anonKey);
  return ttSupabase;
}
async function ensureCloudSession(){
  const c=cloudClient(); if(!c) return null;
  const current=await c.auth.getSession();
  if(current.error) throw current.error;
  if(current.data.session) return current.data.session;
  const signed=await c.auth.signInAnonymously();
  if(signed.error) throw signed.error;
  return signed.data.session;
}
function cloudErrorMessage(error){
  const msg=String(error?.message||error||'');
  if(/anonymous|Anonymous/i.test(msg)) return 'Supabaseで匿名ログインを有効にしてください。';
  if(/Failed to fetch|NetworkError|fetch/i.test(msg)) return 'クラウドへ接続できません。通信状態を確認してください。';
  if(/row-level security|permission|policy/i.test(msg)) return 'クラウドのアクセス権限設定を確認してください。';
  return msg || 'クラウド処理に失敗しました。';
}
function upsertLocalMemberFromAccount(account){
  const members=loadMembers();
  const existing=members.find(m=>m.teamId===account.teamId && m.isCurrent);
  const values={displayName:account.displayName,role:account.role,position:account.position,grade:account.grade};
  if(existing) Object.assign(existing,values);
  else members.push({id:uid('mem'),teamId:account.teamId,...values,number:'',dominantHand:'未設定',captainRole:(account.role==='キャプテン'||account.role==='副キャプテン')?account.role:'なし',createdAt:account.joinedAt||Date.now(),isCurrent:true});
  saveMembers(members);
}
async function loadCloudAccounts(){
  const c=cloudClient();
  if(!c) return [];
  const session=await ensureCloudSession();
  const userId=session?.user?.id;
  if(!userId) return [];
  const result=await c.from('team_members')
    .select('team_id,display_name,role,position,grade,status,joined_at,teams(id,name,school_name,category,team_level,invite_code,owner_id,created_at,meeting_policy,meeting_show_active,meeting_content_scope,meeting_response_scope,meeting_alia_scope)')
    .eq('user_id',userId)
    .eq('status','active');
  if(result.error) throw result.error;
  const accounts=(result.data||[]).filter(row=>row.teams).map(row=>({
    teamId:row.teams.id,
    inviteCode:row.teams.invite_code,
    teamName:row.teams.name,
    schoolName:row.teams.school_name||'',
    category:row.teams.category||'未設定',
    teamLevel:row.teams.team_level||'未設定',
    meetingPolicy:row.teams.meeting_policy||'standard',
    meetingShowActive:row.teams.meeting_show_active!==false,
    meetingContentScope:row.teams.meeting_content_scope||'target',
    meetingResponseScope:row.teams.meeting_response_scope||'target',
    meetingAliaScope:row.teams.meeting_alia_scope||'all',
    displayName:row.display_name,
    role:row.role||'選手',
    position:row.position||'未設定',
    grade:row.grade||'未設定',
    createdAt:row.teams.created_at?new Date(row.teams.created_at).getTime():Date.now(),
    joinedAt:row.joined_at?new Date(row.joined_at).getTime():Date.now(),
    isOwner:row.teams.owner_id===userId,
    cloud:true
  }));
  if(accounts.length){
    const locals=loadAccounts();
    const cloudIds=new Set(accounts.map(a=>a.teamId));
    const merged=[...locals.filter(a=>!a.cloud && !cloudIds.has(a.teamId)),...accounts];
    write('tt_accounts',merged);
    const activeId=localStorage.getItem('tt_active_team');
    const active=merged.find(a=>a.teamId===activeId)||accounts[0];
    if(active){ write('tt_account',active); localStorage.setItem('tt_active_team',active.teamId); }
    accounts.forEach(upsertLocalMemberFromAccount);
  }
  return accounts;
}
async function loadCloudTeamMembers(teamId=loadAccount()?.teamId){
  const c=cloudClient();
  if(!c || !teamId) return [];
  await ensureCloudSession();
  const result=await c.from('team_members')
    .select('id,team_id,user_id,display_name,role,position,grade,status,joined_at,number,dominant_hand,captain_role')
    .eq('team_id',teamId)
    .eq('status','active')
    .order('joined_at',{ascending:true});
  if(result.error) throw result.error;
  const currentUser=(await c.auth.getUser()).data.user;
  const cloudMembers=(result.data||[]).map(row=>({
    id:row.id,
    cloudId:row.id,
    teamId:row.team_id,
    userId:row.user_id,
    displayName:row.display_name,
    role:row.role||'選手',
    position:row.position||'未設定',
    grade:row.grade||'未設定',
    number:row.number||'',
    dominantHand:row.dominant_hand||'未設定',
    captainRole:row.captain_role||'なし',
    createdAt:row.joined_at?new Date(row.joined_at).getTime():Date.now(),
    isCurrent:row.user_id===currentUser?.id,
    cloud:true
  }));
  // クラウドチームでは、同じチームに残っている旧ローカルメンバーを除去し、
  // SupabaseのUUIDを持つ最新データだけで置き換える。
  const all=loadMembers().filter(m=>m.teamId!==teamId);
  saveMembers([...all,...cloudMembers]);
  return cloudMembers;
}
function isUuid(value=''){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}
async function resolveCloudMemberId(member){
  const c=cloudClient();
  const a=loadAccount();
  if(!c || !a?.cloud) return '';
  const direct=[member?.cloudId,member?.id].find(isUuid);
  if(direct) return direct;
  const session=await ensureCloudSession();
  let userId=member?.userId||'';
  if(!userId && member?.isCurrent) userId=session?.user?.id||'';
  if(!userId && member?.teamId===a.teamId && member?.displayName===a.displayName) userId=session?.user?.id||'';
  if(!userId) return '';
  const found=await c.from('team_members')
    .select('id')
    .eq('team_id',member?.teamId||a.teamId)
    .eq('user_id',userId)
    .eq('status','active')
    .maybeSingle();
  if(found.error) throw found.error;
  return found.data?.id||'';
}
async function saveCloudMember(member){
  const c=cloudClient();
  const a=loadAccount();
  if(!c || !a?.cloud) throw new Error('クラウド接続を確認できません。');
  await ensureCloudSession();
  const rowId=await resolveCloudMemberId(member);
  if(!rowId) throw new Error('クラウドメンバーUUIDを確認できません。最新情報を取得してから再度お試しください。');
  const payload={
    display_name:member.displayName,
    role:member.role,
    position:member.position||'未設定',
    grade:member.grade||'未設定',
    number:member.number||'',
    dominant_hand:member.dominantHand||'未設定',
    captain_role:member.captainRole||'なし'
  };
  console.info('TEAM Theory member update request',rowId,payload);
  const updatePromise=c.from('team_members')
    .update(payload)
    .eq('id',rowId)
    .select('id,team_id,user_id,display_name,role,position,grade,status,joined_at,number,dominant_hand,captain_role')
    .maybeSingle();
  const timeoutPromise=new Promise((_,reject)=>setTimeout(()=>reject(new Error('メンバー保存がタイムアウトしました。')),12000));
  const result=await Promise.race([updatePromise,timeoutPromise]);
  if(result.error) throw result.error;
  if(!result.data) throw new Error('更新対象のメンバーを確認できません。');
  console.info('TEAM Theory member update succeeded',result.data.id);
  return result.data;
}
async function deleteCloudMember(member){
  const c=cloudClient();
  const a=loadAccount();
  if(!c || !a?.cloud || !member?.cloudId) return;
  await ensureCloudSession();
  const result=await c.from('team_members').update({status:'inactive'}).eq('id',member.cloudId);
  if(result.error) throw result.error;
}

let cloudMeetingSyncTimer=null;
let cloudMeetingSyncing=false;
function normalizeCloudMeetingPayload(payload){
  if(!payload || typeof payload!=='object') return null;
  return {...payload, entries:Array.isArray(payload.entries)?payload.entries:[]};
}
async function loadCloudMeetings(teamId=loadAccount()?.teamId){
  const c=cloudClient(),a=loadAccount();
  if(!c || !a?.cloud || !teamId) return [];
  await ensureCloudSession();
  const result=await c.from('team_meetings').select('id,payload,created_by,updated_at').eq('team_id',teamId).order('updated_at',{ascending:true});
  if(result.error) throw result.error;
  const cloud=(result.data||[]).map(row=>{
    const m=normalizeCloudMeetingPayload(row.payload)||{};
    return {...m,id:row.id,teamId,createdByUserId:m.createdByUserId||row.created_by||'',cloud:true,updatedAt:row.updated_at?new Date(row.updated_at).getTime():(m.updatedAt||m.closedAt||m.createdAt||Date.now())};
  });
  const all=loadMeetings();
  const others=all.filter(m=>m.teamId!==teamId);
  const map=new Map();
  [...all.filter(m=>m.teamId===teamId),...cloud].forEach(m=>{
    const prev=map.get(m.id);
    const stamp=m.updatedAt||m.closedAt||m.createdAt||0;
    const prevStamp=prev?(prev.updatedAt||prev.closedAt||prev.createdAt||0):-1;
    if(!prev || stamp>=prevStamp) map.set(m.id,m);
  });
  const merged=[...others,...map.values()];
  write('tt_meetings',merged);write('tt_meetings_backup',merged);
  return cloud;
}
async function syncCloudMeetings(meetings=loadMeetings()){
  if(cloudMeetingSyncing) return;
  const c=cloudClient(),a=loadAccount();
  if(!c || !a?.cloud || !a.teamId) return;
  cloudMeetingSyncing=true;
  try{
    await ensureCloudSession();
    const rows=meetings.filter(m=>m.teamId===a.teamId).map(m=>({
      id:String(m.id),team_id:a.teamId,created_by:m.createdByUserId||currentTeamMembers().find(x=>x.isCurrent)?.userId||null,payload:{...m,cloud:true},updated_at:new Date(m.updatedAt||m.closedAt||m.createdAt||Date.now()).toISOString()
    }));
    if(rows.length){const result=await c.from('team_meetings').upsert(rows,{onConflict:'id'});if(result.error)throw result.error;}
  }catch(error){console.error('syncCloudMeetings failed',error)}
  finally{cloudMeetingSyncing=false}
}
function scheduleCloudMeetingsSync(meetings){
  clearTimeout(cloudMeetingSyncTimer);
  cloudMeetingSyncTimer=setTimeout(()=>syncCloudMeetings(meetings),450);
}
async function deleteCloudMeeting(id){
  const c=cloudClient(),a=loadAccount();if(!c||!a?.cloud||!id)return;
  try{await ensureCloudSession();const result=await c.from('team_meetings').delete().eq('id',String(id)).eq('team_id',a.teamId);if(result.error)throw result.error;}
  catch(error){console.error('deleteCloudMeeting failed',error);toast(cloudErrorMessage(error));}
}

let teamRealtimeChannel=null;
let cloudRefreshTimer=null;
let cloudRefreshRunning=false;
function isEditingFormActive(){
  const el=document.activeElement;
  return !!el && ['INPUT','TEXTAREA','SELECT'].includes(el.tagName);
}
async function refreshCloudData({renderAfter=true,reason='manual'}={}){
  if(cloudRefreshRunning || !cloudConfigured()) return;
  const a=loadAccount();
  if(!a?.cloud) return;
  cloudRefreshRunning=true;
  try{
    await ensureCloudSession();
    await Promise.all([
      loadCloudAccounts(),
      loadCloudTeamMembers(a.teamId),
      loadCloudDirectorIssues(),
      loadCloudMeetings(a.teamId)
    ]);
    if(renderAfter && !isEditingFormActive()) render();
    console.info('TEAM Theory cloud refreshed',reason);
  }catch(error){
    console.error('TEAM Theory cloud refresh failed',reason,error);
  }finally{
    cloudRefreshRunning=false;
  }
}
function scheduleCloudRefresh(reason='realtime'){
  clearTimeout(cloudRefreshTimer);
  cloudRefreshTimer=setTimeout(()=>refreshCloudData({renderAfter:true,reason}),350);
}
function stopTeamRealtime(){
  const c=cloudClient();
  if(teamRealtimeChannel&&c){ try{c.removeChannel(teamRealtimeChannel)}catch(_){} }
  teamRealtimeChannel=null;
}
function startTeamRealtime(){
  const c=cloudClient(),a=loadAccount();
  if(!c||!a?.cloud||!a.teamId) return;
  stopTeamRealtime();
  const teamId=a.teamId;
  teamRealtimeChannel=c.channel(`team-theory-${teamId}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'team_meetings',filter:`team_id=eq.${teamId}`},()=>scheduleCloudRefresh('meeting realtime'))
    .on('postgres_changes',{event:'*',schema:'public',table:'director_issues',filter:`team_id=eq.${teamId}`},()=>scheduleCloudRefresh('issue realtime'))
    .on('postgres_changes',{event:'*',schema:'public',table:'director_issue_responses'},()=>scheduleCloudRefresh('response realtime'))
    .on('postgres_changes',{event:'*',schema:'public',table:'team_members',filter:`team_id=eq.${teamId}`},()=>scheduleCloudRefresh('member realtime'))
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'teams',filter:`id=eq.${teamId}`},()=>scheduleCloudRefresh('team settings realtime'))
    .subscribe(status=>console.info('TEAM Theory realtime',status));
}
async function initializeCloud(){
  if(!cloudConfigured()) return;
  try{
    await ensureCloudSession();
    const before=JSON.stringify(loadAccounts());
    await loadCloudAccounts();
    await loadCloudTeamMembers();
    await loadCloudDirectorIssues();
    await loadCloudMeetings();
    startTeamRealtime();
    if(JSON.stringify(loadAccounts())!==before) render();
    console.info('TEAM Theory cloud ready');
  }catch(error){
    console.error('TEAM Theory cloud initialization failed',error);
  }
}

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
  const deletedIds=new Set(read('tt_deleted_meeting_ids', []));
  const merged=[]; const seen=new Set();
  [...primary,...recovered].forEach(m=>{
    if(m?.id && deletedIds.has(m.id)) return;
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
  scheduleCloudMeetingsSync(v);
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

function loadMembers(){
  const all=read('tt_members',[]);
  const accounts=loadAccounts();
  let changed=false;
  accounts.forEach(a=>{
    if(!all.some(m=>m.teamId===a.teamId && m.displayName===a.displayName)){
      all.push({id:uid('mem'),teamId:a.teamId,displayName:a.displayName,role:a.role||'選手',position:a.position||'未設定',grade:a.grade||'未設定',number:'',dominantHand:'未設定',captainRole:(a.role==='キャプテン'||a.role==='副キャプテン')?a.role:'なし',createdAt:a.createdAt||Date.now(),isCurrent:true});
      changed=true;
    }
  });
  if(changed) write('tt_members',all);
  return all;
}
function saveMembers(v){write('tt_members',v)}
function currentTeamMembers(){const a=loadAccount();return a?loadMembers().filter(m=>m.teamId===a.teamId):[]}
function optionList(values,selected='未設定'){return values.map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('')}
function canManageMembers(){
 const a=loadAccount();
 if(!a) return false;
 const manageable=['監督','コーチ','マネージャー','キャプテン'];
 const me=currentTeamMembers().find(m=>m.isCurrent);
 return a.isOwner===true || manageable.includes(a.role||'') || manageable.includes(me?.role||'');
}
function currentCloudUserId(){
 const me=currentTeamMembers().find(m=>m.isCurrent);
 return String(me?.userId||'');
}
function isMeetingCreator(meeting){
 const userId=currentCloudUserId();
 if(userId && meeting?.createdByUserId) return userId===String(meeting.createdByUserId);
 const a=loadAccount();
 return !meeting?.createdByUserId && !!a && meeting?.ownerName===a.displayName;
}
function canEndMeeting(meeting){
 const a=loadAccount();
 const me=currentTeamMembers().find(m=>m.isCurrent);
 const role=me?.role||a?.role||'';
 return isMeetingCreator(meeting) || a?.isOwner===true || ['監督','コーチ'].includes(role);
}
function canDeleteMeeting(meeting){
 const a=loadAccount();
 const me=currentTeamMembers().find(m=>m.isCurrent);
 const role=me?.role||a?.role||'';
 return isMeetingCreator(meeting) || a?.isOwner===true || role==='監督';
}
function canRenameMeeting(meeting){ return canEndMeeting(meeting); }
function isTeamStaff(){
 const a=loadAccount();
 const me=currentTeamMembers().find(m=>m.isCurrent);
 return a?.isOwner===true || ['監督','コーチ','マネージャー'].includes(me?.role||a?.role||'');
}
function meetingPolicy(){
 const a=loadAccount()||{};
 const preset=a.meetingPolicy||'standard';
 const presets={
  open:{showActive:true,content:'all',responses:'all',alia:'all'},
  standard:{showActive:true,content:'target',responses:'target',alia:'all'},
  closed:{showActive:true,content:'target',responses:'target',alia:'target'}
 };
 return preset==='custom'?{
  showActive:a.meetingShowActive!==false,
  content:a.meetingContentScope||'target',
  responses:a.meetingResponseScope||'target',
  alia:a.meetingAliaScope||'all'
 }:(presets[preset]||presets.standard);
}
function meetingTargetsCurrentUser(meeting){
 if(!meeting || meeting.type==='all' || isTeamStaff()) return true;
 const a=loadAccount()||{};
 if(meeting.type==='grade') return String(a.grade||'')===String(meeting.group||'');
 if(meeting.type==='position') return String(a.position||'')===String(meeting.group||'');
 return false;
}
function canSeeMeetingPresence(meeting){
 const p=meetingPolicy();
 return p.showActive || meetingTargetsCurrentUser(meeting);
}
function canViewMeetingContent(meeting){
 const p=meetingPolicy();
 return p.content==='all' || meetingTargetsCurrentUser(meeting);
}
function canPostMeetingOpinion(meeting){
 const p=meetingPolicy();
 return p.responses==='all' || meetingTargetsCurrentUser(meeting);
}
function canViewMeetingAlia(meeting){
 const p=meetingPolicy();
 return p.alia==='all' || meetingTargetsCurrentUser(meeting);
}
function openMeeting(id){
 const meeting=loadMeetings().find(m=>m.id===id);
 if(!meeting){toast('ミーティングが見つかりません');return}
 if(!canViewMeetingContent(meeting)){
  toast(`${meeting.group||'対象者'}のミーティングです。内容は対象者とスタッフだけ閲覧できます。`);
  return;
 }
 resume(id);
}
function migrateLegacyMeetingOwnership(){
  const accounts=loadAccounts();
  if(!accounts.length) return;
  const meetings=loadMeetings();
  if(!meetings.length) return;
  const validIds=new Set(accounts.map(a=>a.teamId));
  const legacyOwnerId=localStorage.getItem('tt_legacy_history_owner') || accounts[0].teamId;
  const legacyOwner=accounts.find(a=>a.teamId===legacyOwnerId) || accounts[0];
  localStorage.setItem('tt_legacy_history_owner', legacyOwner.teamId);
  let changed=false;
  const migrated=meetings.map(m=>{
    // teamIdを持たない旧履歴だけを、一度だけ最初の保存チームへ移行する。
    // チーム切替のたびに現在チームへ付け替えない。
    if(!m.teamId || !validIds.has(m.teamId)){
      changed=true;
      return {...m,teamId:legacyOwner.teamId,teamName:m.teamName||legacyOwner.teamName};
    }
    if(!m.teamName){
      const owner=accounts.find(a=>a.teamId===m.teamId);
      if(owner){ changed=true; return {...m,teamName:owner.teamName}; }
    }
    return m;
  });
  if(changed) saveMeetings(migrated);
}
function currentTeamMeetings(){
  const active=loadAccount();
  if(!active) return [];
  migrateLegacyMeetingOwnership();
  // 履歴は必ず現在選択中のteamIdだけを表示する。
  return loadMeetings().filter(m=>m.teamId===active.teamId);
}
function uid(prefix='m'){ return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
function teamCode(){ return Math.random().toString(36).replace(/[^a-z0-9]/g,'').slice(0,6).toUpperCase(); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function shell(content, active='home'){
  return `<main class="content content-no-header">${content}</main>
  <nav class="bottom-nav">
    ${nav('home','⌂','ホーム',active)}${nav('history','▤','履歴',active)}${nav('growth','↗','成長',active)}${nav('menu','☰','メニュー',active)}
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
  else if(state.view==='directorIssues') app.innerHTML=shell(directorIssuesView(),'home');
  else if(state.view==='directorIssueCreate') app.innerHTML=shell(directorIssueCreateView(),'home');
  else if(state.view==='directorIssueEdit') app.innerHTML=shell(directorIssueEditView(),'home');
  else if(state.view==='directorIssueDetail') app.innerHTML=shell(directorIssueDetailView(),'home');
  else if(state.view==='notifications') app.innerHTML=shell(notificationCenterView(),'home');
  else if(state.view==='directorDashboard') app.innerHTML=shell(directorDashboardView(),'home');
  else if(state.view==='select') app.innerHTML=shell(selectView(),'home');
  else if(state.view==='room') app.innerHTML=shell(roomView(),'home');
  else if(state.view==='summary') app.innerHTML=shell(summaryView(),'home');
  else if(state.view==='history' || state.view==='meetings') app.innerHTML=shell(historyView(),'history');
  else if(state.view==='growth') app.innerHTML=shell(growthView(),'growth');
  else if(state.view==='members') app.innerHTML=shell(membersView(),'members');
  else if(state.view==='menu') app.innerHTML=shell(menuView(),'menu');
  else if(state.view==='teamInfo') app.innerHTML=shell(teamInfoView(),'menu');
  else if(state.view==='myProfile') app.innerHTML=shell(myProfileView(),'menu');
  else if(state.view==='inviteCode') app.innerHTML=shell(inviteCodeView(),'menu');
  else if(state.view==='dataManagement') app.innerHTML=shell(dataManagementView(),'menu');
  else if(state.view==='aliaSettings') app.innerHTML=shell(aliaSettingsView(),'menu');
  else if(state.view==='displaySettings') app.innerHTML=shell(displaySettingsView(),'menu');
  else if(state.view==='help') app.innerHTML=shell(helpView(),'menu');
  else if(state.view==='appInfo') app.innerHTML=shell(appInfoView(),'menu');
  else if(state.view==='appChangelog') app.innerHTML=shell(appChangelogView(),'menu');
  else if(state.view==='termsOfUse') app.innerHTML=shell(termsOfUseView(),'menu');
  else if(state.view==='privacyPolicy') app.innerHTML=shell(privacyPolicyView(),'menu');
  else app.innerHTML=shell(menuView(),'menu');
}

function inviteCodeFromUrl(){
  try{return String(new URLSearchParams(location.search).get('invite')||'').replace(/\s/g,'').toUpperCase().slice(0,6);}catch(_){return '';}
}
function inviteJoinUrl(){
  const a=loadAccount();
  const code=String(a?.inviteCode||a?.teamCode||'').trim().toUpperCase();
  const url=new URL(location.href);
  url.search=''; url.hash='';
  if(code) url.searchParams.set('invite',code);
  return url.toString();
}
function clearInviteFromUrl(){
  try{const url=new URL(location.href); if(url.searchParams.has('invite')){url.searchParams.delete('invite'); history.replaceState(null,'',url.pathname+(url.search?url.search:'')+url.hash);}}catch(_){}
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
     <img class="alia-character alia-character-v396" src="./icons/alia-standalone.png?v=0.56.2" alt="Alia">
   </div>
   ${savedTeamsView()}
   <div class="welcome-actions">
     <button class="welcome-action create" onclick="go('createTeam')"><span class="action-icon">👥</span><span><b>チームで始める</b><small>新しいチームを作成します。</small></span><span class="action-arrow">›</span></button>
     <button class="welcome-action join" onclick="go('joinTeam')"><span class="action-icon qr-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM18 14h2v2h-2zM14 17h2v3h-2zM17 18h3v2h-3z"/></svg></span><span><b>コードで参加する</b><small>招待コードでチームに参加します。</small></span><span class="action-arrow">›</span></button>
   </div>
   <button class="welcome-utility" onclick="showTopSettingsNotice()"><span class="welcome-utility-icon">⚙</span><span>設定・その他</span><span class="welcome-utility-arrow">›</span></button>
   <div class="alia-support">♥ Aliaがチームの成長をサポートするよ！ ♥</div>
   <div class="welcome-version">Version 0.56.2</div>
 </main>`;
}
function savedTeamsView(){
 const teams=loadAccounts();
 const visible=teams.slice(0,2);
 const rest=teams.length-visible.length;
 const list=teams.length
  ? visible.map(a=>`<button class="saved-team-card" onclick="switchTeam('${a.teamId}')"><span class="saved-team-icon">♟</span><span><b>${esc(a.teamName)}</b><small>${esc(a.displayName)}・${esc(a.role)}</small></span><span class="saved-team-arrow">›</span></button>`).join('')
  : `<div class="saved-team-empty"><span class="saved-team-empty-icon">＋</span><span><b>保存したチームはありません</b><small>「チームで始める」から作成できます。</small></span></div>`;
 return `<section class="saved-teams-panel ${teams.length?'has-teams':'is-empty'}"><div class="saved-teams-head"><div><small>SAVED TEAMS</small><h2>保存したチーム</h2></div><span>${teams.length}件</span></div><div class="saved-teams-list">${list}</div>${rest>0?`<button class="saved-teams-more" onclick="go('menu')">ほか${rest}件を見る ›</button>`:''}</section>`;
}
function showTopSettingsNotice(){alert("設定・その他は、保存したチームを選択すると利用できます。")}
function roleOptions(selected=''){return ROLES.map(r=>`<option value="${r}" ${r===selected?'selected':''}>${r}</option>`).join('')}
function positionOptions(selected='未設定'){return POSITIONS.map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('')}
function gradeOptions(selected='未設定'){return GRADES.map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('')}
function createTeamView(){
 return `<main class="onboarding compact form-onboarding create-team-screen">
   <div class="create-decor create-heart">♥</div><div class="create-decor create-sparkle">✦</div><div class="create-decor create-wing">❧</div>
   <header class="create-team-header"><h1><span>チーム</span>を作る</h1><p class="form-lead">チーム名とあなたの情報を登録します。</p></header>
   <section class="create-team-card">
     <div class="create-field"><label class="create-label"><span class="create-label-icon">♟</span><span>チーム名</span></label><input id="teamName" class="input create-input" placeholder="例：Alia高校"></div><div class="create-field"><label class="create-label"><span class="create-label-icon">🏫</span><span>学校名・団体名</span></label><input id="schoolName" class="input create-input" placeholder="例：宮城県立Alia高校"></div><div class="create-field"><label class="create-label"><span class="create-label-icon">🏷</span><span>カテゴリー</span></label><select id="category" class="input create-input create-select">${optionList(CATEGORIES)}</select></div><div class="create-field"><label class="create-label"><span class="create-label-icon">★</span><span>チームレベル</span></label><select id="teamLevel" class="input create-input create-select">${optionList(TEAM_LEVELS)}</select></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon person-icon">●</span><span>あなたの名前</span></label><input id="displayName" class="input create-input" placeholder="例：Alia"></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon shield-icon">✦</span><span>役割</span></label><select id="role" class="input create-input create-select">${roleOptions()}</select></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon">🏐</span><span>ポジション</span></label><select id="position" class="input create-input create-select">${positionOptions()}</select></div>
     <div class="create-field"><label class="create-label"><span class="create-label-icon">🎓</span><span>学年</span></label><select id="grade" class="input create-input create-select">${gradeOptions()}</select></div>
     <div class="create-alia-zone"><div class="create-alia-bubble">チーム名は<br>後から変更できるよ♪</div><img src="./icons/alia-standalone.png?v=0.56.2" class="create-alia" alt="Alia"></div>
   </section>
   <div class="onboarding-bottom-actions create-bottom-actions"><button class="bottom-action secondary-action" onclick="go('welcome')"><span class="bottom-action-icon home-svg">⌂</span><span>トップ</span></button><button class="bottom-action primary-action" onclick="createTeamAccount()"><span>チームを作成する</span><span class="bottom-action-arrow">›</span></button></div>
 </main>`;
}
function joinTeamView(){
 return `<main class="onboarding compact form-onboarding join-team-screen">
   <span class="join-decor join-heart">♥</span><span class="join-decor join-sparkle">✦</span><span class="join-decor join-wing">ʚ</span>
   <header class="join-team-header"><h1>チームに<span>参加</span></h1><p class="form-lead">招待コードを入力してチームに参加します。</p></header>
   <section class="join-team-card">
     <div class="join-field"><label class="join-label"><span class="join-label-icon code-mark">⌘</span><span>招待コード</span></label><div class="join-code-wrap"><input id="joinCode" class="input join-input join-code-input" maxlength="6" placeholder="ABC123" value="${esc(inviteCodeFromUrl())}" autocomplete="one-time-code" autocapitalize="characters"><span class="join-scan-mark" aria-hidden="true"></span></div><small class="join-help">招待コードはチーム作成者から共有されます。</small></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon person-icon"></span><span>あなたの名前</span></label><input id="joinName" class="input join-input" placeholder="例：Alia"><small class="join-help">チーム内で表示されるあなたの名前です。</small></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon shield-icon">★</span><span>参加時の役割</span></label><div class="input join-input join-role-fixed" aria-readonly="true"><span>選手</span><small>固定</small></div><small class="join-help">安全のため参加時は「選手」で登録されます。監督・コーチ・マネージャーへの変更は、参加後に監督が行います。</small></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon">🏐</span><span>ポジション</span></label><select id="joinPosition" class="input join-input join-select">${positionOptions()}</select></div>
     <div class="join-field"><label class="join-label"><span class="join-label-icon">🎓</span><span>学年</span></label><select id="joinGrade" class="input join-input join-select">${gradeOptions()}</select></div>
     <div class="join-alia-zone"><div class="join-alia-bubble">招待コードは<br>大文字・小文字を<br>気にしなくて<br>大丈夫だよ♪</div><img src="./icons/alia-standalone.png?v=0.56.2" class="join-alia" alt="Alia"></div>
   </section>
   <div class="onboarding-bottom-actions join-bottom-actions"><button class="bottom-action secondary-action" onclick="go('welcome')"><span class="bottom-action-icon">⌂</span><span>トップ</span></button><button class="bottom-action join-action" onclick="joinTeamAccount()"><span>参加する</span><span class="bottom-action-arrow">›</span></button></div>
 </main>`;
}

function formValue(id){
  const el=document.getElementById(id);
  return el ? String(el.value||'').trim() : '';
}
function setActionBusy(button,busy,label='処理中...'){
  if(!button) return;
  if(busy){
    button.dataset.originalHtml=button.innerHTML;
    button.disabled=true;
    button.classList.add('is-busy');
    button.innerHTML=`<span>${label}</span>`;
  }else{
    button.disabled=false;
    button.classList.remove('is-busy');
    if(button.dataset.originalHtml) button.innerHTML=button.dataset.originalHtml;
  }
}
async function createTeamAccount(){
  const button=document.querySelector('.create-bottom-actions .primary-action');
  if(button?.disabled) return;
  const teamName=formValue('teamName');
  const displayName=formValue('displayName');
  if(!teamName){ alert('チーム名を入力してください。'); document.getElementById('teamName')?.focus(); return; }
  if(!displayName){ alert('あなたの名前を入力してください。'); document.getElementById('displayName')?.focus(); return; }
  setActionBusy(button,true,'作成中...');
  try{
    const c=cloudClient();
    if(!c) throw new Error('Supabaseの接続設定がありません。');
    const session=await ensureCloudSession();
    const userId=session.user.id;
    let created=null;
    for(let attempt=0;attempt<5 && !created;attempt++){
      const inviteCode=teamCode();
      const response=await c.from('teams').insert({
        name:teamName,
        school_name:formValue('schoolName'),
        category:formValue('category')||'未設定',
        team_level:formValue('teamLevel')||'未設定',
        invite_code:inviteCode,
        owner_id:userId
      }).select().single();
      if(!response.error) created=response.data;
      else if(response.error.code!=='23505') throw response.error;
    }
    if(!created) throw new Error('招待コードを発行できませんでした。');
    const role=formValue('role')||'監督';
    const membership=await c.from('team_members').insert({
      team_id:created.id,user_id:userId,display_name:displayName,role,
      position:formValue('position')||'未設定',grade:formValue('grade')||'未設定',status:'active'
    }).select().single();
    if(membership.error) throw membership.error;
    const now=Date.now();
    const account={teamId:created.id,inviteCode:created.invite_code,teamName:created.name,schoolName:created.school_name||'',category:created.category||'未設定',teamLevel:created.team_level||'未設定',meetingPolicy:created.meeting_policy||'standard',meetingShowActive:created.meeting_show_active!==false,meetingContentScope:created.meeting_content_scope||'target',meetingResponseScope:created.meeting_response_scope||'target',meetingAliaScope:created.meeting_alia_scope||'all',displayName,role,position:membership.data.position||'未設定',grade:membership.data.grade||'未設定',createdAt:now,joinedAt:now,isOwner:true,cloud:true};
    saveAccount(account); upsertLocalMemberFromAccount(account);
    state.selectedType=null; state.selectedGroup=null; state.currentMeetingId=null; state.view='home';
    render(); toast('クラウドにチームを作成しました');
  }catch(error){
    console.error('createTeamAccount failed',error);
    alert(`チームを作成できませんでした。
${cloudErrorMessage(error)}`);
  }finally{ setActionBusy(button,false); }
}
async function joinTeamAccount(){
  const button=document.querySelector('.join-bottom-actions .join-action');
  if(button?.disabled) return;
  const inviteCode=formValue('joinCode').replace(/\s/g,'').toUpperCase();
  const displayName=formValue('joinName');
  if(!/^[A-Z0-9]{6}$/.test(inviteCode)){ alert('6文字の招待コードを入力してください。'); document.getElementById('joinCode')?.focus(); return; }
  if(!displayName){ alert('あなたの名前を入力してください。'); document.getElementById('joinName')?.focus(); return; }
  setActionBusy(button,true,'参加中...');
  try{
    const c=cloudClient();
    if(!c) throw new Error('Supabaseの接続設定がありません。');
    await ensureCloudSession();
    const joined=await c.rpc('join_team_by_code',{p_code:inviteCode,p_name:displayName,p_position:formValue('joinPosition')||'未設定',p_grade:formValue('joinGrade')||'未設定'});
    if(joined.error) throw joined.error;
    const teamId=joined.data;
    const teamResult=await c.from('teams').select('*').eq('id',teamId).single();
    if(teamResult.error) throw teamResult.error;
    const memberResult=await c.from('team_members').select('*').eq('team_id',teamId).eq('user_id',(await ensureCloudSession()).user.id).single();
    if(memberResult.error) throw memberResult.error;
    const t=teamResult.data,m=memberResult.data,now=Date.now();
    const account={teamId:t.id,inviteCode:t.invite_code,teamName:t.name,schoolName:t.school_name||'',category:t.category||'未設定',teamLevel:t.team_level||'未設定',meetingPolicy:t.meeting_policy||'standard',meetingShowActive:t.meeting_show_active!==false,meetingContentScope:t.meeting_content_scope||'target',meetingResponseScope:t.meeting_response_scope||'target',meetingAliaScope:t.meeting_alia_scope||'all',displayName:m.display_name,role:m.role||'選手',position:m.position||'未設定',grade:m.grade||'未設定',createdAt:t.created_at?new Date(t.created_at).getTime():now,joinedAt:m.joined_at?new Date(m.joined_at).getTime():now,isOwner:false,cloud:true};
    saveAccount(account); upsertLocalMemberFromAccount(account);
    await loadCloudTeamMembers(account.teamId);
    state.selectedType=null; state.selectedGroup=null; state.currentMeetingId=null; state.view='home';
    clearInviteFromUrl();
    render(); toast(`「${account.teamName}」に参加しました`);
  }catch(error){
    console.error('joinTeamAccount failed',error);
    const msg=/INVALID_INVITE_CODE/.test(String(error?.message||''))?'招待コードが見つかりません。':cloudErrorMessage(error);
    alert(`チームに参加できませんでした。
${msg}`);
  }finally{ setActionBusy(button,false); }
}


function directorIssueCacheKey(){ return `tt_director_issues_${loadAccount()?.teamId||'none'}`; }
function loadDirectorIssuesLocal(){ return read(directorIssueCacheKey(),[]); }
function saveDirectorIssuesLocal(v){ write(directorIssueCacheKey(),v); }
function canCreateDirectorIssue(){
 const a=loadAccount();
 return !!a && (a.isOwner===true || ['監督','コーチ'].includes(a.role||''));
}
function directorIssueTargetLabel(v){ return ({all:'全体',grade:'学年別',position:'ポジション別'})[v]||'全体'; }
function canEditDirectorIssue(issue){
 const a=loadAccount(),me=currentTeamMembers().find(m=>m.isCurrent),role=me?.role||a?.role||'';
 return !!issue && (a?.isOwner===true || ['監督','コーチ'].includes(role));
}
function canDeleteDirectorIssue(issue){
 const a=loadAccount(),me=currentTeamMembers().find(m=>m.isCurrent),role=me?.role||a?.role||'',userId=currentCloudUserId();
 return !!issue && (a?.isOwner===true || role==='監督' || (!!userId && String(issue.createdBy||'')===userId));
}
function directorDateTimeLocal(value){
 if(!value)return '';
 const d=new Date(value); if(Number.isNaN(d.getTime()))return '';
 const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
 return local.toISOString().slice(0,16);
}
function directorIssueExpired(issue){ return !!issue.dueAt && Date.now()>new Date(issue.dueAt).getTime(); }
function directorIssueStatus(issue){
 if(issue.status!=='open') return '終了';
 const response=(issue.responses||[]).find(r=>r.isCurrent);
 if(response?.answer) return '回答済み';
 if(response?.readAt) return '既読';
 return directorIssueExpired(issue)?'期限切れ':'未読';
}

function directorIssueAppliesToMe(issue){
 const a=loadAccount(); if(!a)return false;
 if(issue.targetType==='grade') return !issue.targetValue || issue.targetValue===a.grade;
 if(issue.targetType==='position') return !issue.targetValue || issue.targetValue===a.position;
 return true;
}
function directorIssueDueSoon(issue){
 if(!issue?.dueAt||issue.status!=='open'||directorIssueExpired(issue))return false;
 const left=new Date(issue.dueAt).getTime()-Date.now();
 return left>0&&left<=24*60*60*1000;
}
function myDirectorResponse(issue){return (issue.responses||[]).find(r=>r.isCurrent)||null}
function directorNotificationItems(){
 const manager=canCreateDirectorIssue();
 const issues=loadDirectorIssuesLocal().filter(directorIssueAppliesToMe);
 const items=[];
 issues.forEach(issue=>{
  const mine=myDirectorResponse(issue),status=directorIssueStatus(issue);
  if(!manager&&issue.status==='open'&&status==='未読') items.push({type:'new',priority:1,issueId:issue.id,title:'新しい監督発議',text:issue.title,time:issue.createdAt});
  if(!manager&&issue.status==='open'&&!mine?.answer&&directorIssueDueSoon(issue)) items.push({type:'due',priority:0,issueId:issue.id,title:'回答期限が近づいています',text:issue.title,time:new Date(issue.dueAt).getTime()});
  if(!manager&&mine?.managerComment) items.push({type:'comment',priority:0,issueId:issue.id,title:'監督コメントがあります',text:mine.managerComment,time:mine.answeredAt||issue.createdAt});
  if(manager&&issue.status==='open'){
   const members=currentTeamMembers();
   const answered=(issue.responses||[]).filter(r=>r.answer).length;
   const unread=Math.max(0,members.length-(issue.responses||[]).filter(r=>r.readAt).length);
   if(unread||answered<members.length) items.push({type:'progress',priority:2,issueId:issue.id,title:'回答状況を確認',text:`${answered}/${members.length}人回答・未読${unread}人`,time:issue.createdAt});
  }
 });
 return items.sort((a,b)=>a.priority-b.priority||b.time-a.time);
}
function notificationIcon(type){return ({new:'📣',due:'⏰',comment:'💬',progress:'📊'})[type]||'•'}
function directorNotificationSeenKey(){
 const a=loadAccount();
 return `tt_notification_seen_${a?.teamId||'none'}_${a?.displayName||'user'}`;
}
function directorNotificationItemKey(item){
 return [item.type,item.issueId,item.title,item.text].join('|');
}
function loadDirectorNotificationSeen(){return read(directorNotificationSeenKey(),{})||{}}
function unseenDirectorNotificationItems(){
 const seen=loadDirectorNotificationSeen();
 return directorNotificationItems().filter(item=>!seen[directorNotificationItemKey(item)]);
}
function markDirectorNotificationsSeen(issueId=null){
 const seen=loadDirectorNotificationSeen(),now=Date.now();
 directorNotificationItems().forEach(item=>{
  if(!issueId||item.issueId===issueId) seen[directorNotificationItemKey(item)]=now;
 });
 write(directorNotificationSeenKey(),seen);
}
function notificationCenterView(){
 const items=directorNotificationItems(),filter=state.notificationFilter||'all';
 const filtered=filter==='all'?items:items.filter(x=>x.type===filter);
 return `<section class="notification-page"><div class="director-page-head"><button class="settings-back" onclick="go('home')">‹</button><div><small>NOTIFICATIONS</small><h2>お知らせ</h2><p>自分に関係する発議をまとめて確認します。</p></div><button class="director-refresh" onclick="refreshDirectorIssues()">↻</button></div>
 <div class="notification-filters"><button class="${filter==='all'?'active':''}" onclick="setNotificationFilter('all')">すべて ${items.length}</button><button class="${filter==='due'?'active':''}" onclick="setNotificationFilter('due')">期限</button><button class="${filter==='comment'?'active':''}" onclick="setNotificationFilter('comment')">コメント</button></div>
 <div class="notification-list">${filtered.length?filtered.map(n=>`<button class="notification-card ${n.type}" onclick="openDirectorIssue('${n.issueId}')"><span>${notificationIcon(n.type)}</span><span><b>${esc(n.title)}</b><small>${esc(n.text)}</small></span><em>›</em></button>`).join(''):`<div class="meeting-empty dark-empty"><span>✓</span><b>確認が必要なお知らせはありません</b></div>`}</div></section>`;
}
function setNotificationFilter(v){state.notificationFilter=v;render()}
function directorDashboardView(){
 if(!canCreateDirectorIssue())return `<section class="director-page"><button class="back" onclick="go('home')">‹ 戻る</button><div class="meeting-empty dark-empty"><b>表示権限がありません</b></div></section>`;
 const issues=loadDirectorIssuesLocal().filter(x=>x.status==='open'),members=currentTeamMembers();
 const totalTargets=issues.length*members.length,totalAnswers=issues.reduce((n,x)=>n+(x.responses||[]).filter(r=>r.answer).length,0),rate=totalTargets?Math.round(totalAnswers/totalTargets*100):0;
 const memberRows=members.map(m=>{const rs=issues.map(i=>(i.responses||[]).find(r=>r.userId===m.userId));const answered=rs.filter(r=>r?.answer).length,read=rs.filter(r=>r?.readAt).length;return `<div class="dashboard-member-row"><span class="director-response-avatar">${esc((m.displayName||'?').slice(0,1))}</span><span><b>${esc(m.displayName)}</b><small>${esc(m.grade||'未設定')}・${esc(m.position||'未設定')}</small></span><em>${answered}/${issues.length}回答</em><i>${read}/${issues.length}既読</i></div>`}).join('');
 const issueRows=issues.map(i=>{const answered=(i.responses||[]).filter(r=>r.answer).length,read=(i.responses||[]).filter(r=>r.readAt).length;return `<button class="dashboard-issue-row" onclick="openDirectorIssue('${i.id}')"><span><b>${esc(i.title)}</b><small>${answered}/${members.length}回答・${read}/${members.length}既読</small></span><em>${members.length?Math.round(answered/members.length*100):0}%</em></button>`}).join('');
 return `<section class="director-page dashboard-page"><div class="director-page-head"><button class="settings-back" onclick="go('home')">‹</button><div><small>DIRECTOR DASHBOARD</small><h2>監督ダッシュボード</h2><p>発議の既読・回答状況を一覧で確認します。</p></div><button class="director-refresh" onclick="refreshDirectorIssues()">↻</button></div>
 <div class="dashboard-kpis"><div><small>現在の発議</small><b>${issues.length}</b></div><div><small>全体回答率</small><b>${rate}%</b></div><div><small>メンバー</small><b>${members.length}人</b></div></div>
 <section class="settings-section-card"><div class="settings-section-title"><h3>発議別の状況</h3><p>タップして回答内容を確認できます。</p></div><div class="dashboard-issue-list">${issueRows||'<p class="no-answer">現在の発議はありません。</p>'}</div></section>
 <section class="settings-section-card"><div class="settings-section-title"><h3>メンバー別の状況</h3><p>未読・未回答者を確認できます。</p></div><div class="dashboard-member-list">${memberRows||'<p class="no-answer">メンバーがいません。</p>'}</div></section></section>`;
}
async function loadCloudDirectorIssues(){
 const a=loadAccount(),c=cloudClient();
 if(!a?.cloud||!c) return loadDirectorIssuesLocal();
 const session=await ensureCloudSession();
 const issueResult=await c.from('director_issues')
  .select('id,team_id,title,body,target_type,target_value,due_at,status,created_by,created_at')
  .eq('team_id',a.teamId).order('created_at',{ascending:false});
 if(issueResult.error) throw issueResult.error;
 const ids=(issueResult.data||[]).map(x=>x.id);
 let responses=[];
 if(ids.length){
  const responseResult=await c.from('director_issue_responses')
   .select('id,issue_id,user_id,display_name,answer,manager_comment,read_at,answered_at,created_at')
   .in('issue_id',ids).order('created_at',{ascending:true});
  if(responseResult.error) throw responseResult.error;
  responses=responseResult.data||[];
 }
 const issues=(issueResult.data||[]).map(row=>({
  id:row.id,teamId:row.team_id,title:row.title,body:row.body||'',targetType:row.target_type||'all',targetValue:row.target_value||'',dueAt:row.due_at||'',status:row.status||'open',createdBy:row.created_by,createdAt:new Date(row.created_at).getTime(),
  responses:responses.filter(r=>r.issue_id===row.id).map(r=>({id:r.id,userId:r.user_id,displayName:r.display_name||'',answer:r.answer||'',managerComment:r.manager_comment||'',readAt:r.read_at?new Date(r.read_at).getTime():0,answeredAt:r.answered_at?new Date(r.answered_at).getTime():0,isCurrent:r.user_id===session?.user?.id}))
 }));
 saveDirectorIssuesLocal(issues); return issues;
}
async function refreshDirectorIssues(silent=false){
 try{await loadCloudDirectorIssues(); if(!silent) toast('監督発議を更新しました'); render();}
 catch(error){console.error('refreshDirectorIssues failed',error); if(!silent) toast(cloudErrorMessage(error));}
}
function directorIssueCard(issue){
 const status=directorIssueStatus(issue),due=issue.dueAt?new Date(issue.dueAt).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}):'期限なし';
 return `<button class="director-issue-card" onclick="openDirectorIssue('${issue.id}')"><span class="director-issue-status ${status==='未読'||status==='期限切れ'?'unread':status==='回答済み'?'answered':''}">${status}</span><span class="director-issue-copy"><small>${directorIssueTargetLabel(issue.targetType)}${issue.targetValue?'・'+esc(issue.targetValue):''}</small><b>${esc(issue.title)}</b><em>期限 ${due}</em></span><span class="chev">›</span></button>`;
}
function setDirectorIssueTab(tab){state.directorIssueTab=tab;render()}
function directorIssuesView(){
 const all=loadDirectorIssuesLocal(),tab=state.directorIssueTab||'open';
 const issues=all.filter(x=>tab==='open'?x.status==='open':x.status!=='open');
 return `<section class="director-page"><div class="director-page-head"><button class="settings-back" onclick="go('home')">‹</button><div><small>DIRECTOR ISSUES</small><h2>監督発議</h2><p>監督からのテーマを確認し、回答します。</p></div><button class="director-refresh" onclick="refreshDirectorIssues()">↻</button></div>
 ${canCreateDirectorIssue()?`<button class="btn primary director-create-btn" onclick="go('directorIssueCreate')">＋ 新しい発議を作成</button>`:''}
 <div class="director-tabs"><button class="${tab==='open'?'active':''}" onclick="setDirectorIssueTab('open')">現在 ${all.filter(x=>x.status==='open').length}</button><button class="${tab==='archive'?'active':''}" onclick="setDirectorIssueTab('archive')">過去 ${all.filter(x=>x.status!=='open').length}</button></div>
 <div class="director-issue-list">${issues.length?issues.map(directorIssueCard).join(''):`<div class="meeting-empty dark-empty"><span>📣</span><b>${tab==='open'?'現在の発議はありません':'過去の発議はありません'}</b></div>`}</div></section>`;
}
function directorIssueCreateView(){
 if(!canCreateDirectorIssue()) return `<section class="director-page"><button class="back" onclick="go('directorIssues')">‹ 戻る</button><div class="meeting-empty dark-empty"><b>作成権限がありません</b></div></section>`;
 const tomorrow=new Date(Date.now()+86400000); tomorrow.setMinutes(tomorrow.getMinutes()-tomorrow.getTimezoneOffset());
 return `<section class="director-page"><div class="director-page-head"><button class="settings-back" onclick="go('directorIssues')">‹</button><div><small>NEW ISSUE</small><h2>監督発議を作成</h2><p>選手に考えてほしいテーマを発行します。</p></div></div>
 <section class="settings-section-card director-form">
  <label class="settings-field"><span>タイトル</span><input id="directorTitle" class="input" maxlength="80" placeholder="例：レセプションの質を上げるには"></label>
  <label class="settings-field"><span>内容・問いかけ</span><textarea id="directorBody" class="input" rows="6" maxlength="1000" placeholder="今日の練習を踏まえて、自分が改善できることを1つ書いてください。"></textarea></label>
  <label class="settings-field"><span>対象</span><select id="directorTargetType" class="input" onchange="renderDirectorTargetValue()"><option value="all">全体</option><option value="grade">学年別</option><option value="position">ポジション別</option></select></label>
  <div id="directorTargetValueWrap"></div>
  <label class="settings-field"><span>回答期限</span><input id="directorDueAt" class="input" type="datetime-local" value="${tomorrow.toISOString().slice(0,16)}"></label>
 </section><div class="settings-actions director-form-actions"><button type="button" class="btn secondary director-cancel-action" onclick="go('directorIssues')"><span class="btn-symbol">×</span><span>キャンセル</span></button><button type="button" id="directorCreateButton" class="btn primary director-submit-action" onclick="createDirectorIssue()"><span class="btn-symbol">＋</span><span>発議する</span></button></div></section>`;
}
function renderDirectorTargetValue(selectedValue=''){
 const type=document.getElementById('directorTargetType')?.value||'all',wrap=document.getElementById('directorTargetValueWrap'); if(!wrap)return;
 if(type==='grade') wrap.innerHTML=`<label class="settings-field"><span>対象学年</span><select id="directorTargetValue" class="input">${optionList(['1年','2年','3年'],selectedValue||'1年')}</select></label>`;
 else if(type==='position') wrap.innerHTML=`<label class="settings-field"><span>対象ポジション</span><select id="directorTargetValue" class="input">${optionList(POSITIONS.filter(x=>x!=='未設定'),selectedValue||'セッター')}</select></label>`;
 else wrap.innerHTML='';
}
function directorIssueEditView(){
 const issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId);
 if(!issue||!canEditDirectorIssue(issue)) return `<section class="director-page"><button class="back" onclick="go('directorIssues')">‹ 戻る</button><div class="meeting-empty dark-empty"><b>編集権限がありません</b></div></section>`;
 return `<section class="director-page"><div class="director-page-head"><button class="settings-back" onclick="go('directorIssueDetail')">‹</button><div><small>EDIT ISSUE</small><h2>監督発議を編集</h2><p>タイトル・内容・対象・回答期限を変更します。</p></div></div>
 <section class="settings-section-card director-form">
  <label class="settings-field"><span>タイトル</span><input id="directorTitle" class="input" maxlength="80" value="${esc(issue.title)}"></label>
  <label class="settings-field"><span>内容・問いかけ</span><textarea id="directorBody" class="input" rows="6" maxlength="1000">${esc(issue.body||'')}</textarea></label>
  <label class="settings-field"><span>対象</span><select id="directorTargetType" class="input" onchange="renderDirectorTargetValue()"><option value="all" ${issue.targetType==='all'?'selected':''}>全体</option><option value="grade" ${issue.targetType==='grade'?'selected':''}>学年別</option><option value="position" ${issue.targetType==='position'?'selected':''}>ポジション別</option></select></label>
  <div id="directorTargetValueWrap">${issue.targetType==='grade'?`<label class="settings-field"><span>対象学年</span><select id="directorTargetValue" class="input">${optionList(['1年','2年','3年'],issue.targetValue||'1年')}</select></label>`:issue.targetType==='position'?`<label class="settings-field"><span>対象ポジション</span><select id="directorTargetValue" class="input">${optionList(POSITIONS.filter(x=>x!=='未設定'),issue.targetValue||'セッター')}</select></label>`:''}</div>
  <label class="settings-field"><span>回答期限</span><input id="directorDueAt" class="input" type="datetime-local" value="${directorDateTimeLocal(issue.dueAt)}"></label>
 </section><div class="settings-actions director-form-actions"><button type="button" class="btn secondary director-cancel-action" onclick="go('directorIssueDetail')"><span class="btn-symbol">×</span><span>キャンセル</span></button><button type="button" id="directorUpdateButton" class="btn primary director-submit-action" onclick="updateDirectorIssue()"><span class="btn-symbol">✓</span><span>変更を保存</span></button></div></section>`;
}
async function updateDirectorIssue(){
 const issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId),c=cloudClient(),button=document.getElementById('directorUpdateButton');
 if(!issue||!c||!canEditDirectorIssue(issue)){toast('編集権限がありません');return}
 const title=document.getElementById('directorTitle')?.value.trim()||'',body=document.getElementById('directorBody')?.value.trim()||'',targetType=document.getElementById('directorTargetType')?.value||'all',targetValue=document.getElementById('directorTargetValue')?.value||'',dueValue=document.getElementById('directorDueAt')?.value||'';
 if(!title||!body){toast('タイトルと内容を入力してください');return}
 setActionBusy(button,true,'保存中…');
 try{const result=await c.from('director_issues').update({title,body,target_type:targetType,target_value:targetValue,due_at:dueValue?new Date(dueValue).toISOString():null}).eq('id',issue.id);if(result.error)throw result.error;await loadCloudDirectorIssues();state.view='directorIssueDetail';render();toast('発議を更新しました');}
 catch(error){console.error('updateDirectorIssue failed',error);toast(cloudErrorMessage(error));}finally{setActionBusy(button,false)}
}
async function createDirectorIssue(){
 const a=loadAccount(),c=cloudClient(),button=document.getElementById('directorCreateButton');
 const title=document.getElementById('directorTitle')?.value.trim()||'',body=document.getElementById('directorBody')?.value.trim()||'',targetType=document.getElementById('directorTargetType')?.value||'all',targetValue=document.getElementById('directorTargetValue')?.value||'',dueValue=document.getElementById('directorDueAt')?.value||'';
 if(!title||!body){toast('タイトルと内容を入力してください');return}
 if(!a?.cloud||!c){toast('クラウド接続が必要です');return}
 setActionBusy(button,true,'発議中…');
 try{const session=await ensureCloudSession();const result=await c.from('director_issues').insert({team_id:a.teamId,title,body,target_type:targetType,target_value:targetValue,due_at:dueValue?new Date(dueValue).toISOString():null,created_by:session.user.id}).select('*').single();if(result.error)throw result.error;await loadCloudDirectorIssues();state.view='directorIssues';render();toast('監督発議を公開しました');}
 catch(error){console.error('createDirectorIssue failed',error);toast(cloudErrorMessage(error));}finally{setActionBusy(button,false)}
}
async function openDirectorIssue(id){
 markDirectorNotificationsSeen(id);
 state.directorIssueId=id;state.view='directorIssueDetail';render();
 const issue=loadDirectorIssuesLocal().find(x=>x.id===id),a=loadAccount(),c=cloudClient();
 if(!issue||!a?.cloud||!c||issue.status!=='open')return;
 const current=(issue.responses||[]).find(r=>r.isCurrent);if(current?.readAt)return;
 try{const session=await ensureCloudSession();const result=await c.from('director_issue_responses').upsert({issue_id:id,user_id:session.user.id,display_name:a.displayName,read_at:new Date().toISOString()},{onConflict:'issue_id,user_id'});if(result.error)throw result.error;await loadCloudDirectorIssues();render();}catch(error){console.error('markDirectorIssueRead failed',error)}
}
function directorIssueDetailView(){
 const issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId);if(!issue)return `<section class="director-page"><button class="back" onclick="go('directorIssues')">‹ 戻る</button><div class="meeting-empty dark-empty"><b>発議が見つかりません</b></div></section>`;
 const mine=(issue.responses||[]).find(r=>r.isCurrent),manager=canCreateDirectorIssue(),due=issue.dueAt?new Date(issue.dueAt).toLocaleString('ja-JP'):'期限なし',expired=directorIssueExpired(issue),closed=issue.status!=='open';
 return `<section class="director-page"><div class="director-page-head"><button class="settings-back" onclick="go('directorIssues')">‹</button><div><small>${directorIssueTargetLabel(issue.targetType)}${issue.targetValue?'・'+esc(issue.targetValue):''}</small><h2>${esc(issue.title)}</h2><p>回答期限：${esc(due)}</p></div></div>
 <article class="director-detail-card"><p>${esc(issue.body).replace(/\n/g,'<br>')}</p></article>
 ${manager?directorIssueManagerResponses(issue):closed||expired?`<section class="settings-section-card director-closed"><b>${closed?'受付終了':'回答期限を過ぎました'}</b>${mine?.answer?`<p>あなたの回答：${esc(mine.answer)}</p>`:''}${mine?.managerComment?`<p class="manager-comment-view">監督コメント：${esc(mine.managerComment)}</p>`:''}</section>`:`<section class="settings-section-card director-answer-card"><div class="settings-section-title"><h3>あなたの回答</h3><p>自分の考えを言葉にしてください。</p></div><textarea id="directorAnswer" class="input" rows="7" maxlength="1500" placeholder="ここに回答を入力">${esc(mine?.answer||'')}</textarea><button id="directorAnswerButton" class="btn primary" onclick="saveDirectorIssueAnswer()">${mine?.answer?'回答を更新':'回答する'}</button>${mine?.managerComment?`<p class="manager-comment-view">監督コメント：${esc(mine.managerComment)}</p>`:''}</section>`}
 ${manager?`<div class="director-management-actions">${canEditDirectorIssue(issue)?`<button type="button" class="btn secondary director-manage-button director-edit-action" onclick="state.view='directorIssueEdit';render()"><span class="btn-symbol">✎</span><span>編集</span></button>`:''}${issue.status==='open'&&canEditDirectorIssue(issue)?`<button type="button" class="btn secondary director-manage-button director-close-action" onclick="archiveDirectorIssue()"><span class="btn-symbol">✓</span><span>終了して履歴へ</span></button>`:issue.status!=='open'&&canEditDirectorIssue(issue)?`<button type="button" class="btn secondary director-manage-button director-reopen-action" onclick="reopenDirectorIssue()"><span class="btn-symbol">↻</span><span>発議を再開</span></button>`:''}${canDeleteDirectorIssue(issue)?`<button type="button" class="btn danger director-manage-button director-delete-action" onclick="deleteDirectorIssue()"><span class="btn-symbol">⌫</span><span>完全削除</span></button>`:''}</div>`:''}</section>`;
}
function directorIssueManagerResponses(issue){
 const members=currentTeamMembers(),responses=issue.responses||[];
 const rows=members.map(m=>{const r=responses.find(x=>x.userId===m.userId),status=r?.answer?'回答済み':r?.readAt?'既読':'未読';return `<details class="director-response-row ${status==='未読'?'is-unread':''}"><summary><span class="director-response-avatar">${esc((m.displayName||'?').slice(0,1))}</span><div><b>${esc(m.displayName)}</b><small>${esc(m.role||'選手')}・${status}</small></div><em class="${status==='未読'?'unread':''}">${status}</em></summary><div class="director-response-detail">${r?.answer?`<p>${esc(r.answer).replace(/\n/g,'<br>')}</p><label>監督コメント<textarea id="comment_${r.id}" class="input" rows="3" maxlength="500">${esc(r.managerComment||'')}</textarea></label><button class="btn secondary" onclick="saveDirectorResponseComment('${r.id}')">コメント保存</button>`:`<p class="no-answer">まだ回答はありません。</p>`}</div></details>`}).join('');
 return `<section class="settings-section-card"><div class="settings-section-title"><h3>回答状況</h3><p>${responses.filter(r=>r.answer).length} / ${members.length}人 回答済み</p></div><div class="director-response-list">${rows}</div></section>`;
}
async function saveDirectorResponseComment(responseId){
 const c=cloudClient(),value=document.getElementById(`comment_${responseId}`)?.value.trim()||'';if(!c)return;
 try{const result=await c.from('director_issue_responses').update({manager_comment:value}).eq('id',responseId);if(result.error)throw result.error;await loadCloudDirectorIssues();render();toast('コメントを保存しました');}catch(error){console.error('saveDirectorResponseComment failed',error);toast(cloudErrorMessage(error))}
}
async function archiveDirectorIssue(){
 const c=cloudClient(),issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId);if(!c||!issue||!canEditDirectorIssue(issue)){toast('終了する権限がありません');return}if(!confirm('この発議を終了して過去へ移動しますか？'))return;
 try{const result=await c.from('director_issues').update({status:'archived'}).eq('id',issue.id);if(result.error)throw result.error;await loadCloudDirectorIssues();state.directorIssueTab='archive';state.view='directorIssues';render();toast('発議を過去へ移動しました');}catch(error){console.error('archiveDirectorIssue failed',error);toast(cloudErrorMessage(error))}
}
async function reopenDirectorIssue(){
 const c=cloudClient(),issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId);if(!c||!issue||!canEditDirectorIssue(issue)){toast('再開する権限がありません');return}if(!confirm('この発議を再開して「現在」に戻しますか？'))return;
 try{const result=await c.from('director_issues').update({status:'open'}).eq('id',issue.id);if(result.error)throw result.error;await loadCloudDirectorIssues();state.directorIssueTab='open';state.view='directorIssues';render();toast('発議を再開しました');}catch(error){console.error('reopenDirectorIssue failed',error);toast(cloudErrorMessage(error))}
}
async function deleteDirectorIssue(){
 const c=cloudClient(),issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId);if(!c||!issue||!canDeleteDirectorIssue(issue)){toast('削除する権限がありません');return}if(!confirm(`発議「${issue.title}」を完全に削除しますか？\n\n回答と監督コメントも削除され、元に戻せません。`))return;
 try{const result=await c.from('director_issues').delete().eq('id',issue.id);if(result.error)throw result.error;await loadCloudDirectorIssues();state.directorIssueId=null;state.view='directorIssues';render();toast('発議を完全削除しました');}catch(error){console.error('deleteDirectorIssue failed',error);toast(cloudErrorMessage(error))}
}
async function saveDirectorIssueAnswer(){
 const issue=loadDirectorIssuesLocal().find(x=>x.id===state.directorIssueId),a=loadAccount(),c=cloudClient(),button=document.getElementById('directorAnswerButton'),answer=document.getElementById('directorAnswer')?.value.trim()||'';
 if(!issue||!a?.cloud||!c)return;if(issue.status!=='open'||directorIssueExpired(issue)){toast('回答受付は終了しています');render();return}if(!answer){toast('回答を入力してください');return}
 setActionBusy(button,true,'保存中…');
 try{const session=await ensureCloudSession(),now=new Date().toISOString(),result=await c.from('director_issue_responses').upsert({issue_id:issue.id,user_id:session.user.id,display_name:a.displayName,answer,read_at:now,answered_at:now},{onConflict:'issue_id,user_id'}).select('*').single();if(result.error)throw result.error;await loadCloudDirectorIssues();render();toast('回答を保存しました');}
 catch(error){console.error('saveDirectorIssueAnswer failed',error);toast(cloudErrorMessage(error));}finally{setActionBusy(button,false)}
}
function homeView(){
  const a=loadAccount();
  const meetings=currentTeamMeetings().slice().sort((x,y)=>(y.createdAt||0)-(x.createdAt||0));
  const activeMeetings=meetings.filter(m=>m.status==='open'&&canSeeMeetingPresence(m));
  const recent=meetings.filter(m=>m.status==='closed').slice(0,3);
  const localMembers=currentTeamMembers();
  const memberCount=Math.max(1,localMembers.length);
  const today=new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
  const elapsedText=(createdAt)=>{
    const mins=Math.max(0,Math.floor((Date.now()-(createdAt||Date.now()))/60000));
    if(mins<60) return `${mins}分`;
    const h=Math.floor(mins/60), m=mins%60;
    return m?`${h}時間${m}分`:`${h}時間`;
  };
  const activeBlock=`<section class="team-home-active"><div class="team-home-section-head"><div><small>IN PROGRESS</small><h3>進行中のミーティング</h3></div>${activeMeetings.length?`<span class="pill">${activeMeetings.length}件</span>`:''}</div>${activeMeetings.length?`<div class="active-meeting-list">${activeMeetings.map(m=>{const allowed=canViewMeetingContent(m);const participants=Math.max(1,new Set((m.entries||[]).map(e=>e.name).filter(Boolean)).size);return `<article class="team-home-progress ${allowed?'':'is-locked'}"><div class="team-home-progress-meta"><span>${esc(TYPES[m.type]?.label||'ミーティング')}</span><span>${esc(m.group)}</span></div><h3>${esc(m.theme||'テーマ未設定')}</h3><p class="active-meeting-owner">発議者：${esc(m.ownerName||'不明')}　・　参加 ${participants}人</p><div class="team-home-live-stats"><div><small>開始時刻</small><b>${new Date(m.createdAt||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</b></div><div><small>経過時間</small><b>${elapsedText(m.createdAt)}</b></div><div><small>公開範囲</small><b>${allowed?'閲覧可':'対象者のみ'}</b></div></div><button class="btn ${allowed?'primary':'secondary'} team-home-continue" onclick="openMeeting('${m.id}')">${allowed?'内容を見る':'🔒 対象外'} <span>›</span></button></article>`}).join('')}</div>`:`<div class="team-home-empty"><span>✓</span><div><b>現在進行中のミーティングはありません</b><small>下の3つから新しい話し合いを始められます。</small></div></div>`}</section>`;
  const directorIssues=loadDirectorIssuesLocal().filter(directorIssueAppliesToMe);
  const unreadDirector=directorIssues.filter(x=>directorIssueStatus(x)==='未読').length;
  const notices=directorNotificationItems(),unseenNotices=unseenDirectorNotificationItems(),urgent=unseenNotices.filter(x=>x.type==='due'||x.type==='comment').length;
  const aliaPrefs=getAliaPrefs();
  const latestReview=currentTeamMeetings().filter(m=>m.status==='closed'&&!m.actionCompleted).sort((a,b)=>(b.closedAt||b.createdAt)-(a.closedAt||a.createdAt))[0];
  const aliaReflectionBlock=aliaPrefs.notify&&latestReview?`<section class="home-attention alia-reflection"><button onclick="resume('${latestReview.id}')"><span class="attention-icon">✦</span><span><b>Aliaと前回の行動を振り返ろう</b><small>${esc(latestReview.group)}・${esc(latestReview.theme||'テーマ未設定')}</small></span><em>確認 ›</em></button></section>`:'';
  const attentionBlock=notices.length?`<section class="home-attention ${unseenNotices.length?'has-unseen':'is-seen'}"><button onclick="go('notifications')"><span class="attention-icon">${unseenNotices.length?(urgent?'!':'•'):'✓'}</span><span><b>${unseenNotices.length?(urgent?'確認が必要なお知らせがあります':'新しいお知らせがあります'):'確認済みのお知らせがあります'}</b><small>${notices[0]?esc(notices[0].title+'・'+notices[0].text):''}</small></span><em>${unseenNotices.length?unseenNotices.length+'件':'確認済み'} ›</em></button></section>`:'';
  const directorBlock=`<section class="team-home-director"><div class="team-home-section-head"><div><small>DIRECTOR ISSUES</small><h3>監督発議</h3></div><div class="director-head-actions">${unreadDirector?`<span class="director-unread-badge">未読 ${unreadDirector}</span>`:''}${canCreateDirectorIssue()?`<button onclick="go('directorDashboard')">集計 ›</button>`:''}</div></div><button class="team-home-director-card" onclick="go('directorIssues')"><span class="director-home-icon">📣</span><span><b>${directorIssues.length?esc(directorIssues[0].title):'監督からのテーマ'}</b><small>${directorIssues.length?`${directorIssueStatus(directorIssues[0])}・${directorIssues.length}件`:'発議されたテーマを確認・回答します'}</small></span><span>›</span></button></section>`;
  const recentBlock=`<section class="team-home-recent"><div class="team-home-section-head"><div><small>RECENT</small><h3>最近のミーティング</h3></div><button class="team-home-link" onclick="go('meetings')">すべて見る ›</button></div>${recent.length?`<div class="team-home-recent-list">${recent.map(m=>`<button class="team-home-recent-card" onclick="resume('${m.id}')"><span class="team-home-recent-mark">✓</span><span><b>${esc(m.group)}ミーティング</b><small>${esc(m.theme||'テーマ未設定')}・${new Date(m.createdAt).toLocaleDateString('ja-JP')}</small></span><span>›</span></button>`).join('')}</div>`:`<div class="team-home-recent-empty">終了したミーティングはまだありません。</div>`}</section>`;
  return `<section class="team-home-dashboard">
    <header class="team-home-header"><div><small>TEAM HOME</small><h2>${esc(a.teamName)}</h2><p>${today}</p></div><div class="team-home-header-actions"><button class="home-notification-button" onclick="go('notifications')" aria-label="お知らせを開く"><span>♢</span>${unseenNotices.length?`<b>${unseenNotices.length}</b>`:''}</button><button class="team-home-members" onclick="go('members')" aria-label="参加メンバー一覧を開く"><span class="team-home-members-icon">♟</span><span class="team-home-members-count">${memberCount}人</span><span class="team-home-members-arrow">›</span></button></div></header>
    ${attentionBlock}
    ${directorBlock}
    ${activeBlock}
    <section class="team-home-start"><div class="team-home-section-head"><div><small>START MEETING</small><h3>ミーティングを始める</h3></div><span>3種類</span></div><div class="team-home-meeting-grid">${meetingCard('position','ポジション別','同じ役割だから見える課題を共有')}${meetingCard('grade','学年別','学年ごとの役割と行動を整理')}${meetingCard('all','全体','各グループの結論をチームの方針へ')}</div></section>
    ${recentBlock}
  </section>`;
}

function startType(type){
  if(!TYPES[type]){ toast('ミーティング種類を開けませんでした'); return; }
  state.selectedType=type;
  state.selectedGroup=null;
  state.currentMeetingId=null;
  state.view='select';
  render();
}

function copyCode(){
  const a=loadAccount();
  const code=String(a?.inviteCode||a?.teamCode||'').trim();
  if(!code){ toast('招待コードがありません'); return; }
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(code).then(()=>toast('招待コードをコピーしました')).catch(()=>fallbackCopy(code));
  }else{
    fallbackCopy(code);
  }
}
function fallbackCopy(text){
  const el=document.createElement('textarea');
  el.value=text; el.setAttribute('readonly','');
  el.style.position='fixed'; el.style.opacity='0';
  document.body.appendChild(el); el.select();
  try{ document.execCommand('copy'); toast('招待コードをコピーしました'); }
  catch(e){ toast(text); }
  el.remove();
}
function meetingCard(type,title,desc){return `<button class="meeting-card" onclick="startType('${type}')"><div class="icon">${TYPES[type].icon}</div><div><b>${title}ミーティング</b><small>${desc}</small></div><div class="chev">›</div></button>`}
function selectView(){
 const current=getCurrent();
 const typeKey=TYPES[state.selectedType] ? state.selectedType : (TYPES[current?.type] ? current.type : null);
 if(!typeKey){
   state.selectedType=null;
   state.currentMeetingId=null;
   state.view='home';
   return '<div class="empty">ミーティング種類を確認できませんでした。ホームへ戻ります。</div>';
 }
 state.selectedType=typeKey;
 const t=TYPES[typeKey];
 return `<button class="back" onclick="go('home')">‹ 戻る</button><h2 class="page-title">${t.icon} ${t.label}</h2><p class="subtitle">参加するグループを選択してください。</p><div class="choice-list">${t.groups.map(g=>`<button class="meeting-card" onclick="createMeeting('${esc(g)}')"><div><b>${esc(g)}</b><small>ミーティングを開始</small></div><div class="chev">›</div></button>`).join('')}</div>`;
}
function roomView(){
 const m=getCurrent(); const a=loadAccount(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 const typeLabel = m.type==='position' ? 'ポジション別ミーティング' : TYPES[m.type].label;
 const themePlaceholder = m.type==='grade' ? '例：部活と勉強を両立するには' : m.type==='all' ? '例：次の大会へ向けて改善すること' : '例：ミドルをもっと使うには';
 const categoryLabel = themeCategoryLabel(m.type,m.themeCategory||'');
 return `<section class="meeting-room">
   <header class="meeting-room-head"><div><small>${esc(typeLabel)}</small><h2>${esc(m.group)}ミーティング</h2></div></header>
   <div class="room-meta room-meta-modern"><span><b>作成者</b>${esc(m.ownerName)}</span><span><b>ミーティングコード</b>${esc(a.inviteCode||a.teamCode)}</span></div>
   ${canPostMeetingOpinion(m)?`<div class="form-card meeting-form-card"><div class="meeting-form-title"><span>✎</span><div><b>意見を送る</b><small>短くても大丈夫。今感じていることを言葉にしよう。</small></div></div>
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
   </div>`:`<div class="settings-permission-note">このミーティングは閲覧のみです。意見を投稿できるのは対象者とスタッフです。</div>`}
   <div class="section-title meeting-opinion-title"><h3>集まった意見</h3><span>${m.entries.length}件</span></div>
   <div class="opinion-list">${m.entries.length?m.entries.map(e=>`<article class="opinion-card"><div class="opinion-meta"><span class="opinion-avatar">${esc((e.name||'?').slice(0,1))}</span><div><strong>${esc(e.name)}</strong><small>${new Date(e.createdAt||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</small></div></div><p>${esc(e.text)}</p></article>`).join(''):'<div class="meeting-empty dark-empty"><span>♡</span><b>まだ意見はありません</b><small>最初の意見を送ってみよう！</small></div>'}</div>
   <div class="meeting-bottom-actions"><button class="btn back-action" onclick="state.selectedType=getCurrent()?.type||state.selectedType;state.view='select';render()">‹ 戻る</button><button class="btn secondary" onclick="go('home')">一時保存</button><button class="btn gold alia-summary-action" onclick="openSummary()">✦ Aliaまとめへ</button></div>
 </section>`;
}
function applyAliaDetailPreference(sections){
 const detail=getAliaPrefs().detail;
 if(detail==='簡潔') return sections.slice(0,1).map(x=>({...x,text:String(x.text||'').split('。')[0]+'。'}));
 if(detail==='詳しく') return sections.map(x=>({...x,text:`${x.text} 実施後は結果を記録し、次回のミーティングで続ける点と変える点を確認します。`}));
 return sections;
}
function summaryView(){
 const m=getCurrent(); if(!m) return '<div class="empty">ミーティングが見つかりません。</div>';
 const plan=parseActionPlan(m.summary || makeSummary(m),m);
 const aliaContext=classifyAliaContext(m);
 const aliaPrefs=getAliaPrefs();
 const adviceSections=applyAliaDetailPreference(gradeAwareSections(m,buildAdaptiveAdviceSections(m,plan)));
 const methodSections=adviceSections.map(section=>`<div class="method-block adaptive-method-block"><strong>${esc(section.icon)} ${esc(section.label)}</strong><div>${esc(section.text)}</div></div>`).join('');
 const evidenceItems=aliaEvidence(m,aliaContext).map(x=>`<li>${esc(x)}</li>`).join('');
 const evidenceBlock=aliaPrefs.detail==='簡潔'?'':`<button id="alia-evidence-btn" class="alia-evidence-toggle" onclick="toggleAliaEvidence()">根拠を見る</button><div id="alia-evidence" class="alia-evidence-panel" hidden><strong>提案の考え方</strong><ul>${evidenceItems}</ul><small>安全性と実行しやすさを優先した一般的な知見です。医療・栄養上の個別判断が必要な場合は専門家へ相談してください。</small></div>`;
 const sourceOpinions = m.entries.length ? m.entries.map((e,i)=>`<article class="summary-source-card"><div class="summary-source-number">${i+1}</div><div class="summary-source-body"><div class="summary-source-meta"><strong>${esc(e.name)}</strong><small>${new Date(e.createdAt||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</small></div><p>${esc(e.text)}</p></div></article>`).join('') : '<div class="meeting-empty dark-empty"><span>♡</span><b>意見はまだありません</b><small>意見を入力すると、発言者と内容がここに残ります。</small></div>';
 return `<section class="summary-page"><h2 class="page-title">ミーティングまとめ</h2><div class="summary-source-section player-opinions-main"><div class="summary-panel-head player-voices-head"><div><small>PLAYER VOICES</small><h3>選手から出た意見</h3></div><span>${m.entries.length}件</span></div><div class="summary-source-list">${sourceOpinions}</div></div>${canViewMeetingAlia(m)?`<div class="alia-plan-card"><div class="summary-panel-head alia-plan-head"><div><small>ALIA ADVICE</small></div><span class="alia-context-chip">${esc(aliaContext.domainLabel)}・${esc(aliaPrefs.level)}・${esc(aliaPrefs.detail)}</span></div><div class="action-plan-list"><div class="action-plan-card issue"><span class="action-plan-label">課題</span><div class="action-plan-answer">${esc(plan.issue)}</div></div><div class="action-plan-card action"><span class="action-plan-label">行動</span><div class="action-plan-answer">${esc(plan.action)}</div></div><div class="action-plan-card method"><span class="action-plan-label">方法</span><div class="action-plan-answer method-answer">${methodSections}</div></div></div>${evidenceBlock}</div>`:`<div class="settings-permission-note">Aliaまとめは対象者とスタッフのみ閲覧できます。</div>`}<div class="summary-bottom-actions two-actions"><button class="btn back-action" onclick="state.view='room';render()">‹ 入力へ戻る</button>${canEndMeeting(m)?`<button class="btn gold" onclick="finalize()">確定して保存</button>`:`<button class="btn gold" onclick="go('meetings')">履歴へ戻る</button>`}</div></section>`;
}
function historyView(){
 const ms=currentTeamMeetings().sort((a,b)=>b.createdAt-a.createdAt);
 return `<section class="history-page"><h2 class="page-title">ミーティング履歴</h2><p class="subtitle">過去の話し合いと結論を見返せます。</p>${ms.length?`<div class="history-list">${ms.map(m=>{const allowed=canViewMeetingContent(m),canEnd=canEndMeeting(m),canDelete=canDeleteMeeting(m),canRename=canRenameMeeting(m);return `<article class="history-card history-card-modern ${allowed?'':'history-card-locked'}" data-meeting-id="${esc(m.id)}">${allowed?`<button class="history-more-btn" aria-label="操作メニュー" onclick="toggleHistoryMenu(event,'${m.id}')">⋯</button><div id="history-menu-${m.id}" class="history-card-menu" hidden><button onclick="openMeeting('${m.id}')">${m.status==='open'?'▶ 続きから':'👁 詳細を見る'}</button>${canRename?`<button onclick="renameMeeting('${m.id}')">✎ 名前を変更</button>`:''}${canEnd?`<button onclick="duplicateMeeting('${m.id}')">▤ 複製</button>`:''}${m.status==='open'&&canEnd?`<button onclick="endMeeting('${m.id}')">✓ 終了して履歴へ</button>`:''}${m.status==='closed'&&canEnd?`<button onclick="toggleActionCompleted('${m.id}')">${m.actionCompleted?'✓ 実行確認を外す':'✓ 実行済みにする'}</button>`:''}${canDelete?`<button class="danger" onclick="deleteMeeting('${m.id}')">🗑 完全削除</button>`:''}</div>`:''}<div class="history-head"><span class="pill ${m.status==='closed'?'closed':''}">${m.status==='closed'?'完了':'進行中'}</span><span>${new Date(m.createdAt).toLocaleDateString('ja-JP')}</span></div><h3>${esc(m.group)}ミーティング</h3><p class="history-theme">${allowed?esc(m.theme||'テーマ未設定'):'🔒 内容は対象者とスタッフのみ閲覧できます'}</p><div class="history-stats"><span>意見 <b>${allowed?m.entries.length:'—'}</b>${allowed?'件':''}</span><span>${new Date(m.createdAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</span>${m.status==='closed'&&allowed?`<span class="history-action-status ${m.actionCompleted?'done':''}">${m.actionCompleted?'実行済み':'未確認'}</span>`:''}</div>${allowed&&m.summary?`<div class="summary-preview">${esc(m.summary).split('\n').join('<br>')}</div>`:''}<div class="actions">${allowed?`<button class="btn primary" onclick="openMeeting('${m.id}')">${m.status==='open'?'続きから':'詳細を見る'}</button>`:`<button class="btn secondary" type="button" onclick="toast('このミーティングの内容は対象者とスタッフだけ閲覧できます。')">🔒 対象外</button>`}</div></article>`}).join('')}</div>`:'<div class="meeting-empty dark-empty"><span>▤</span><b>履歴はまだありません</b><small>ミーティングを保存するとここに表示されます。</small></div>'}<div class="history-bottom-actions"><button class="btn back-action" onclick="go('home')">‹ ホームへ戻る</button></div></section>`;
}

function closeHistoryMenus(exceptId=''){
 document.querySelectorAll('.history-card-menu').forEach(menu=>{ if(menu.id!==`history-menu-${exceptId}`) menu.hidden=true; });
}
function toggleHistoryMenu(event,id){
 event.stopPropagation();
 const menu=document.getElementById(`history-menu-${id}`);
 if(!menu) return;
 const willOpen=menu.hidden;
 closeHistoryMenus(id);
 menu.hidden=!willOpen;
}
function renameMeeting(id){
 closeHistoryMenus();
 const meetings=loadMeetings();
 const m=meetings.find(item=>item.id===id);
 if(!m) return toast('履歴が見つかりません');
 if(!canRenameMeeting(m)) return toast('このミーティングの名前を変更する権限がありません');
 const name=prompt('履歴に表示するテーマ名を入力してください',m.theme||'');
 if(name===null) return;
 const trimmed=name.trim();
 if(!trimmed) return toast('名前を入力してください');
 m.theme=trimmed;
 saveMeetings(meetings); render(); toast('名前を変更しました');
}
function duplicateMeeting(id){
 closeHistoryMenus();
 const meetings=loadMeetings();
 const source=meetings.find(item=>item.id===id);
 if(!source) return toast('履歴が見つかりません');
 const copy=JSON.parse(JSON.stringify(source));
 copy.id=uid('m'); copy.createdAt=Date.now(); copy.closedAt=null; copy.status='open'; copy.ownerName=loadAccount()?.displayName||copy.ownerName; copy.createdByUserId=currentCloudUserId(); copy.createdByRole=loadAccount()?.role||'選手'; copy.theme=`${source.theme||'テーマ未設定'}（コピー）`;
 meetings.push(copy); saveMeetings(meetings); render(); toast('ミーティングを複製しました');
}
function toggleActionCompleted(id){
 closeHistoryMenus();
 const meetings=loadMeetings();
 const m=meetings.find(item=>item.id===id);
 if(!m) return toast('履歴が見つかりません');
 if(!canEndMeeting(m)) return toast('この操作を行う権限がありません');
 m.actionCompleted=!m.actionCompleted;
 m.actionCompletedAt=m.actionCompleted?Date.now():null;
 saveMeetings(meetings); render(); toast(m.actionCompleted?'実行済みにしました':'実行確認を外しました');
}
function endMeeting(id){
 closeHistoryMenus();
 const meetings=loadMeetings();
 const m=meetings.find(item=>item.id===id);
 if(!m) return toast('履歴が見つかりません');
 if(!canEndMeeting(m)) return toast('このミーティングを終了する権限がありません');
 if(m.status==='closed') return toast('このミーティングは終了済みです');
 if(!confirm(`${m.group||''}ミーティング「${m.theme||'テーマ未設定'}」を終了して履歴へ移動しますか？`)) return;
 m.summary=m.summary||makeSummary(m);
 m.status='closed';m.closedAt=Date.now();m.updatedAt=Date.now();
 saveMeetings(meetings);render();toast('ミーティングを終了して履歴へ移動しました');
}
function deleteMeeting(id){
 closeHistoryMenus();
 const meetings=loadMeetings();
 const target=meetings.find(item=>item.id===id);
 if(!target) return toast('履歴が見つかりません');
 if(!canDeleteMeeting(target)) return toast('このミーティングを削除する権限がありません');
 const label=`${target.group||''}ミーティング「${target.theme||'テーマ未設定'}」`;
 if(!confirm(`${label}を完全に削除しますか？\n\nこの操作は元に戻せません。通常は「終了して履歴へ」を使用してください。`)) return;
 saveMeetings(meetings.filter(item=>item.id!==id));
 deleteCloudMeeting(id);
 const deleted=new Set(read('tt_deleted_meeting_ids', [])); deleted.add(id); write('tt_deleted_meeting_ids',[...deleted]);
 if(state.currentMeetingId===id) state.currentMeetingId=null;
 render(); toast('ミーティング履歴を削除しました');
}
document.addEventListener('click',()=>closeHistoryMenus());
function clampScore(value){ return Math.max(0,Math.min(100,Math.round(value||0))); }
function teamMemberCount(){
 const a=loadAccount();
 if(!a) return 1;
 const members=currentTeamMembers();
 return Math.max(1,members.length);
}
function meetingSpeakers(m){ return new Set((m.entries||[]).map(e=>e.name).filter(Boolean)).size; }
function teamScoreMetrics(meetings){
 const closed=meetings.filter(m=>m.status==='closed');
 const memberCount=teamMemberCount();
 const activity=clampScore((closed.length/8)*100);
 const participation=closed.length?clampScore(closed.reduce((n,m)=>n+Math.min(1,meetingSpeakers(m)/memberCount),0)/closed.length*100):0;
 const speaking=closed.length?clampScore(closed.reduce((n,m)=>n+Math.min(1,(m.entries||[]).length/Math.max(1,memberCount*1.5)),0)/closed.length*100):0;
 const action=closed.length?clampScore(closed.filter(m=>m.actionCompleted).length/closed.length*100):0;
 const now=Date.now(), week=7*86400000;
 let activeWeeks=0;
 for(let i=0;i<4;i++){
  const to=now-i*week, from=to-week;
  if(closed.some(m=>{const t=m.closedAt||m.createdAt||0;return t>=from&&t<to;})) activeWeeks++;
 }
 const continuity=clampScore(activeWeeks/4*100);
 const score=clampScore(activity*.20+participation*.25+speaking*.20+action*.20+continuity*.15);
 return {score,activity,participation,speaking,action,continuity,closedCount:closed.length,memberCount};
}
function scoreForMeetingsUntil(meetings,until){
 return teamScoreMetrics(meetings.filter(m=>(m.closedAt||m.createdAt||0)<=until)).score;
}
function metricValueForMeetings(meetings,metric){
 const m=teamScoreMetrics(meetings);
 return metric==='participation'?m.participation:metric==='speaking'?m.speaking:metric==='action'?m.action:metric==='continuity'?m.continuity:m.score;
}
function growthTrendData(meetings,days,metric='score'){
 const now=Date.now();
 const start=now-days*86400000;
 const count=days<=7?7:days<=30?10:days<=180?12:12;
 const span=(now-start)/count;
 return Array.from({length:count},(_,i)=>{
  const to=start+(i+1)*span;
  const subset=meetings.filter(m=>(m.closedAt||m.createdAt||0)<=to);
  const d=new Date(to);
  return {value:metricValueForMeetings(subset,metric),label:days<=7?`${d.getMonth()+1}/${d.getDate()}`:days<=30?`${d.getDate()}日`:`${d.getMonth()+1}月`};
 });
}
function growthTrendSvg(data,label='TEAM SCORE'){
 const w=620,h=190,padX=28,padY=24,max=100;
 const points=data.map((d,i)=>{
  const x=padX+(data.length===1?0:i*(w-padX*2)/(data.length-1));
  const y=h-padY-(d.value/max)*(h-padY*2);
  return {x,y,...d};
 });
 const line=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
 const area=`${padX},${h-padY} ${line} ${w-padX},${h-padY}`;
 return `<div class="growth-chart-wrap"><svg class="growth-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}推移"><defs><linearGradient id="growthArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4759d" stop-opacity=".38"/><stop offset="100%" stop-color="#f4759d" stop-opacity="0"/></linearGradient></defs><line x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}" class="growth-axis"/><polygon points="${area}" fill="url(#growthArea)"/><polyline points="${line}" class="growth-line"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5" class="growth-dot"><title>${p.label}: ${p.value}</title></circle>`).join('')}</svg><div class="growth-chart-labels">${data.map(d=>`<span>${esc(d.label)}</span>`).join('')}</div></div>`;
}
function teamScoreReport(metrics,previous){
 if(!metrics.closedCount) return 'ミーティングを完了すると、TEAM SCOREの測定が始まります。';
 const items=[['参加率',metrics.participation],['発言率',metrics.speaking],['実行率',metrics.action],['継続率',metrics.continuity]];
 const strongest=[...items].sort((a,b)=>b[1]-a[1])[0];
 const weakest=[...items].sort((a,b)=>a[1]-b[1])[0];
 const delta=metrics.score-previous;
 return `${delta>0?`前回より${delta}ポイント上がりました。`:delta<0?`前回より${Math.abs(delta)}ポイント下がっています。`:'前回と同じスコアです。'} 強みは「${strongest[0]}」、次に伸ばしたいのは「${weakest[0]}」です。次回は「${weakest[0]}」を意識したテーマを1つ選びましょう。`;
}
function scoreMetricCard(label,value,note,cls=''){
 return `<div class="team-score-metric ${cls}"><div><span>${label}</span><small>${note}</small></div><strong>${value}<i>%</i></strong><div class="team-score-mini"><b style="width:${value}%"></b></div></div>`;
}
function meetingGroupLabel(m){ return m.type==='position'?(m.group||'未設定'):m.type==='grade'?(m.group||'未設定'):'チーム全体'; }
function comparisonRows(meetings,mode){
 const groups=mode==='position'?TYPES.position.groups:mode==='grade'?TYPES.grade.groups:['チーム全体'];
 return groups.map(group=>{
  const subset=mode==='all'?meetings:meetings.filter(m=>m.type===mode&&m.group===group);
  const metrics=teamScoreMetrics(subset);
  return {group,count:subset.filter(m=>m.status==='closed').length,score:metrics.score,participation:metrics.participation,speaking:metrics.speaking,action:metrics.action};
 });
}
function growthComparisonView(meetings,mode){
 const rows=comparisonRows(meetings,mode);
 return `<div class="growth-comparison-list">${rows.map(row=>`<article class="growth-comparison-row"><div><b>${esc(row.group)}</b><small>${row.count?`${row.count}回の履歴`:'データなし'}</small></div><div class="growth-comparison-score"><strong>${row.count?row.score:'--'}</strong><span>${row.count?'pt':''}</span></div><div class="growth-comparison-bars"><i style="--v:${row.participation}%" title="参加率 ${row.participation}%"></i><i style="--v:${row.speaking}%" title="発言率 ${row.speaking}%"></i><i style="--v:${row.action}%" title="実行率 ${row.action}%"></i></div></article>`).join('')}</div><div class="growth-comparison-legend"><span>参加率</span><span>発言率</span><span>実行率</span></div>`;
}
function growthAchievements(meetings,metrics){
 const closed=meetings.filter(m=>m.status==='closed');
 const unlocked=[
  ['✦','初ミーティング',closed.length>=1],
  ['10','10回達成',closed.length>=10],
  ['90','参加率90%',metrics.participation>=90&&closed.length>=2],
  ['100','発言率100%',metrics.speaking>=100&&closed.length>=2],
  ['80','継続率80%',metrics.continuity>=80&&closed.length>=2],
  ['✓','実行率80%',metrics.action>=80&&closed.length>=2],
 ];
 return `<div class="achievement-grid">${unlocked.map(([icon,label,on])=>`<article class="achievement-card ${on?'unlocked':'locked'}"><span>${icon}</span><b>${label}</b><small>${on?'達成済み':'未達成'}</small></article>`).join('')}</div>`;
}
function growthView(){
 const all=currentTeamMeetings();
 const closed=all.filter(m=>m.status==='closed');
 const metrics=teamScoreMetrics(all);
 const previous=scoreForMeetingsUntil(all,Date.now()-7*86400000);
 const delta=metrics.score-previous;
 const metric=state.growthMetric||'score';
 const metricLabels={score:'TEAM SCORE',participation:'参加率',speaking:'発言率',action:'実行率',continuity:'継続率'};
 const trend=growthTrendData(closed,state.growthRange||30,metric);
 const measuring=metrics.closedCount<2;
 return `<section class="growth-page team-score-page">
   <header class="growth-header"><div><p class="growth-eyebrow">GROWTH TIMELINE</p><h2>チームの成長</h2><p>記録・分析・行動の変化を、チームごとに確認します。</p></div><div class="growth-level-badge">${measuring?'測定中':metrics.score>=80?'S':metrics.score>=65?'A':metrics.score>=50?'B':'C'}</div></header>
   <section class="team-score-hero"><div class="team-score-ring" style="--score:${metrics.score}"><div><strong>${metrics.score}</strong><span>/ 100</span></div></div><div class="team-score-copy"><small>CURRENT TEAM SCORE</small><h3>${measuring?'データを集めています':delta>0?'成長しています':delta<0?'見直しポイントあり':'安定しています'}</h3><p>${measuring?'完了したミーティングが2件以上になると、変化を比較できます。':`7日前から ${delta>=0?'+':''}${delta} pt`}</p></div></section>
   <section class="growth-panel"><div class="growth-panel-title"><div><small>SCORE BREAKDOWN</small><h3>スコアの内訳</h3></div></div><div class="team-score-metrics">
    ${scoreMetricCard('活動量',metrics.activity,`${metrics.closedCount}回完了`,'activity')}
    ${scoreMetricCard('参加率',metrics.participation,`${metrics.memberCount}人を基準`,'participation')}
    ${scoreMetricCard('発言率',metrics.speaking,'意見数から算出','speaking')}
    ${scoreMetricCard('実行率',metrics.action,'履歴で実行確認','action')}
    ${scoreMetricCard('継続率',metrics.continuity,'直近4週間','continuity')}
   </div></section>
   <section class="growth-panel"><div class="growth-panel-title growth-trend-title"><div><small>GROWTH TIMELINE</small><h3>${metricLabels[metric]}推移</h3></div><div class="growth-range">${[[7,'1週間'],[30,'1か月'],[180,'半年'],[365,'1年']].map(([v,l])=>`<button class="${state.growthRange===v?'active':''}" onclick="setGrowthRange(${v})">${l}</button>`).join('')}</div></div><div class="growth-metric-switch">${Object.entries(metricLabels).map(([k,l])=>`<button class="${metric===k?'active':''}" onclick="setGrowthMetric('${k}')">${l}</button>`).join('')}</div>${growthTrendSvg(trend,metricLabels[metric])}<p class="growth-chart-note">0〜100で表示。選択中のチーム履歴だけを集計しています。</p></section>
   <section class="growth-panel"><div class="growth-panel-title growth-trend-title"><div><small>GROUP COMPARISON</small><h3>比較分析</h3></div><div class="growth-range growth-compare-tabs">${[['all','全体'],['position','ポジション'],['grade','学年']].map(([v,l])=>`<button class="${state.growthCompare===v?'active':''}" onclick="setGrowthCompare('${v}')">${l}</button>`).join('')}</div></div>${growthComparisonView(all,state.growthCompare||'all')}</section>
   <section class="growth-panel growth-report"><div class="growth-panel-title"><div><small>ALIA GROWTH INSIGHT</small><h3>今月の変化</h3></div><span class="growth-report-icon">✦</span></div><p>${esc(teamScoreReport(metrics,previous))}</p><div class="growth-report-foot"><span>実行確認 ${closed.filter(m=>m.actionCompleted).length}/${closed.length}件</span><span>更新：${new Date().toLocaleDateString('ja-JP')}</span></div></section>
   <section class="growth-panel"><div class="growth-panel-title"><div><small>ACHIEVEMENT</small><h3>チーム実績</h3></div></div>${growthAchievements(all,metrics)}</section>
 </section>`;
}
function setGrowthRange(days){ state.growthRange=days; render(); }
function setGrowthMetric(metric){ state.growthMetric=metric; render(); }
function setGrowthCompare(mode){ state.growthCompare=mode; render(); }


function inviteCodeView(){
  const a=loadAccount();
  return `<section class="invite-code-page">
    <div class="invite-code-head"><small>TEAM INVITE</small><h2>招待コード</h2><p>このコードを共有すると、メンバーがチームに参加できます。</p></div>
    <div class="invite-code-card">
      <div class="invite-team-label"><span>♟</span><div><small>チーム</small><b>${esc(a.teamName)}</b></div></div>
      <div class="invite-code-value">${esc(a.inviteCode||a.teamCode)}</div>
      <div class="invite-code-actions">
        <button class="btn gold" onclick="copyCode()">コードをコピー</button>
        <button class="btn secondary" onclick="copyInviteLink()">招待リンクをコピー</button>
        <button class="btn secondary" onclick="shareInviteCode()">共有する</button>
      </div>
      <div class="invite-flow-note"><b>参加する人の流れ</b><span>リンクを開く → 名前・ポジション・学年を入力 → チームへ参加</span><small>参加時の役割は「選手」です。監督・コーチ・マネージャーへの変更はメンバー管理から行います。</small></div>
      <p class="invite-code-note">招待コードは大文字・小文字を区別せず入力できます。</p>
    </div>
    <div class="invite-code-bottom"><button class="btn back-action" onclick="go('menu')">‹ メニューへ戻る</button></div>
  </section>`;
}
function copyInviteLink(){
  const url=inviteJoinUrl();
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url).then(()=>toast('招待リンクをコピーしました')).catch(()=>fallbackCopy(url));}
  else fallbackCopy(url);
}
function shareInviteCode(){
  const a=loadAccount();
  const code=a.inviteCode||a.teamCode;
  const url=inviteJoinUrl();
  const text=`TEAM Theory「${a.teamName}」へ参加してください。\n招待コード：${code}\n${url}`;
  if(navigator.share){ navigator.share({title:'TEAM Theory チーム招待',text,url}).catch(()=>{}); }
  else { navigator.clipboard?.writeText(text).then(()=>toast('招待内容をコピーしました')).catch(()=>toast(text)); }
}

function membersView(){
  const a=loadAccount();
  const members=currentTeamMembers();
  const manage=canManageMembers();
  return `<section class="members-page"><div class="members-head"><small>TEAM MEMBERS</small><h2>メンバー管理</h2><p>${esc(a.teamName)}・${members.length}人</p></div>
  <div class="member-toolbar">${manage?`<button class="btn primary member-add-btn" onclick="go('inviteCode')">＋ メンバーを招待</button>`:''}<button class="btn secondary member-refresh-btn" onclick="refreshCloudMembers()">↻ 最新情報</button></div>
  <div class="members-list">${members.map(m=>{const canEdit=manage||m.isCurrent;return `<article class="member-card"><span class="member-avatar">${esc((m.displayName||'?').slice(0,1))}</span><div class="member-info"><b>${esc(m.displayName)}${m.number?` <em>#${esc(m.number)}</em>`:''}</b><small>${esc(m.role)}・${esc(m.position||'未設定')}・${esc(m.grade||'未設定')}・${esc(m.dominantHand||'未設定')}利き</small>${m.captainRole&&m.captainRole!=='なし'?`<span class="member-badge">${esc(m.captainRole)}</span>`:''}</div>${canEdit?`<button class="member-edit" onclick="openMemberEditor('${esc(m.cloudId||m.id)}')">${manage?'編集':'自分を編集'}</button>`:''}</article>`}).join('')||'<div class="members-note">メンバーを追加してください。</div>'}</div>
  <div class="members-note">登録情報はAlia Adviceのポジション・学年別提案と、成長分析に利用します。</div></section>`;
}
let memberEditorState={id:'',member:null};
function openMemberEditor(id=''){
 closeMemberEditor();
 const members=currentTeamMembers();
 const found=id ? members.find(m=>m.id===id || m.cloudId===id) : null;
 if(id && !found){
  toast('編集対象を確認できません。最新情報を取得します。');
  refreshCloudMembers();
  return;
 }
 const member=found ? {...found} : {id:'',cloudId:'',displayName:'',role:'選手',position:'未設定',grade:'未設定',number:'',dominantHand:'未設定',captainRole:'なし'};
 memberEditorState={id:found?(found.cloudId||found.id):'',member};
 const editing=!!found;
 const managerMode=canManageMembers();
 const selfOnly=editing&&member.isCurrent&&!managerMode;
 const roleValue=member.role||'選手';
 const roleField=selfOnly
  ? `<label>役割</label><div class="input member-readonly-field"><span>${esc(roleValue)}</span><small>監督が設定</small></div>`
  : `<label>役割</label><select id="memberRole" class="input member-select">${roleOptions(roleValue)}</select>`;
 const captainField=selfOnly
  ? `<label>キャプテン役</label><div class="input member-readonly-field"><span>${esc(member.captainRole||'なし')}</span><small>監督が設定</small></div>`
  : `<label>キャプテン役</label><select id="memberCaptain" class="input member-select">${optionList(['なし','キャプテン','副キャプテン'],member.captainRole||'なし')}</select>`;
 const html=`<div class="member-modal-backdrop" id="memberModalBackdrop"><form class="member-modal" id="memberEditorForm" novalidate><h3>${selfOnly?'自分のプロフィール編集':editing?'メンバー編集':'メンバー追加'}</h3>${selfOnly?'<p class="member-self-edit-note">名前・ポジション・学年・背番号・利き手を変更できます。役割とキャプテン役は監督が設定します。</p>':''}<label>名前</label><input id="memberName" class="input" value="${esc(member.displayName)}">${roleField}<label>ポジション</label><select id="memberPosition" class="input member-select">${positionOptions(member.position)}</select><label>学年</label><select id="memberGrade" class="input member-select">${gradeOptions(member.grade)}</select><div class="member-form-grid"><div><label>背番号</label><input id="memberNumber" class="input" inputmode="numeric" value="${esc(member.number)}" placeholder="例：5"></div><div><label>利き手</label><select id="memberHand" class="input member-select">${optionList(DOMINANT_HANDS,member.dominantHand)}</select></div></div>${captainField}<div class="member-modal-actions"><button type="button" id="memberCancelBtn" class="btn secondary">キャンセル</button>${editing&&!member.isCurrent&&managerMode?`<button type="button" id="memberDeleteBtn" class="btn danger">削除</button>`:''}<button type="submit" id="memberSaveBtn" class="btn primary">保存</button></div></form></div>`;
 document.body.insertAdjacentHTML('beforeend',html);
 document.body.classList.add('member-modal-open');
 const backdrop=document.getElementById('memberModalBackdrop');
 const form=document.getElementById('memberEditorForm');
 backdrop?.addEventListener('click',e=>{if(e.target===backdrop)closeMemberEditor()});
 document.getElementById('memberCancelBtn')?.addEventListener('click',closeMemberEditor);
 document.getElementById('memberDeleteBtn')?.addEventListener('click',()=>deleteMember(memberEditorState.id));
 form?.addEventListener('submit',async e=>{
  e.preventDefault();
  e.stopPropagation();
  await submitMemberEditor();
 });
 requestAnimationFrame(()=>document.getElementById('memberName')?.focus());
}
function closeMemberEditor(){
 document.querySelector('.member-modal-backdrop')?.remove();
 document.body.classList.remove('member-modal-open');
 memberEditorState={id:'',member:null};
}
let memberEditorSaving=false;
async function submitMemberEditor(){
 if(memberEditorSaving)return;
 const button=document.getElementById('memberSaveBtn');
 memberEditorSaving=true;
 if(button){button.disabled=true;button.textContent='保存中…'}
 console.info('TEAM Theory member save started',memberEditorState.id||'new');
 try{
  await saveMemberEditor();
 }catch(error){
  console.error('submitMemberEditor failed',error);
  toast(cloudErrorMessage(error));
 }finally{
  memberEditorSaving=false;
  const current=document.getElementById('memberSaveBtn');
  if(current){current.disabled=false;current.textContent='保存'}
 }
}
async function refreshCloudMembers(){
 try{
  await loadCloudTeamMembers();
  render();
  toast('メンバー情報を更新しました');
 }catch(error){console.error('refreshCloudMembers failed',error);toast(cloudErrorMessage(error))}
}
async function saveMemberEditor(){
 const name=document.getElementById('memberName')?.value.trim()||'';
 if(!name){toast('名前を入力してください');return false}
 const a=loadAccount();
 const all=loadMembers();
 const stateMember=memberEditorState.member;
 let existing=stateMember ? all.find(m=>(stateMember.cloudId&&m.cloudId===stateMember.cloudId)||(stateMember.id&&m.id===stateMember.id)) : null;
 if(!existing && memberEditorState.id){
  existing=all.find(m=>m.id===memberEditorState.id || m.cloudId===memberEditorState.id);
 }
 if(!existing){
  if(a.cloud){
   throw new Error('クラウドチームへのメンバー追加は招待コードから行ってください。');
  }
  existing={id:uid('mem'),teamId:a.teamId,userId:'',displayName:name,role:'選手',position:'未設定',grade:'未設定',number:'',dominantHand:'未設定',captainRole:'なし',createdAt:Date.now(),cloud:false,isCurrent:false};
  all.push(existing);
 }
 // 編集開始時に保持したクラウドUUIDを最優先し、再描画やローカルIDの影響を受けないようにする。
 const preservedCloudId=[stateMember?.cloudId,stateMember?.id,existing.cloudId,existing.id,memberEditorState.id].find(isUuid)||'';
 const data={
  ...existing,
  id:preservedCloudId || existing.id,
  cloudId:preservedCloudId,
  userId:stateMember?.userId||existing.userId||'',
  teamId:a.teamId,
  displayName:name,
  // 一般メンバーが自分を編集する場合、役割・キャプテン役は既存値を保持する。
  role:canManageMembers()?(document.getElementById('memberRole')?.value||existing.role||'選手'):(existing.role||'選手'),
  position:document.getElementById('memberPosition')?.value||'未設定',
  grade:document.getElementById('memberGrade')?.value||'未設定',
  number:document.getElementById('memberNumber')?.value.trim()||'',
  dominantHand:document.getElementById('memberHand')?.value||'未設定',
  captainRole:canManageMembers()?(document.getElementById('memberCaptain')?.value||existing.captainRole||'なし'):(existing.captainRole||'なし'),
  createdAt:existing.createdAt||Date.now(),
  cloud:!!(existing.cloud||a.cloud),
  isCurrent:stateMember?.isCurrent??existing.isCurrent??false
 };
 if(a.cloud){
  await saveCloudMember(data);
  await loadCloudTeamMembers(a.teamId);
 }else{
  const i=all.findIndex(m=>m.id===existing.id);
  if(i>=0)all[i]={...all[i],...data};else all.push(data);
  saveMembers(all);
 }
 if(data.isCurrent){
  saveAccount({...a,displayName:data.displayName,role:data.role,position:data.position,grade:data.grade});
 }
 closeMemberEditor();
 render();
 toast('メンバー情報を保存しました');
 return true;
}
async function deleteMember(id){
 const member=currentTeamMembers().find(m=>m.id===id || m.cloudId===id);if(!member)return;
 if(member.isCurrent){toast('自分自身は削除できません');return}
 if(!confirm('このメンバーをチームから外しますか？'))return;
 try{
  await deleteCloudMember(member);
  saveMembers(loadMembers().filter(m=>m.id!==member.id && m.cloudId!==member.cloudId));closeMemberEditor();render();toast('メンバーをチームから外しました');
 }catch(error){console.error('deleteMember failed',error);toast(cloudErrorMessage(error))}
}


function menuView(){
 const a=loadAccount();
 return `<section class="menu-page menu-hub-page">
   <div class="menu-page-head menu-hub-head"><div><small>TEAM MENU</small><h2>メニュー</h2><p>${esc(a.teamName)}の情報・設定を選びます。</p></div><img src="./icons/alia-standalone.png?v=0.56.2" alt="Alia"></div>
   <div class="menu-hub-grid">
     ${menuHubItem('👥','チーム情報','チーム名・学校名・カテゴリー・レベル',"go('teamInfo')",'pink')}
     ${menuHubItem('👤','マイプロフィール','名前・役割・ポジション・学年',"go('myProfile')",'pink')}
     ${menuHubItem('▦','招待コード','コードの確認・コピー・共有',"go('inviteCode')",'gold')}
     ${menuHubItem('⇅','データ管理','バックアップ・書き出し・削除',"go('dataManagement')",'blue')}
     ${menuHubItem('✦','Alia設定','提案レベル・詳しさ・通知',"go('aliaSettings')",'pink')}
     ${menuHubItem('Aa','表示設定','文字サイズ・アニメーション',"go('displaySettings')",'blue')}
     ${menuHubItem('?','使い方','基本操作・よくある質問',"go('help')",'gold')}
     ${menuHubItem('ⓘ','アプリ情報','バージョン・更新情報',"go('appInfo')",'blue')}
   </div>
   <div class="menu-hub-secondary">
     <button onclick="goTop()"><span>⇄</span><div><b>チームを切り替える</b><small>トップ画面の保存チームへ戻る</small></div><em>›</em></button>
   </div>
 </section>`;
}
function menuHubItem(icon,title,desc,action,tone='pink'){
 return `<button class="menu-hub-card ${tone}" onclick="${action}"><span class="menu-hub-icon">${icon}</span><span class="menu-hub-copy"><b>${title}</b><small>${desc}</small></span><span class="menu-hub-chevron">›</span></button>`;
}
function menuBack(title,eyebrow='SETTINGS',backView='menu'){
 return `<div class="settings-page-head"><button class="settings-back" onclick="go('${backView}')">‹</button><div><small>${eyebrow}</small><h2>${title}</h2></div></div>`;
}
function settingsCard(title,subtitle,body){
 return `<section class="settings-section-card"><div class="settings-section-title"><h3>${title}</h3>${subtitle?`<p>${subtitle}</p>`:''}</div>${body}</section>`;
}
function teamInfoView(){
 const a=loadAccount();
 const canEdit=a?.isOwner===true;
 const basicBody=canEdit ? `
   <label class="settings-field"><span>チーム名</span><input id="teamInfoName" class="input" value="${esc(a.teamName)}"></label>
   <label class="settings-field"><span>学校名・団体名</span><input id="teamInfoSchool" class="input" value="${esc(a.schoolName||'')}" placeholder="例：Alia高校"></label>
   <label class="settings-field"><span>カテゴリー</span><select id="teamInfoCategory" class="input">${optionList(CATEGORIES,a.category||'未設定')}</select></label>
   <label class="settings-field"><span>チームレベル</span><select id="teamInfoLevel" class="input">${optionList(TEAM_LEVELS,a.teamLevel||'未設定')}</select></label>
 ` : `
   <div class="settings-permission-note">チーム情報の変更は、チームを作成した監督だけが行えます。</div>
   <label class="settings-field"><span>チーム名</span><div class="input settings-readonly-value">${esc(a.teamName)}</div></label>
   <label class="settings-field"><span>学校名・団体名</span><div class="input settings-readonly-value">${esc(a.schoolName||'未設定')}</div></label>
   <label class="settings-field"><span>カテゴリー</span><div class="input settings-readonly-value">${esc(a.category||'未設定')}</div></label>
   <label class="settings-field"><span>チームレベル</span><div class="input settings-readonly-value">${esc(a.teamLevel||'未設定')}</div></label>
 `;
 const policy=a.meetingPolicy||'standard';
 const policyLabels={open:'オープン',standard:'標準（おすすめ）',closed:'クローズド',custom:'カスタム'};
 const meetingSettingsBody=canEdit?`
  <label class="settings-field"><span>運用スタイル</span><select id="meetingPolicy" class="input" onchange="toggleMeetingCustomSettings()"><option value="open" ${policy==='open'?'selected':''}>オープン（全員が内容を閲覧）</option><option value="standard" ${policy==='standard'?'selected':''}>標準（進行中は全員・内容は対象者）</option><option value="closed" ${policy==='closed'?'selected':''}>クローズド（対象者中心）</option><option value="custom" ${policy==='custom'?'selected':''}>カスタム</option></select></label>
  <div id="meetingCustomSettings" class="meeting-custom-settings" ${policy==='custom'?'':'hidden'}>
   <label class="settings-toggle-row"><span><b>進行中を全員に表示</b><small>内容を見られない人にも、誰が何を話しているか表示します。</small></span><input id="meetingShowActive" type="checkbox" ${a.meetingShowActive!==false?'checked':''}></label>
   <label class="settings-field"><span>内容の公開範囲</span><select id="meetingContentScope" class="input"><option value="target" ${(a.meetingContentScope||'target')==='target'?'selected':''}>対象者＋スタッフ</option><option value="all" ${a.meetingContentScope==='all'?'selected':''}>チーム全員</option></select></label>
   <label class="settings-field"><span>意見投稿</span><select id="meetingResponseScope" class="input"><option value="target" ${(a.meetingResponseScope||'target')==='target'?'selected':''}>対象者＋スタッフ</option><option value="all" ${a.meetingResponseScope==='all'?'selected':''}>チーム全員</option></select></label>
   <label class="settings-field"><span>Aliaまとめ</span><select id="meetingAliaScope" class="input"><option value="target" ${a.meetingAliaScope==='target'?'selected':''}>対象者＋スタッフ</option><option value="all" ${(a.meetingAliaScope||'all')==='all'?'selected':''}>チーム全員</option></select></label>
  </div>`:`<div class="settings-readonly-policy"><b>${policyLabels[policy]||policyLabels.standard}</b><small>変更はチームを作成した監督のみ行えます。</small></div>`;
 return `<section class="settings-detail-page">${menuBack('チーム情報','TEAM SETTINGS')}
 ${settingsCard('基本情報',canEdit?'チーム全体に反映される情報です。':'閲覧専用です。',basicBody)}
 ${settingsCard('ミーティング公開設定','学校の方針に合わせて、進行中表示・内容・意見・Aliaまとめの公開範囲を切り替えます。',meetingSettingsBody)}
 ${canEdit?`<div class="settings-actions"><button class="btn primary" onclick="saveTeamInfo()">変更を保存</button></div>${settingsCard('チーム管理','削除すると、この端末のチーム情報と履歴が削除されます。',`<button class="settings-danger-row" onclick="confirmTeamReset()"><span>このチームを削除</span><em>›</em></button>`)}`:''}
 </section>`;
}
function myProfileView(){
 const a=loadAccount();
 return `<section class="settings-detail-page">${menuBack('マイプロフィール','MY PROFILE')}
 ${settingsCard('あなたの情報','名前・ポジション・学年は変更できます。役割は監督が設定します。',`
   <label class="settings-field"><span>名前</span><input id="myProfileName" class="input" value="${esc(a.displayName)}"></label>
   <label class="settings-field"><span>役割</span><div class="input settings-readonly-value settings-role-lock"><span>${esc(a.role||'選手')}</span><small>監督が設定</small></div></label>
   <label class="settings-field"><span>ポジション</span><select id="myProfilePosition" class="input">${positionOptions(a.position||'未設定')}</select></label>
   <label class="settings-field"><span>学年</span><select id="myProfileGrade" class="input">${gradeOptions(a.grade||'未設定')}</select></label>
 `)}
 <div class="settings-actions"><button class="btn primary" onclick="saveMyProfile()">変更を保存</button></div>
 </section>`;
}
function dataManagementView(){
 return `<section class="settings-detail-page">${menuBack('データ管理','DATA MANAGEMENT')}
 ${settingsCard('バックアップ','この端末に保存されたTEAM Theoryのデータを管理します。',`
   <button class="settings-menu-row" onclick="exportTeamData()"><span><b>データを書き出す</b><small>JSON形式でバックアップします</small></span><em>›</em></button>
   <label class="settings-menu-row file-row"><span><b>データを読み込む</b><small>書き出したバックアップを復元します</small></span><input type="file" accept="application/json" onchange="importTeamData(event)"><em>›</em></label>
 `)}
 ${settingsCard('端末データ','削除操作は元に戻せません。',`<button class="settings-danger-row" onclick="confirmAllReset()"><span>この端末の全データを削除</span><em>›</em></button>`)}
 </section>`;
}
function getUiPrefs(){ try{return JSON.parse(localStorage.getItem('teamTheoryUiPrefs')||'{}')}catch(e){return{}} }
function saveUiPrefs(p){ localStorage.setItem('teamTheoryUiPrefs',JSON.stringify({...getUiPrefs(),...p})); applyUiPrefs(); }
function applyUiPrefs(){ const p=getUiPrefs(); document.documentElement.dataset.fontSize=p.fontSize||'normal'; document.documentElement.dataset.motion=p.motion===false?'off':'on'; }
function aliaSettingsView(){
 const p=getUiPrefs();
 return `<section class="settings-detail-page">${menuBack('Alia設定','ALIA SETTINGS')}
 ${settingsCard('提案スタイル','Alia Adviceの表示方法を調整します。',`
   <label class="settings-field"><span>提案レベル</span><select id="aliaLevel" class="input"><option ${p.aliaLevel==='やさしい'?'selected':''}>やさしい</option><option ${!p.aliaLevel||p.aliaLevel==='標準'?'selected':''}>標準</option><option ${p.aliaLevel==='専門的'?'selected':''}>専門的</option></select></label>
   <label class="settings-field"><span>提案の詳しさ</span><select id="aliaDetail" class="input"><option ${p.aliaDetail==='簡潔'?'selected':''}>簡潔</option><option ${!p.aliaDetail||p.aliaDetail==='標準'?'selected':''}>標準</option><option ${p.aliaDetail==='詳しく'?'selected':''}>詳しく</option></select></label>
   <label class="settings-toggle-row"><span><b>通知</b><small>終了したミーティングの振り返りをホームに表示</small></span><input id="aliaNotify" type="checkbox" ${p.aliaNotify?'checked':''}></label>
   <div class="alia-settings-preview"><small>現在の設定</small><b>${esc(p.aliaLevel||'標準')}・${esc(p.aliaDetail||'標準')}</b><span>${p.aliaNotify?'振り返り通知 ON':'振り返り通知 OFF'}</span></div>
 `)}
 <div class="settings-actions"><button class="btn primary" onclick="saveAliaSettings()">設定を保存</button></div>
 </section>`;
}
function displaySettingsView(){
 const p=getUiPrefs();
 return `<section class="settings-detail-page">${menuBack('表示設定','DISPLAY')}
 ${settingsCard('見やすさ','画面表示を端末に合わせて調整します。',`
   <label class="settings-field"><span>文字サイズ</span><select id="displayFont" class="input"><option value="small" ${p.fontSize==='small'?'selected':''}>小さめ</option><option value="normal" ${!p.fontSize||p.fontSize==='normal'?'selected':''}>標準</option><option value="large" ${p.fontSize==='large'?'selected':''}>大きめ</option></select></label>
   <label class="settings-toggle-row"><span><b>アニメーション</b><small>画面内の動きを表示します</small></span><input id="displayMotion" type="checkbox" ${p.motion!==false?'checked':''}></label>
 `)}
 <div class="settings-actions"><button class="btn primary" onclick="saveDisplaySettings()">設定を保存</button></div>
 </section>`;
}
function helpView(){
 return `<section class="settings-detail-page">${menuBack('使い方','HELP')}
 ${settingsCard('基本の流れ','TEAM Theoryは次の順番で使います。',`<ol class="help-steps"><li><b>チームを選ぶ</b><span>トップ画面から保存したチームを開きます。</span></li><li><b>ミーティングを始める</b><span>ポジション別・学年別・全体から選びます。</span></li><li><b>意見を集める</b><span>メンバーの意見をそのまま記録します。</span></li><li><b>Alia Adviceを見る</b><span>選手の意見をもとに次の一歩を確認します。</span></li></ol>`)}
 ${settingsCard('よくある質問','',`<details><summary>履歴はチームごとに分かれますか？</summary><p>はい。現在選択中のチームの履歴だけを表示します。</p></details><details><summary>招待コードはどこにありますか？</summary><p>メニューの「招待コード」から確認できます。</p></details>`)}
 </section>`;
}
function appInfoView(){
 return `<section class="settings-detail-page">${menuBack('アプリ情報','ABOUT')}
 ${settingsCard('TEAM Theory','教わるから、考えるへ。',`<div class="app-info-version"><small>VERSION</small><b>0.56.2</b></div><p class="app-info-copy">選手の意見を主役に、チームの話し合いと成長を支えるアプリです。</p><div class="cloud-foundation-status"><b>学校アカウント基盤</b><span>${cloudConfigured()?'クラウド接続済み':'Supabaseキー設定待ち'}</span></div>`)}
 ${settingsCard('情報','',`<button class="settings-menu-row" onclick="go('appChangelog')"><span><b>更新履歴</b></span><em>›</em></button><button class="settings-menu-row" onclick="go('termsOfUse')"><span><b>利用規約</b></span><em>›</em></button><button class="settings-menu-row" onclick="go('privacyPolicy')"><span><b>プライバシーポリシー</b></span><em>›</em></button>`)}
 ${settingsCard('開発者','',`<div class="developer-card"><small>DEVELOPED BY</small><b>Yuta Kano</b><span>TEAM Theory Project</span><p>© TEAM Theory Project. All rights reserved.</p></div>`)}
 </section>`;
}
function appChangelogView(){
 return `<section class="settings-detail-page">${menuBack('更新履歴','CHANGELOG','appInfo')}
 ${settingsCard('バージョン履歴','主な更新内容を掲載しています。',`<div class="legal-document changelog-list">
   <article><h3>Version 0.56.2</h3><p>アプリ情報に更新履歴・利用規約・プライバシーポリシー・開発者情報を追加しました。</p></article>
   <article><h3>Version 0.56.1</h3><p>ミーティング履歴の公開範囲を改善し、発議・回答・コメント・ミーティング・メンバー情報のリアルタイム同期を追加しました。</p></article>
   <article><h3>Version 0.56.0</h3><p>学校ごとにミーティングの公開範囲を切り替えられる設定を追加しました。</p></article>
   <article><h3>Version 0.55.1</h3><p>Alia設定の反映を改善し、反応しないミーティングアイコンを削除しました。</p></article>
   <article><h3>Version 0.55.0</h3><p>監督発議の操作ボタンの配置・サイズ・色を統一しました。</p></article>
   <article><h3>Version 0.50.0以降</h3><p>クラウドチーム、招待コード、メンバー権限、監督発議、ミーティング共有などの基盤を段階的に追加しました。</p></article>
 </div>`)}
 </section>`;
}
function termsOfUseView(){
 return `<section class="settings-detail-page">${menuBack('利用規約','TERMS OF USE','appInfo')}
 ${settingsCard('TEAM Theory 利用規約','TEAM Theoryをご利用いただく際は、以下の内容をご確認ください。',`<div class="legal-document">
   <h3>1. 利用目的</h3><p>本サービスは、チーム内の円滑なコミュニケーション、情報共有およびミーティング活動を支援する目的で提供します。</p>
   <h3>2. アカウントと招待コードの管理</h3><p>利用者は、自身の端末、招待コードおよび参加情報を適切に管理してください。招待コードを利用目的と関係のない第三者へ共有しないでください。</p>
   <h3>3. 禁止事項</h3><ul><li>他人になりすます行為</li><li>他の利用者への誹謗中傷、嫌がらせ、または不利益を与える行為</li><li>権限を不正に利用する行為</li><li>不正アクセス、データの改ざん、サービス運営を妨げる行為</li><li>法令または公序良俗に反する行為</li></ul>
   <h3>4. チーム管理者の権限</h3><p>チーム管理者は、チーム運営に必要な範囲でメンバーの役割、公開範囲、投稿内容およびチームデータを管理できます。</p>
   <h3>5. サービスの変更・停止</h3><p>機能の改善、保守または安全確保のため、予告なくサービス内容を変更または一時停止する場合があります。</p>
   <h3>6. 免責</h3><p>通信環境、端末、外部サービス等により生じた利用不能やデータ表示の遅延について、可能な範囲で改善に努めますが、すべての損害を保証するものではありません。重要な内容は必要に応じて別途保管してください。</p>
   <h3>7. 規約の変更</h3><p>本規約は、サービス内容の変更等に応じて更新する場合があります。変更後の内容はアプリ内で表示します。</p>
 </div>`)}
 </section>`;
}
function privacyPolicyView(){
 return `<section class="settings-detail-page">${menuBack('プライバシーポリシー','PRIVACY POLICY','appInfo')}
 ${settingsCard('TEAM Theory プライバシーポリシー','サービス提供に必要な範囲で利用者情報を取り扱います。',`<div class="legal-document">
   <h3>1. 取得する情報</h3><ul><li>名前またはニックネーム</li><li>チーム名、学校名、カテゴリーなどのチーム情報</li><li>役割、学年、ポジション、背番号、利き手などのプロフィール情報</li><li>ミーティング、監督発議、回答、コメントおよびAliaまとめの内容</li><li>サービス利用に必要な識別情報および操作日時</li></ul>
   <h3>2. 利用目的</h3><ul><li>チーム管理とメンバー間の情報共有</li><li>ミーティング、監督発議、回答およびコメント機能の提供</li><li>端末間でのデータ同期</li><li>不具合対応、安全性の確保およびサービス改善</li></ul>
   <h3>3. データの保存</h3><p>クラウド共有に必要な情報はSupabaseを利用して保存します。端末内には、表示設定や一部の復旧用データが保存される場合があります。</p>
   <h3>4. 第三者提供</h3><p>法令に基づく場合を除き、本人の同意なく利用者情報を第三者へ提供しません。ただし、サービス提供に必要なクラウド基盤等の委託先では、必要な範囲で情報を取り扱います。</p>
   <h3>5. 公開範囲</h3><p>チーム内の情報は、チーム管理者が設定した役割および公開範囲に基づいて表示されます。招待コードを知る人が参加できる場合があるため、招待コードは適切に管理してください。</p>
   <h3>6. データの修正・削除</h3><p>プロフィール情報は、付与された権限の範囲で修正できます。チームからの退出、メンバー削除またはチームデータの削除は、チーム管理者へご相談ください。</p>
   <h3>7. 安全管理</h3><p>アクセス権限の制御等により情報の保護に努めますが、端末の紛失、招待コードの漏えい等を防ぐため、利用者自身も適切な管理を行ってください。</p>
   <h3>8. ポリシーの変更</h3><p>機能追加や運用方法の変更に応じて、本ポリシーを更新する場合があります。変更後の内容はアプリ内で表示します。</p>
 </div>`)}
 </section>`;
}
function toggleMeetingCustomSettings(){const box=document.getElementById('meetingCustomSettings');if(box)box.hidden=document.getElementById('meetingPolicy')?.value!=='custom';}
async function saveTeamInfo(){
 const a=loadAccount();
 if(!a?.isOwner){toast('チーム情報を変更できるのはチームを作成した監督だけです。');return}
 const next={...a};
 next.teamName=document.getElementById('teamInfoName')?.value.trim()||a.teamName;
 next.schoolName=document.getElementById('teamInfoSchool')?.value.trim()||'';
 next.category=document.getElementById('teamInfoCategory')?.value||'未設定';
 next.teamLevel=document.getElementById('teamInfoLevel')?.value||'未設定';
 next.meetingPolicy=document.getElementById('meetingPolicy')?.value||a.meetingPolicy||'standard';
 next.meetingShowActive=!!document.getElementById('meetingShowActive')?.checked;
 next.meetingContentScope=document.getElementById('meetingContentScope')?.value||a.meetingContentScope||'target';
 next.meetingResponseScope=document.getElementById('meetingResponseScope')?.value||a.meetingResponseScope||'target';
 next.meetingAliaScope=document.getElementById('meetingAliaScope')?.value||a.meetingAliaScope||'all';
 try{
  if(next.cloud){
   const c=cloudClient();
   if(!c) throw new Error('クラウド接続を確認できません。');
   await ensureCloudSession();
   const result=await c.from('teams').update({name:next.teamName,school_name:next.schoolName,category:next.category,team_level:next.teamLevel,meeting_policy:next.meetingPolicy,meeting_show_active:next.meetingShowActive,meeting_content_scope:next.meetingContentScope,meeting_response_scope:next.meetingResponseScope,meeting_alia_scope:next.meetingAliaScope}).eq('id',next.teamId).select('id').maybeSingle();
   if(result.error) throw result.error;
   if(!result.data) throw new Error('チーム情報の更新権限を確認できません。');
  }
  saveAccount(next); toast('チーム情報を保存しました'); render();
 }catch(error){console.error('saveTeamInfo failed',error);toast(cloudErrorMessage(error))}
}
async function saveOwnCloudProfile(member){
 const c=cloudClient();
 const a=loadAccount();
 if(!c||!a?.cloud) throw new Error('クラウド接続を確認できません。');
 await ensureCloudSession();
 const result=await c.rpc('update_my_team_profile',{
  p_team_id:a.teamId,
  p_display_name:member.displayName,
  p_position:member.position||'未設定',
  p_grade:member.grade||'未設定',
  p_number:member.number||'',
  p_dominant_hand:member.dominantHand||'未設定'
 });
 if(result.error) throw result.error;
 return Array.isArray(result.data)?result.data[0]:result.data;
}
async function saveMyProfile(){
 const a=loadAccount();
 const next={...a};
 next.displayName=document.getElementById('myProfileName')?.value.trim()||a.displayName;
 next.role=a.role;
 next.position=document.getElementById('myProfilePosition')?.value||'未設定';
 next.grade=document.getElementById('myProfileGrade')?.value||'未設定';
 const members=loadMembers(); const me=members.find(m=>m.teamId===a.teamId&&m.isCurrent);
 try{
  if(me){
   Object.assign(me,{displayName:next.displayName,position:next.position,grade:next.grade});
   if(a.cloud) await saveOwnCloudProfile(me);
   saveMembers(members);
  }
  saveAccount(next);toast('プロフィールを保存しました');render();
 }catch(error){console.error('saveMyProfile failed',error);toast(cloudErrorMessage(error))}
}
function saveAliaSettings(){
 saveUiPrefs({aliaLevel:document.getElementById('aliaLevel')?.value||'標準',aliaDetail:document.getElementById('aliaDetail')?.value||'標準',aliaNotify:!!document.getElementById('aliaNotify')?.checked});
 render();
 setTimeout(()=>toast('Alia設定を保存しました。次のAliaまとめから反映されます'),0);
}
function saveDisplaySettings(){
 saveUiPrefs({fontSize:document.getElementById('displayFont')?.value||'normal',motion:!!document.getElementById('displayMotion')?.checked});
 toast('表示設定を保存しました');
}
function exportTeamData(){
 const data={version:'0.56.2',exportedAt:new Date().toISOString(),localStorage:{}};
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith('teamTheory')) data.localStorage[k]=localStorage.getItem(k)}
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`TEAM_Theory_backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); toast('バックアップを書き出しました');
}
function importTeamData(event){
 const file=event.target.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{try{const data=JSON.parse(reader.result); Object.entries(data.localStorage||{}).forEach(([k,v])=>localStorage.setItem(k,v)); toast('バックアップを読み込みました'); setTimeout(()=>location.reload(),400)}catch(e){alert('バックアップを読み込めませんでした。')}}; reader.readAsText(file);
}
function confirmTeamReset(){ if(confirm('現在のチームを削除しますか？\n履歴と設定も削除されます。')) resetAll(); }
function confirmAllReset(){ if(confirm('この端末のTEAM Theoryデータをすべて削除しますか？')){localStorage.clear();location.reload();} }

function createMeeting(group){ const a=loadAccount(); const meetings=loadMeetings(); const m={id:uid(),teamId:a.teamId,type:state.selectedType,group,themeCategory:'',theme:'',aliaContext:null,entries:[],summary:'',status:'open',createdAt:Date.now(),ownerName:a.displayName,ownerPosition:a.position||'未設定',ownerGrade:a.grade||'未設定',createdByUserId:currentCloudUserId(),createdByRole:a.role||'選手',updatedAt:Date.now()}; meetings.push(m);saveMeetings(meetings);state.currentMeetingId=m.id;state.view='room';render(); }
function getCurrent(){return loadMeetings().find(m=>m.id===state.currentMeetingId)}
function mutate(fn){const ms=loadMeetings();const i=ms.findIndex(m=>m.id===state.currentMeetingId);if(i<0)return;fn(ms[i]);ms[i].updatedAt=Date.now();saveMeetings(ms);}
function updateThemeCategory(v){mutate(m=>{m.themeCategory=v;m.aliaContext=classifyAliaContext(m)});render()}
function updateTheme(v){mutate(m=>{m.theme=v;m.aliaContext=classifyAliaContext(m)})}
function addEntry(){const m=getCurrent();const category=document.getElementById('themeCategory')?.value||m?.themeCategory||'';const theme=document.getElementById('theme')?.value.trim()||m?.theme||'';const name=document.getElementById('name').value.trim();const text=document.getElementById('text').value.trim();if(!category){toast('今日のテーマを選択してください');return}if(!theme){toast('具体的なテーマを入力してください');return}if(!name||!text){toast('名前と意見を入力してください');return}mutate(item=>{item.themeCategory=category;item.theme=theme;item.entries.push({name,text,createdAt:Date.now()});item.aliaContext=classifyAliaContext(item)});render();toast('意見を追加しました')}
function buildAdaptiveAdviceSections(m,plan){
 const theme=(m.theme||'').trim();
 const voices=(m.entries||[]).map(e=>e.text||'').join(' ');
 const category=m.themeCategory||'';
 const text=`${theme} ${voices}`;
 const first=(m.entries||[]).map(e=>(e.text||'').trim()).find(Boolean)||theme||'今回のテーマ';
 const compact=value=>String(value||'').replace(/^・/gm,'').replace(/\n+/g,'／');
 const positionKey=positionKeyForMeeting(m);
 const positionPlan=positionPlanOverride(m,voices,theme);
 if(positionKey && positionPlan){
   const labels={
     setter:[['🎯','配球・精度'],['👀','判断基準'],['📊','確認']],
     middle:[['👣','助走・テンポ'],['🤝','連携'],['📊','確認']],
     outside:[['🏐','攻撃準備'],['👀','打ち分け'],['📊','確認']],
     opposite:[['🔀','攻撃の選択'],['🤝','連動'],['📊','確認']],
     libero:[['📍','返球・守備位置'],['🗣','共有'],['📊','確認']]
   }[positionKey];
   const methods=String(positionPlan.method||'').split(/\n+/).map(x=>x.replace(/^・/,''));
   return labels.map((item,i)=>({icon:item[0],label:item[1],text:methods[i]||methods[methods.length-1]||compact(positionPlan.method)}));
 }

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
 if(/ミドル|クイック|速攻/.test(text)){
   return [
    {icon:'🏐',label:'合わせる',text:'セッターとミドルで助走開始とトス位置を確認し、A・Bクイックを各10本ずつ合わせます。'},
    {icon:'👀',label:'使う条件',text:'良い返球時は相手ミドルの位置を確認し、中央に残ればサイド、外へ寄ればクイックを選びます。'},
    {icon:'📊',label:'確認する',text:'ローテーション別のミドル配球本数と決定率を記録し、次回は増やす場面を1つ決めます。'}
   ];
 }
 if(/トス|セッター|配球/.test(text)){
   return [
    {icon:'🎯',label:'精度',text:'同じ助走・同じ構えから3か所へ各10本上げ、打点からずれた方向を記録します。'},
    {icon:'👀',label:'判断',text:'返球前に相手ブロックと自チームの助走を確認し、第一候補と第二候補を決めます。'},
    {icon:'📊',label:'配球確認',text:'ローテーション別の配球本数と決定率を振り返り、偏りが出た理由を1つ整理します。'}
   ];
 }
 if(/レセプション|サーブレシーブ|返球/.test(text)){
   return [
    {icon:'📍',label:'立ち位置',text:'サーバーの位置と球種に合わせ、前後左右の担当範囲をサーブ前に短く確認します。'},
    {icon:'🏐',label:'反復',text:'狙う返球位置を決め、同じ球種を5本連続で受けて成功数を記録します。'},
    {icon:'🔁',label:'切り返し',text:'返球後すぐ攻撃準備へ移るところまでを1セットにし、止まらず連続で練習します。'}
   ];
 }
 if(/サーブ/.test(text)){
   return [
    {icon:'🎯',label:'狙い',text:'打つ前にゾーンか選手を1つ決め、10本中何本狙いどおりに入ったか記録します。'},
    {icon:'🔁',label:'ルーティン',text:'構え・呼吸・トス・スイングの順番を固定し、練習から毎回同じ手順で打ちます。'},
    {icon:'📊',label:'効果確認',text:'イン率だけでなく、相手を崩した本数と次の攻撃につながった割合も確認します。'}
   ];
 }
 if(/ブロック/.test(text)){
   return [
    {icon:'👀',label:'見る順番',text:'返球→セッター→アタッカーの順に視線を移し、助走方向から打点を予測します。'},
    {icon:'🤝',label:'連携',text:'隣のブロッカーと「誰がどこを止めるか」をサーブ前に短い言葉で共有します。'},
    {icon:'📊',label:'振り返り',text:'タッチ本数、止めたコース、抜かれた場所を記録し、次回の基準位置を調整します。'}
   ];
 }
 if(/ディグ|レシーブ|守備/.test(text)){
   return [
    {icon:'📍',label:'守備位置',text:'相手の助走方向とブロック位置を見て、打たれる前に基本位置から半歩調整します。'},
    {icon:'🏐',label:'練習',text:'コースを限定したスパイクを5本ずつ受け、構えの早さと返球位置を確認します。'},
    {icon:'🔁',label:'次の動き',text:'ディグ後に止まらず助走・カバーへ移るところまでを連続動作として練習します。'}
   ];
 }
 if(/スパイク|アタック|決定率/.test(text)){
   return [
    {icon:'👣',label:'助走',text:'助走開始位置と最後の2歩を固定し、同じ打点で打てるか動画か目印で確認します。'},
    {icon:'👀',label:'打ち分け',text:'ブロックの手と守備位置を見て、強打・フェイント・ブロックアウトを選びます。'},
    {icon:'📊',label:'評価',text:'決定・継続・ミスを10本単位で記録し、最も得点につながった打ち方を残します。'}
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
 }else if(/私生活|生活習慣|夜更かし|遅刻|時間管理/.test(joined)){
   issue='生活のリズムや準備のばらつきが、練習への集中とチーム行動に影響しています。';
   action='全員が守れる最低限の生活ルールを一つ決め、短期間で試します。';
   method='・起床、就寝、集合準備の時刻を3日間記録する\n・改善する項目を一つだけ選ぶ\n・1週間後に続いた日数と理由を確認する';
 }else if(/勉強|学習|宿題|テスト|進路|両立/.test(joined)){
   issue='部活動と学習の予定が整理されず、直前に負担が集中しています。';
   action='締切から逆算し、練習日でも続けられる短い学習時間を固定します。';
   method='・課題を15〜30分単位に分ける\n・練習日の学習枠を前日に決める\n・週末に予定と実績を見比べて調整する';
 }
 const positionOverride=positionPlanOverride(m,joined,theme);
 if(positionOverride){ issue=positionOverride.issue; action=positionOverride.action; method=positionOverride.method; }
 return applyGradePerspective(m,{issue,action,method});
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
 const ctx=classifyAliaContext(m);
 return `分類：${categoryLabel||'未選択'}\nAI分類：${ctx.domainLabel}（${ctx.audience}）\nテーマ：${theme}\n\n【課題】\n${plan.issue}\n\n【行動】\n${plan.action}\n\n【方法】\n${plan.method}\n\n【元の発言】\n${points}`;
}
function composeSummary(){
 const m=getCurrent();
 if(!m) return '';
 const plan=parseActionPlan(m.summary || makeSummary(m),m);
 const points=(m.entries||[]).length ? m.entries.map((e,i)=>`${i+1}. ${e.text}（${e.name}）`).join('\n') : 'まだ意見はありません。';
 const categoryLabel=themeCategoryLabel(m.type,m.themeCategory||'');
 const ctx=classifyAliaContext(m);
 return `分類：${categoryLabel||'未選択'}\nAI分類：${ctx.domainLabel}（${ctx.audience}）\nテーマ：${m.theme||'今回のテーマ'}\n\n【課題】\n${plan.issue}\n\n【行動】\n${plan.action}\n\n【方法】\n${plan.method}\n\n【元の発言】\n${points}`;
}
function openSummary(){const m=getCurrent();if(m&&!canViewMeetingAlia(m)){toast('Aliaまとめは対象者とスタッフのみ閲覧できます。');return}state.view='summary';render()}
function finalize(){const m=getCurrent();if(!m){toast('ミーティングが見つかりません');return}if(!canEndMeeting(m)){toast('このミーティングを終了する権限がありません');return}const s=composeSummary();mutate(item=>{item.summary=s;item.status='closed';item.closedAt=Date.now()});state.view='meetings';render();toast('ミーティングを保存しました')}
function resume(id){const meeting=loadMeetings().find(m=>m.id===id);if(!meeting){toast('ミーティングが見つかりません');return}if(!canViewMeetingContent(meeting)){toast('このミーティングの内容は対象者とスタッフだけ閲覧できます。');return}state.currentMeetingId=id;const m=getCurrent();state.selectedType=TYPES[m?.type]?m.type:null;state.view=m?.status==='closed'?'summary':'room';render()}
function switchTeam(teamId){
 const account=loadAccounts().find(a=>a.teamId===teamId);
 if(!account){toast('保存したチームが見つかりません');return}
 localStorage.setItem('tt_active_team',teamId);
 write('tt_account',account);
 state.selectedType=null; state.selectedGroup=null; state.currentMeetingId=null; state.view='home'; render();
 startTeamRealtime();
 refreshCloudData({renderAfter:true,reason:'team switch'});
}
function goTop(){ state.selectedType=null; state.selectedGroup=null; state.currentMeetingId=null; state.view='welcome'; render(); }
function go(v){if(v==='notifications')markDirectorNotificationsSeen();state.view=v;render()}
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

document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleCloudRefresh('app visible')});
window.addEventListener('focus',()=>scheduleCloudRefresh('window focus'));
window.addEventListener('online',()=>scheduleCloudRefresh('online'));
setInterval(()=>{if(!document.hidden)scheduleCloudRefresh('periodic')},120000);

applyUiPrefs();

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js?v=0.56.2', { updateViaCache: 'none' })
    .then(reg => {
      reg.update().catch(()=>{});
      setInterval(() => reg.update().catch(()=>{}), 60 * 1000);
    })
    .catch(()=>{});
}
const startupInviteCode=inviteCodeFromUrl();
if(startupInviteCode) state.view='joinTeam';
render();
initializeCloud();

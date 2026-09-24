const $ = id => document.getElementById(id);
let activeTool = 'ҚМЖ / қысқа мерзімді жоспар';
let lastResult = '';
let chat = [];
const HISTORY_KEY = 'ustaziq_history_v2';

const descriptions = {
 'ҚМЖ / қысқа мерзімді жоспар':'Бір сұраныспен дайын, қолдануға болатын оқу материалын жасаңыз.',
 'Сабақ жоспары':'Сабақтың мақсаты, кезеңдері мен тапсырмаларын толық дайындаңыз.',
 'БЖБ / ТЖБ':'Бағалау тапсырмаларын, дескрипторлар мен балл қоюды құрастырыңыз.',
 'Тест / бақылау жұмысы':'Сыныпқа сай тест немесе бақылау жұмысын жауап кілтімен жасаңыз.',
 'Көрнекілік':'Плакатқа, карточкаға, слайдқа дайын мәтін мен идеяларды алыңыз.',
 'Тәрбие сағаты':'Тәрбие сағатының толық сценарийін және тапсырмаларын жасаңыз.',
 'Анықтама / есеп':'Мектепке арналған ресми анықтама, есеп немесе ақпараттық мәтін жасаңыз.',
 'Қаулы / хаттама':'Отырысқа арналған қаулы, хаттама және шешім жобасын дайындаңыз.',
 'Мінездеме':'Оқушыға немесе қызметкерге арналған сауатты мінездеме құрастырыңыз.',
 'Эссе / шығарма':'Жоспары бар, мазмұнды эссе немесе шығарма дайындаңыз.',
 'Мәтінді түзету / аудару':'Мәтінді сауатты түзетіңіз немесе қажетті тілге аударыңыз.',
 'Идея / жоба':'Сабаққа, мектеп іс-шарасына немесе жобаға нақты идеялар беріңіз.'
};
const toolHints = {
 'ҚМЖ / қысқа мерзімді жоспар':'ҚМЖ жаса. Оқу мақсаты, сабақ мақсаты, кезеңдері, тапсырмалар, бағалау критерийі, дескриптор және рефлексия болсын.',
 'Сабақ жоспары':'Толық сабақ жоспарын жаса. Қызығушылықты ояту, жаңа сабақ, бекіту, бағалау және қорытынды болсын.',
 'БЖБ / ТЖБ':'БЖБ/ТЖБ тапсырмаларын жаса. Балл саны мен жауап кілтін көрсет.',
 'Тест / бақылау жұмысы':'10-15 тапсырмадан тұратын тест жаса. Соңында жауап кілтін бер.',
 'Көрнекілік':'Мұғалімге дайын көрнекілік мәтінін және оны безендіру идеясын жаса.',
 'Тәрбие сағаты':'Тәрбие сағатының мақсаты, барысы, жағдаяттары, ойындары және рефлексиясын жаса.',
 'Анықтама / есеп':'Ресми стильде дайын анықтама немесе есеп жаз.',
 'Қаулы / хаттама':'Отырысқа арналған хаттама мен қаулы жобасын дайында.',
 'Мінездеме':'Ресми, сауатты мінездеме жаса.',
 'Эссе / шығарма':'Кіріспе, негізгі бөлім, қорытындысы бар мазмұнды мәтін жаса.',
 'Мәтінді түзету / аудару':'Мәтінді сауатты өңдеп, қажет болса аудар.',
 'Идея / жоба':'Мұғалімге пайдалы бірнеше нақты идея және іске асыру қадамдарын ұсын.'
};
function setTool(tool){
  activeTool = tool; $('pageTitle').textContent = tool; $('pageDesc').textContent = descriptions[tool] || descriptions['ҚМЖ / қысқа мерзімді жоспар'];
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tool===tool));
  $('topic').placeholder = toolHints[tool] || 'Тапсырмаңызды нақты жазыңыз...';
}
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return[]}}
function saveHistory(item){const arr=[item,...getHistory()].slice(0,18);localStorage.setItem(HISTORY_KEY,JSON.stringify(arr));renderHistory()}
function renderHistory(){
  const arr=getHistory();
  $('history').innerHTML = arr.length ? arr.map((x,i)=>`<div class="history-item"><div><b>${esc(x.tool)}</b><span>${esc(x.topic).slice(0,115)}</span><small>${new Date(x.createdAt).toLocaleString('kk-KZ')}</small></div><button data-index="${i}">Ашу</button></div>`).join('') : '<div class="history-empty">Әзірге материал жоқ.</div>';
  $('history').querySelectorAll('button').forEach(btn=>btn.onclick=()=>loadHistory(Number(btn.dataset.index)));
}
function loadHistory(i){const x=getHistory()[i]; if(!x)return; setTool(x.tool); $('topic').value=x.topic; lastResult=x.text; renderResult(x.text, 'Тарихтан ашылды'); enableActions(true); window.scrollTo({top:0,behavior:'smooth'});}
function renderResult(text,meta='AI жауабы дайын'){$('result').classList.remove('empty');$('result').textContent=text;$('resultMeta').textContent=meta}
function enableActions(v){['copyBtn','downloadBtn','printBtn'].forEach(id=>$(id).disabled=!v)}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2400)}
function esc(s){return String(s).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
async function generate(){
 const topic=$('topic').value.trim(); if(!topic){toast('Тақырыпты немесе тапсырманы жазыңыз.');$('topic').focus();return;}
 $('generateBtn').disabled=true; $('generateBtn').innerHTML='<span class="spinner"></span><b>AI жасап жатыр...</b>'; renderResult('Материал дайындалып жатыр...','AI өңдеп жатыр');
 try{
   const payload={tool:activeTool,subject:$('subject').value.trim(),grade:$('grade').value.trim(),topic,requirements:$('requirements').value.trim(),format:$('format').value,duration:$('duration').value,language:$('language').value,sourceText:$('sourceText').value};
   const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const d=await r.json(); if(!r.ok) {
     let msg=d.error||'Қате';
     if(r.status===401) msg='API кілті дұрыс емес немесе жарамсыз. .env ішіндегі OPENAI_API_KEY мәнін тексеріңіз.';
     if(r.status===429) msg='API лимитіне немесе баланс шегіне жетті. API аккаунтын тексеріңіз.';
     throw new Error(msg);
   }
   lastResult=d.text; renderResult(d.text,`AI • ${d.model}`); enableActions(true); saveHistory({tool:activeTool,topic,text:d.text,createdAt:new Date().toISOString()}); toast('Материал дайын!');
 }catch(e){renderResult(e.message,'Қате');enableActions(false)}finally{$('generateBtn').disabled=false;$('generateBtn').innerHTML='<span>✨</span><b>AI арқылы жасау</b><kbd>Ctrl ↵</kbd>'}
}
async function sendChat(){
 const text=$('chatInput').value.trim(); if(!text)return; chat.push({role:'user',content:text}); appendBubble('user',text);$('chatInput').value='';$('sendChatBtn').disabled=true;
 const loadingId='loading-'+Date.now();appendBubble('assistant','AI жауап дайындап жатыр...',loadingId);
 try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:chat})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Қате');document.getElementById(loadingId)?.remove();chat.push({role:'assistant',content:d.text});appendBubble('assistant',d.text)}catch(e){document.getElementById(loadingId)?.remove();appendBubble('assistant','Қате: '+e.message)}finally{$('sendChatBtn').disabled=false}
}
function appendBubble(role,text,id){const el=document.createElement('div');el.className='bubble '+role;el.textContent=text;if(id)el.id=id;$('chatMessages').appendChild(el);$('chatMessages').scrollTop=$('chatMessages').scrollHeight}
function reset(){['subject','grade','topic','requirements','sourceText'].forEach(id=>$(id).value='');$('sourceFile').value='';$('fileName').textContent='Файл таңдалмады';lastResult='';$('result').className='result empty';$('result').innerHTML='<div class="empty-glyph">✦</div><h3>Материал күтілуде</h3><p>Сол жақтағы өрістерді толтырып, AI арқылы жасау батырмасын басыңыз.</p>';$('resultMeta').textContent='Нәтиже осы жерде пайда болады.';enableActions(false)}

document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
document.querySelectorAll('#quickChips button').forEach(b=>b.onclick=()=>{const [g,s]=b.dataset.preset.split('|');$('grade').value=g;$('subject').value=s;$('topic').focus();toast(`${g} · ${s} таңдалды`);});
$('generateBtn').onclick=generate;$('sendChatBtn').onclick=sendChat;$('newTaskBtn').onclick=reset;$('resetBtn').onclick=reset;$('refreshHistoryBtn').onclick=renderHistory;
$('topic').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')generate()});$('chatInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')sendChat()});
$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(lastResult);toast('Көшірілді')}catch{toast('Көшіру қолжетімсіз')}};
$('downloadBtn').onclick=()=>{const blob=new Blob([lastResult],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ustaziq-material.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),300)};
$('printBtn').onclick=()=>{const w=window.open('','_blank');if(!w){toast('Popup бұғатталған');return}w.document.write(`<html><head><title>USTAZIQ материал</title><style>body{font-family:Arial;line-height:1.6;padding:36px;white-space:pre-wrap}h1{font-size:22px}</style></head><body>${esc(lastResult)}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300)};
$('clearHistoryBtn').onclick=()=>{if(confirm('Жергілікті тарихты толық тазалайсыз ба?')){localStorage.removeItem(HISTORY_KEY);renderHistory();toast('Тарих тазаланды')}};
$('sourceFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;$('fileName').textContent=f.name;const t=await f.text();$('sourceText').value=t.slice(0,60000);toast('Бастапқы материал қосылды')};
$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('ustaziq_dark',document.body.classList.contains('dark')?'1':'0')};
$('healthBtn').onclick=async()=>{try{const r=await fetch('/api/health');const d=await r.json();toast(d.configured?'AI API қосылған':'API кілті қосылмаған')}catch{toast('Серверге қосылу жоқ')}};
(async()=>{if(localStorage.getItem('ustaziq_dark')==='1')document.body.classList.add('dark');setTool(activeTool);renderHistory();try{const r=await fetch('/api/health');const d=await r.json();$('apiStatus').textContent=d.configured?'AI онлайн':'API керек';$('apiStatusText').textContent=d.configured?d.model:' .env файлына кілт қосыңыз';}catch{$('apiStatus').textContent='Сервер жоқ';$('apiStatusText').textContent='npm start іске қосыңыз';}})();

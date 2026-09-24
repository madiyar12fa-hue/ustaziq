const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const BASE_PROMPT = `
Сен USTAZIQ, Қазақстандағы мұғалімдерге арналған кәсіби AI көмекшісісің.
Негізгі тіл — қазақ тілі. Қолданушы басқа тіл сұраса, сол тілде жауап бер.
Ең маңызды талап: қолданушы сұраған тапсырманы нақты орында. Жалпы кеңеске ауыспа.
Болжам жасама; берілмеген деректі ойдан шығарма. Нормативтік/ресми дерек берілсе, оның өзектілігін тексеру керегін ескерт.
Мектеп құжаттарын ресми әрі сауатты тілмен жаз. Оқу материалдарын жас ерекшелігіне сай құрастыр.
Нәтиже толық дайын, көшіріп алып бірден қолдануға болатын форматта болсын.
Егер пайдаланушы нақты сынып, пән, тақырып, уақыт, балл немесе сұрақ санын берсе — сол параметрлерді міндетті түрде сақта.
Кесте сұралса, Markdown кестесімен бер. ҚМЖ сұралса, сабақ кезеңдерін кестемен бер.
Жауапта артық түсіндірме емес, дайын нәтиже басым болсын.
`;

const PROFILES = {
  'ҚМЖ / қысқа мерзімді жоспар': `
ҚМЖ-да: бөлім/тақырып, оқу мақсаты, сабақ мақсаты, бағалау критерийлері, сабақтың кезеңдері, мұғалім әрекеті, оқушы әрекеті, бағалау, ресурстар, саралау, қауіпсіздік, рефлексия, үй тапсырмасы болсын. Оқу мақсаты берілмесе, тақырып пен сыныпқа сәйкес ұсыныс жаса, бірақ оны ұсыныс ретінде белгіле.
`,
  'Сабақ жоспары': `
Толық сабақ жоспарын жаса: мақсат, кіріспе, қызығушылықты ояту, жаңа білім, жұптық/топтық/жеке жұмыс, бекіту, бағалау, рефлексия, үй тапсырмасы.
`,
  'БЖБ / ТЖБ': `
БЖБ/ТЖБ-ны оқу мақсатына сәйкестендір. Әр тапсырмаға балл, дескриптор және соңында жауап үлгісін/кілтін бер. Егер жалпы балл көрсетілмесе, тақырыпқа сай орынды балл саны ұсын.
`,
  'Тест / бақылау жұмысы': `
Тестте нақты сұрақтарды жаса. Сұрақ саны көрсетілсе, дәл соны орында. Көрсетілмесе 10 сұрақ жаса. Бір дұрыс жауапты тест болса A/B/C/D нұсқаларын бер. Соңында жауап кілтін бөлек бер.
`,
  'Көрнекілік': `
Көрнекілікке басып шығаруға болатын қысқа әрі анық мәтін, тақырыптар, карточка/плакат блоктары, мұғалімге арналған орналастыру идеясын бер. Тек идея емес, дайын мәтін жаса.
`,
  'Тәрбие сағаты': `
Толық тәрбие сағаты: тақырып, мақсат, міндеттер, күтілетін нәтиже, көрнекілік, барысы, жағдаят/сұрақтар, ойын/тапсырма, рефлексия, қорытынды.
`,
  'Анықтама / есеп': `
Ресми мектеп құжаты стилін сақта. Құжат атауы, мәтін, қорытынды және қажет болса орындаушы/мерзімге арналған бос орындар болсын.
`,
  'Қаулы / хаттама': `
Хаттама мен қаулыны ресми үлгіде жаса. Күн тәртібі, тыңдалды, сөйледі/қаралды, шешімдері бөлімдерін қамты.
`,
  'Мінездеме': `
Мінездеме үшін ресми құрылым: жалпы мәлімет, оқу/еңбек белсенділігі, тәртібі, қарым-қатынасы, жауапкершілігі, қорытынды, қажет болса қол/күнге орын.
`,
  'Эссе / шығарма': `
Кіріспе, негізгі бөлім, қорытындысы бар толық мәтін жаса. Сынып деңгейіне сәйкес тіл қолдан. Қажет болса жоспарды бөлек көрсет.
`,
  'Мәтінді түзету / аудару': `
Берілген мәтінді мағынасы сақталған күйде сауатты түзет немесе сұралған тілге аудар. Қажет болса алдымен дайын түзетілген/аударылған нұсқаны ғана бер.
`,
  'Идея / жоба': `
Нақты іске асыруға болатын идеялар бер. Әр идеяға мақсат, қадамдар, ресурстар және күтілетін нәтиже қос.
`
};

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const c of item?.content || []) {
      if (c?.type === 'output_text' && typeof c.text === 'string') chunks.push(c.text);
    }
  }
  return chunks.join('\n').trim();
}

async function callOpenAI(input, profile = '') {
  if (!process.env.OPENAI_API_KEY) {
    const e = new Error('OPENAI_API_KEY орнатылмаған. .env файлын ашып, API кілтін енгізіңіз.');
    e.status = 500;
    throw e;
  }
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: `${BASE_PROMPT}\n${profile}`,
      input,
      max_output_tokens: 12000
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const apiMessage = data?.error?.message || `OpenAI API қатесі (${r.status})`;
    const e = new Error(apiMessage);
    e.status = r.status;
    throw e;
  }
  const text = extractText(data);
  if (!text) throw new Error('AI бос жауап қайтарды. Тапсырманы сәл нақтылап, қайта көріңіз.');
  return text;
}

app.post('/api/generate', async (req, res) => {
  try {
    const { tool, subject, grade, topic, requirements, format, duration, language, sourceText } = req.body || {};
    const cleanTopic = String(topic || '').trim();
    if (!cleanTopic) return res.status(400).json({ error: 'Тақырып немесе нақты тапсырманы енгізіңіз.' });
    if (cleanTopic.length < 5) return res.status(400).json({ error: 'Тақырыпты толығырақ жазыңыз.' });

    const profile = PROFILES[tool] || '';
    const prompt = `
ТАПСЫРМА ПАРАМЕТРЛЕРІ
Құрал: ${tool || 'Жалпы AI көмекші'}
Пән: ${subject || 'көрсетілмеген'}
Сынып: ${grade || 'көрсетілмеген'}
Ұзақтығы: ${duration || 'көрсетілмеген'}
Тіл: ${language || 'қазақша'}
Формат: ${format || 'Толық нұсқа'}

Пайдаланушының нақты сұранысы:
${cleanTopic}

Қосымша талаптар:
${String(requirements || 'қосымша талап жоқ').trim()}

Бастапқы материал:
${sourceText ? String(sourceText).slice(0, 80000) : 'берілмеген'}

Орындау ережесі:
1) Сұраныстағы нақты талаптардың барлығын орында.
2) Сұраныс құжат/сабақ/тест болса, тек шаблон емес, мазмұнын толық толтыр.
3) Сұрақ саны, сынып, пән, уақыт, балл сияқты сандарды сақта.
4) Қай бөлім сұралмаса, артық ұзартпа.
5) Нәтиже мұғалімге тікелей қолдануға дайын болсын.
`;

    const text = await callOpenAI(prompt, profile);
    res.json({ ok: true, text, model: MODEL });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message || 'Белгісіз қате' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length) return res.status(400).json({ error: 'Чат хабарламасы қажет.' });
    const clean = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 18000)
    }));
    const text = await callOpenAI(clean);
    res.json({ ok: true, text, model: MODEL });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message || 'Белгісіз қате' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY), model: MODEL }));
app.get('/api/config', (req, res) => res.json({ app: 'USTAZIQ', model: MODEL, tools: Object.keys(PROFILES) }));
app.get(/.*/, (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`USTAZIQ іске қосылды: http://localhost:${PORT}`));

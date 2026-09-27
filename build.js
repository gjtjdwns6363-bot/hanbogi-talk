// 한눈 여행회화 생성기: data/phrases.tsv + data/<code>.json → 루트에 정적 페이지
//   node build.js                  → data/ 의 언어 파일로 빌드
//   DATA=data/_stub node build.js  → 다른 폴더의 언어 파일로 빌드(테스트용)
// 언어 파일이 없거나 JSON이 깨졌으면 그 언어는 건너뛴다. 파일에 없는 id는 그 언어에서만 빠진다.
const fs = require('fs'), path = require('path');
const ROOT = __dirname, SITE = 'https://talk.hanbogi.com', NAME = '한눈 여행회화';
const DATA = path.resolve(ROOT, process.env.DATA || 'data');
const TODAY = new Date().toLocaleDateString('sv-SE');

const LANGS = [
  { code: 'ja', name: '일본어', flag: '🇯🇵', country: '일본', places: '도쿄·오사카·후쿠오카·삿포로', tts: 'ja-JP' },
  { code: 'zh', name: '중국어', flag: '🇨🇳', country: '중국·대만', places: '상하이·베이징·타이베이·홍콩', tts: 'zh-CN', trad: 'zh-TW' },
  { code: 'th', name: '태국어', flag: '🇹🇭', country: '태국', places: '방콕·치앙마이·푸껫·파타야', tts: 'th-TH' },
  { code: 'vi', name: '베트남어', flag: '🇻🇳', country: '베트남', places: '다낭·나트랑·하노이·푸꾸옥', tts: 'vi-VN' },
  { code: 'en', name: '영어', flag: '🇺🇸', country: '영어권', places: '괌·하와이·싱가포르·런던', tts: 'en-US' },
  { code: 'id', name: '인도네시아어', flag: '🇮🇩', country: '인도네시아', places: '발리·자카르타·롬복', tts: 'id-ID' },
  { code: 'es', name: '스페인어', flag: '🇪🇸', country: '스페인·중남미', places: '바르셀로나·마드리드·멕시코', tts: 'es-ES' },
  { code: 'fr', name: '프랑스어', flag: '🇫🇷', country: '프랑스', places: '파리·니스·스위스 제네바', tts: 'fr-FR' },
];
const CAT_ICON = { 인사: '👋', 공항: '🛫', 교통: '🚕', 호텔: '🏨', 식당: '🍜', 쇼핑: '🛍️', 길묻기: '🧭', 긴급: '🚨' };
const POPULAR = ['thanks', 'hello', 'how-much', 'restroom', 'sorry', 'this-one', 'bill', 'help'];

// ---------- 데이터 ----------
const phrases = fs.readFileSync(path.join(ROOT, 'data/phrases.tsv'), 'utf8').trim().split('\n').slice(1)
  .map(l => { const [id, cat, ko] = l.split('\t').map(s => s.trim()); return { id, cat, ko }; });
const P = Object.fromEntries(phrases.map(p => [p.id, p]));
const CATS = [...new Set(phrases.map(p => p.cat))];
const langs = [];
for (const L of LANGS) {
  const f = path.join(DATA, L.code + '.json');
  if (!fs.existsSync(f)) { console.log(`건너뜀: ${L.code} (파일 없음)`); continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(`건너뜀: ${L.code} (JSON 오류 ${e.message})`); continue; }
  L.map = {};
  for (const r of arr) if (r && P[r.id] && r.text && r.kr) L.map[r.id] = r;
  L.count = Object.keys(L.map).length;
  if (L.count) langs.push(L); else console.log(`건너뜀: ${L.code} (유효한 표현 없음)`);
}
const has = (L, id) => langs.includes(L) && !!L.map[id];

// ---------- 공통 조각 ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const say = s => String(s).replace(/○○|OO|〇〇/g, ', ');   // 빈칸은 쉼으로 읽는다
const hl = s => esc(s).replace(/○○/g, '<span class="blank">○○</span>');
const plain = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^\p{L}\p{N}]+/gu, "");
const rom = r => r.roman && plain(r.roman) !== plain(r.text);   // 로마자가 원문과 같거나 강세만 다르면 숨김

function crumbs(items) {   // [[이름, 경로]]
  return ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
}
function faq(qs) {   // [[질문, 답]]
  return ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
}
const faqHtml = qs => `<h2>자주 묻는 질문</h2>${qs.map(([q, a]) => `<details class="card faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}`;

const NAV = `<details class="menu"><summary>☰ 전체 언어</summary><nav>${LANGS.map(L => langs.includes(L)
  ? `<a href="/${L.code}/">${L.flag} ${L.name}</a>` : `<span>${L.flag} ${L.name} <small>준비 중</small></span>`).join('')}<a href="/">🏠 처음으로</a></nav></details>`;

const FOOTER = `<footer>© ${NAME} · <a href="/">전체 언어</a> · <a href="/about.html">사이트 소개·표기 기준</a> · <a href="/privacy.html">개인정보처리방침</a>
<p class="net">한보기 네트워크: <a href="https://calc.hanbogi.com">한눈 계산기</a> · <a href="https://talk.hanbogi.com">한눈 여행회화</a> · <a href="https://home.hanbogi.com">부동산 알리미</a> · <a href="https://grant.hanbogi.com">정부 지원금 찾기</a> · <a href="https://benefit.hanbogi.com">혜택 알리미</a> · <a href="https://license.hanbogi.com">자격증 한눈에</a> · <a href="https://hanbogi.com">오늘의 게임</a> · <a href="https://stay.hanbogi.com">오늘의 숙소</a> · <a href="https://gadget.hanbogi.com">기기 비교소</a></p></footer>`;

function page({ url, title, desc, body, head = '', ogTitle }) {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${NAME}"><meta property="og:locale" content="ko_KR">
<meta property="og:image" content="${SITE}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2f3aa6">
${head}
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/style.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5424435978828190" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-19F8RF6971"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-19F8RF6971");</script>
</head>
<body><header><div class="bar"><a class="logo" href="/">💬 ${NAME}</a>${NAV}</div></header>
<main>
${body}
</main>
${FOOTER}
<div id="toast" role="status" aria-live="polite"></div>
<script src="/app.js" defer></script>
</body></html>
`;
}

// 듣기 버튼: data-say(읽을 문장) data-lang(TTS) data-ln(언어 이름, 안내용)
const btns = (text, tts, ln) => `<div class="play" data-say="${esc(say(text))}" data-lang="${tts}" data-ln="${esc(ln)}"><button type="button" class="p1">▶ 듣기</button><button type="button" class="p2">🐢 천천히</button></div>`;

// 표현 카드(언어 페이지·표현 페이지 공통)
function phraseCard(L, id, { big = false, link = true, showKo = true, showLang = false } = {}) {
  const r = L.map[id], p = P[id];
  const tradRow = L.trad && r.trad && r.trad !== r.text
    ? `<div class="trad"><span class="tag">대만에서는</span> <span class="txt">${hl(r.trad)}</span>${btns(r.trad, L.trad, '중국어(대만)')}</div>` : '';
  return `<div class="card ph${big ? ' big' : ''}" data-tap>
${showLang ? `<div class="lang">${L.flag} ${L.name}</div>` : ''}${showKo ? `<div class="ko">${hl(p.ko)}</div>` : ''}
<div class="kr">${hl(r.kr)}</div>
<div class="txt" lang="${L.tts}">${hl(r.text)}</div>
${rom(r) ? `<div class="rom">${hl(r.roman)}</div>` : ''}
${btns(r.text, L.tts, L.name)}${tradRow}
${r.note && big ? `<p class="note">💡 ${esc(r.note)}</p>` : ''}${link ? `<a class="more" href="/${L.code}/${id}/">자세히 · 주의점 →</a>` : ''}
</div>`;
}

const out = [];   // [url, html]
const emit = (url, html) => out.push([url, html]);

// ---------- 홈 ----------
{
  const cards = LANGS.map(L => langs.includes(L)
    ? `<a class="card lc" href="/${L.code}/"><span class="flag">${L.flag}</span><b>${L.name}</b><span class="hint">${esc(L.places)}</span></a>`
    : `<div class="card lc off"><span class="flag">${L.flag}</span><b>${L.name}</b><span class="hint">준비 중</span></div>`).join('');
  const pop = POPULAR.filter(id => P[id]).map(id => `<div class="card cmp"><h3><a href="/phrase/${id}/">“${esc(P[id].ko)}”</a></h3>${langs.filter(L => has(L, id)).map(L =>
    `<div class="row" data-tap><span class="fl" title="${L.name}">${L.flag}</span><span class="rk"><b>${hl(L.map[id].kr)}</b><small lang="${L.tts}">${hl(L.map[id].text)}</small></span>${btns(L.map[id].text, L.tts, L.name)}</div>`).join('')}
<a class="more" href="/phrase/${id}/">${langs.length}개 언어로 비교 →</a></div>`).join('');
  const byCat = CATS.map(c => `<section id="c-${c}" class="catsec"><h3>${CAT_ICON[c] || ''} ${c}</h3><p class="plist">${phrases.filter(p => p.cat === c).map(p => `<a href="/phrase/${p.id}/">${hl(p.ko)}</a>`).join('')}</p></section>`).join('');
  const qs = [
    ['음성이 안 들려요.', '듣기 버튼은 브라우저에 들어 있는 음성(Web Speech API)을 씁니다. 컴퓨터에 해당 언어 음성이 없으면 소리가 나지 않고 안내가 뜹니다. 휴대폰(아이폰·안드로이드)은 대부분 기본으로 들어 있어요.'],
    ['한국어 발음 표기만 읽어도 통하나요?', '짧은 인사·주문·길 묻기는 대부분 통합니다. 다만 성조가 있는 중국어·태국어·베트남어는 듣기 버튼으로 높낮이를 함께 들어 보는 게 좋아요.'],
    ['인터넷이 없을 때도 쓸 수 있나요?', '한 번 연 페이지는 브라우저에 남아 있어 글자는 볼 수 있지만, 기기에 따라 음성은 인터넷이 필요할 수 있습니다. 출국 전에 필요한 페이지를 열어 두세요.'],
  ];
  emit('/', page({
    url: '/', title: `${NAME} | 일본어·중국어·태국어·베트남어 여행 회화 한국어 발음·듣기`,
    ogTitle: `${NAME} — 8개 나라 기본 회화, 한국어 발음과 음성으로`,
    desc: `일본어·중국어·태국어·베트남어·영어·인도네시아어·스페인어·프랑스어 여행 필수 표현 ${phrases.length}가지를 한국어 발음 표기와 음성 듣기로. 공항·호텔·식당·쇼핑·긴급 상황별 정리.`,
    head: ld({ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, alternateName: ['한보기 여행회화', 'talk.hanbogi.com'], url: SITE + '/', inLanguage: 'ko-KR' }) + faq(qs),
    body: `<h1>💬 ${NAME}</h1>
<p class="lead">여행 가서 바로 쓰는 표현 ${phrases.length}가지. <b>한국어 발음</b>으로 읽고, <b>▶ 듣기</b>로 들어 보세요.</p>
<div class="langs">${cards}</div>
<h2>상황별 바로가기</h2>
<div class="chips">${CATS.map(c => `<a href="#c-${c}">${CAT_ICON[c] || ''} ${c}</a>`).join('')}</div>
<h2>인기 표현 ${langs.length}개 언어 비교</h2>
${pop}
<h2>상황별 전체 표현</h2>
<p class="hint">표현을 누르면 ${langs.length}개 언어로 한 번에 비교해요.</p>
${byCat}
<div class="card stay">🏨 숙소는 정하셨나요? <a href="https://stay.hanbogi.com/">오늘의 숙소에서 여행지 숙소 고르기 →</a></div>
${faqHtml(qs)}`,
  }));
}

// ---------- 언어 페이지 ----------
for (const L of langs) {
  const cats = CATS.filter(c => phrases.some(p => p.cat === c && L.map[p.id]));
  const secs = cats.map(c => `<section id="c-${c}" class="catsec"><h2>${CAT_ICON[c] || ''} ${c}</h2>${phrases.filter(p => p.cat === c && L.map[p.id]).map(p => phraseCard(L, p.id)).join('')}</section>`).join('');
  const ex = L.map.thanks || Object.values(L.map)[0];
  const qs = [
    [`${L.name} 음성이 안 들려요.`, `이 기기에 ${L.name} 음성(${L.tts})이 없으면 소리가 나지 않아요. 휴대폰에서는 대부분 들리고, 컴퓨터는 운영체제 설정에서 ${L.name} 음성을 추가하면 들립니다.`],
    [`${L.name} 한국어 발음 표기는 정확한가요?`, `한국어 표기는 현지 발음에 가깝게 적은 것으로, 완전히 같지는 않아요. ${L.tts.startsWith('zh') || L.tts.startsWith('th') || L.tts.startsWith('vi') ? '성조가 있는 언어라 ' : ''}▶ 듣기로 실제 소리를 함께 들어 보세요.`],
    [`${L.country} 여행에서 가장 많이 쓰는 ${L.name} 표현은?`, `인사(${P[ex.id].ko} = ${ex.kr}), 가격 묻기, 화장실 위치, 계산서 요청이 가장 자주 쓰여요. 이 페이지의 인사·식당·쇼핑 탭부터 익혀 두세요.`],
  ];
  emit(`/${L.code}/`, page({
    url: `/${L.code}/`, title: `${L.name} 여행 회화 ${L.count}가지 — 한국어 발음·음성 | ${NAME}`,
    desc: `${L.country} 여행(${L.places})에서 바로 쓰는 ${L.name} 기본 회화 ${L.count}가지. 인사·공항·교통·호텔·식당·쇼핑·길묻기·긴급 상황별로 한국어 발음 표기와 음성 듣기 제공.`,
    head: crumbs([['홈', '/'], [L.name, `/${L.code}/`]]) + faq(qs),
    body: `<nav class="bc"><a href="/">홈</a> › ${L.name}</nav>
<h1>${L.flag} ${L.name} 여행 회화 ${L.count}가지</h1>
<p class="lead">${esc(L.places)} 여행에서 쓰는 표현을 상황별로 모았어요. <b>큰 글씨가 한국어 발음</b>이에요. 카드를 누르면 들려줘요.</p>
<div class="chips tabs">${cats.map(c => `<a href="#c-${c}">${CAT_ICON[c] || ''} ${c}</a>`).join('')}</div>
${secs}
<div class="card stay">🏨 ${L.country} 여행 준비 중이라면 <a href="https://stay.hanbogi.com/">이 나라 숙소 고르기 →</a></div>
${faqHtml(qs)}
<h2>다른 언어</h2><div class="chips">${langs.filter(x => x !== L).map(x => `<a href="/${x.code}/">${x.flag} ${x.name}</a>`).join('')}</div>`,
  }));

  // ---------- 표현 페이지 ----------
  for (const p of phrases) {
    const r = L.map[p.id]; if (!r) continue;
    const same = phrases.filter(q => q.cat === p.cat && q.id !== p.id && L.map[q.id]);
    const others = langs.filter(x => x !== L && x.map[p.id]);
    const qs = [
      [`${L.name}로 '${p.ko}'는 어떻게 말해요?`, `${r.text}${rom(r) ? ` (${r.roman})` : ''}라고 하고, 한국어로는 '${r.kr}'에 가깝게 읽어요.${r.note ? ' ' + r.note : ''}`],
      [`'${r.kr}' 발음은 어떻게 들어요?`, `이 페이지의 ▶ 듣기 버튼을 누르면 브라우저 ${L.name} 음성으로 읽어 줍니다. 🐢 천천히 버튼은 느린 속도로 들려줘요.`],
    ];
    emit(`/${L.code}/${p.id}/`, page({
      url: `/${L.code}/${p.id}/`, title: `${L.name}로 '${p.ko}' — ${r.kr} 발음·듣기`,
      desc: `${L.name}로 '${p.ko}'는 ${r.text}${rom(r) ? `(${r.roman})` : ''}, 한국어 발음은 '${r.kr}'. ${p.cat} 상황에서 쓰는 ${L.name} 표현을 음성으로 들어 보세요.${r.note ? ' ' + r.note : ''}`.slice(0, 160),
      head: crumbs([['홈', '/'], [L.name, `/${L.code}/`], [p.ko, `/${L.code}/${p.id}/`]]) + faq(qs),
      body: `<nav class="bc"><a href="/">홈</a> › <a href="/${L.code}/">${L.name}</a> › <a href="/${L.code}/#c-${p.cat}">${p.cat}</a></nav>
<h1>${L.name}로 ‘${hl(p.ko)}’</h1>
${phraseCard(L, p.id, { big: true, link: false, showKo: false })}
${p.ko.includes('○○') ? `<p class="hint">○○ 자리에 장소·음식 이름을 넣어 말하세요. 듣기는 ○○ 부분을 잠깐 쉬고 읽어요.</p>` : ''}
<h2>${CAT_ICON[p.cat] || ''} ${p.cat}에서 쓰는 다른 ${L.name}</h2>
<p class="plist">${same.map(q => `<a href="/${L.code}/${q.id}/">${hl(q.ko)} <small>${hl(L.map[q.id].kr)}</small></a>`).join('')}</p>
${others.length ? `<h2>‘${hl(p.ko)}’ 다른 나라 말로</h2>
${others.map(x => `<a class="card row2" href="/${x.code}/${p.id}/"><span class="fl">${x.flag}</span><span><small>${x.name}</small><b>${hl(x.map[p.id].kr)}</b></span></a>`).join('')}
<a class="more" href="/phrase/${p.id}/">한 화면에서 비교하고 듣기 →</a>` : ''}
${faqHtml(qs)}
<p><a href="/${L.code}/">← ${L.name} 여행 회화 전체 보기</a></p>`,
    }));
  }
}

// ---------- 표현별 비교 ----------
for (const p of phrases) {
  const ls = langs.filter(L => L.map[p.id]);
  if (!ls.length) continue;
  const qs = ls.map(L => [`${L.name}로 '${p.ko}'는?`, `${L.map[p.id].text} — 한국어 발음 '${L.map[p.id].kr}'`]);
  const same = phrases.filter(q => q.cat === p.cat && q.id !== p.id);
  emit(`/phrase/${p.id}/`, page({
    url: `/phrase/${p.id}/`, title: `'${p.ko}' ${ls.length}개 나라 말로 — 발음·듣기 | ${NAME}`,
    desc: `'${p.ko}'를 ${ls.map(L => L.name).join('·')}로. ${ls.slice(0, 3).map(L => `${L.name} ${L.map[p.id].kr}`).join(', ')} 등 한국어 발음과 음성 듣기.`.slice(0, 160),
    head: crumbs([['홈', '/'], [`'${p.ko}' ${ls.length}개 나라 말로`, `/phrase/${p.id}/`]]) + faq(qs),
    body: `<nav class="bc"><a href="/">홈</a> › <a href="/#c-${p.cat}">${p.cat}</a></nav>
<h1>‘${hl(p.ko)}’ ${ls.length}개 나라 말로</h1>
<p class="lead">카드를 누르면 그 나라 말로 들려줘요. 큰 글씨가 한국어 발음이에요.</p>
${ls.map(L => phraseCard(L, p.id, { showKo: false, showLang: true })).join('')}
<h2>${CAT_ICON[p.cat] || ''} ${p.cat}에서 쓰는 다른 표현</h2>
<p class="plist">${same.map(q => `<a href="/phrase/${q.id}/">${hl(q.ko)}</a>`).join('')}</p>
${faqHtml(qs)}`,
  }));
}

// ---------- 소개·개인정보 ----------
emit('/about.html', page({
  url: '/about.html', title: `사이트 소개·표기 기준 | ${NAME}`,
  desc: `${NAME}의 한국어 발음 표기 기준, 음성 듣기 방식, 데이터 출처를 설명합니다.`,
  body: `<h1>사이트 소개·표기 기준</h1>
<div class="card"><p>${NAME}은 한국인 여행자가 ${LANGS.length}개 나라에서 바로 쓸 수 있는 기본 표현 ${phrases.length}가지를 <b>현지어 표기·로마자·한국어 발음</b>으로 정리한 무료 사이트입니다.</p>
<h2>한국어 발음 표기</h2><p>외래어 표기법보다 <b>실제 들리는 소리</b>에 가깝게 적었습니다. 한글로 완전히 옮길 수 없는 소리(성조, 비음, 받침 없는 끝소리 등)가 있으니 음성 듣기와 함께 쓰세요. 중국어는 표준어(보통화)·간체 기준이며, “대만에서는” 칸에 대만에서 쓰는 번체 표기나 대만식 표현을 따로 보여 줍니다.</p>
<h2>음성 듣기</h2><p>녹음 파일이 아니라 브라우저에 내장된 음성 합성(Web Speech API)으로 읽습니다. 기기에 해당 언어 음성이 없으면 소리가 나지 않고 안내가 표시됩니다. 입력하거나 들은 내용은 서버로 보내지 않습니다.</p>
<h2>○○ 빈칸 표현</h2><p>“이 기차 ○○ 가요?”처럼 ○○가 있는 표현은 장소·음식 이름을 넣어 쓰는 틀입니다. 듣기에서는 ○○ 부분을 잠깐 쉬고 읽습니다.</p>
<h2>오류 제보</h2><p>표기나 뜻이 어색한 표현이 있으면 gjtjdwns6363@gmail.com 으로 알려 주세요.</p></div>`,
}));
emit('/privacy.html', page({
  url: '/privacy.html', title: `개인정보처리방침 | ${NAME}`, desc: `${NAME} 개인정보처리방침.`,
  body: `<h1>개인정보처리방침</h1><div class="card">
<p>${NAME}(talk.hanbogi.com)은 회원가입이 없고 이름·연락처 등 개인정보를 직접 수집하지 않습니다. 음성 듣기는 사용자의 브라우저 안에서만 처리됩니다.</p>
<p>방문 통계를 위해 Google Analytics를, 광고 게재를 위해 Google AdSense를 사용합니다. 이 서비스들은 쿠키를 사용해 방문 기록을 수집할 수 있으며, 광고 개인 맞춤 설정은 <a href="https://adssettings.google.com">Google 광고 설정</a>에서 끌 수 있습니다.</p>
<p>문의: gjtjdwns6363@gmail.com</p></div>`,
}));

// ---------- 쓰기 ----------
for (const d of [...LANGS.map(L => L.code), 'phrase']) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
for (const [url, html] of out) {
  const f = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${out.filter(([u]) => u !== '/privacy.html').map(([u]) => `<url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`언어 ${langs.length}개(${langs.map(L => `${L.code}:${L.count}`).join(' ')}) · 페이지 ${out.length}개 · sitemap ${out.length - 1}개`);

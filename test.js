// 검사: node test.js (빌드 후). DATA=data/_stub node test.js 로 다른 언어 폴더 검사.
// 1) 언어 파일: phrases.tsv id 전부·필드 빈값·중복·모르는 id  2) 생성 페이지 수  3) 내부 링크  4) sitemap URL 수
const fs = require('fs'), path = require('path');
const ROOT = __dirname, DATA = path.resolve(ROOT, process.env.DATA || 'data');
const CODES = ['ja', 'zh', 'th', 'vi', 'en', 'id', 'es', 'fr'];
let fail = 0;
const bad = m => { fail++; console.log('✗ ' + m); };

const ids = fs.readFileSync(path.join(ROOT, 'data/phrases.tsv'), 'utf8').trim().split('\n').slice(1).map(l => l.split('\t')[0].trim());
const idSet = new Set(ids);
if (idSet.size !== ids.length) bad('phrases.tsv에 중복 id');

let langs = 0, langPages = 0;
for (const c of CODES) {
  const f = path.join(DATA, c + '.json');
  if (!fs.existsSync(f)) { console.log(`- ${c}: 파일 없음(건너뜀)`); continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { bad(`${c}: JSON 오류 ${e.message}`); continue; }
  langs++;
  const seen = new Set(), before = fail;
  for (const r of arr) {
    if (!idSet.has(r.id)) bad(`${c}: 모르는 id ${r.id}`);
    if (seen.has(r.id)) bad(`${c}: 중복 id ${r.id}`);
    seen.add(r.id);
    for (const k of ['text', 'roman', 'kr', ...(c === 'zh' ? ['trad'] : [])])
      if (typeof r[k] !== 'string' || !r[k].trim()) bad(`${c}/${r.id}: ${k} 없음·빈값`);
    if ('note' in r && typeof r.note !== 'string') bad(`${c}/${r.id}: note가 문자열 아님`);   // 빈 note는 없는 것으로 취급
  }
  langPages += 1 + seen.size - arr.filter(r => !idSet.has(r.id) || !r.text || !r.kr).length;
  const miss = ids.filter(i => !seen.has(i));
  if (miss.length) bad(`${c}: id ${miss.length}개 빠짐 (${miss.slice(0, 5).join(', ')}${miss.length > 5 ? ' …' : ''})`);
  if (fail === before) console.log(`✓ ${c}: ${arr.length}개 정상`);
}

// 생성 페이지
const html = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'data' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) html.push(p);
  }
})(ROOT);
const expect = 3 + langPages + (langs ? ids.length : 0);   // 홈·about·privacy + 언어·표현 + 비교
if (html.length !== expect) bad(`페이지 수 ${html.length} ≠ 예상 ${expect} (빌드를 같은 DATA로 했는지 확인)`);
else console.log(`✓ 페이지 ${html.length}개`);

// 내부 링크
let links = 0;
for (const f of html) {
  const s = fs.readFileSync(f, 'utf8');
  for (const [, h] of s.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    links++;
    const t = path.join(ROOT, decodeURI(h));
    if (!(fs.existsSync(t) && (fs.statSync(t).isFile() || fs.existsSync(path.join(t, 'index.html'))))) bad(`${path.relative(ROOT, f)} → 없는 링크 ${h}`);
  }
  if (!/<link rel="canonical"/.test(s) || !/<title>[^<]+<\/title>/.test(s) || !/name="description" content="[^"]+"/.test(s)) bad(`${path.relative(ROOT, f)}: title/description/canonical 누락`);
}
console.log(`✓ 내부 링크 ${links}개 검사`);

// sitemap: privacy 빼고 전부
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (locs.length !== html.length - 1) bad(`sitemap URL ${locs.length} ≠ ${html.length - 1}`);
else console.log(`✓ sitemap URL ${locs.length}개`);
for (const u of locs) {
  const p = u.replace('https://talk.hanbogi.com', '');
  if (!fs.existsSync(path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p))) bad(`sitemap 파일 없음 ${u}`);
}
for (const f of ['CNAME', '.nojekyll', 'robots.txt', 'og.png', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'e386846d4b6f939fd1b440af9728c599.txt'])
  if (!fs.existsSync(path.join(ROOT, f))) bad(`${f} 없음`);

console.log(fail ? `실패 ${fail}건` : '모두 통과');
process.exit(fail ? 1 : 0);

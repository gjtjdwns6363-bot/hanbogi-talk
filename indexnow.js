// IndexNow 전송: 배포(push) 뒤 GitHub Pages 반영을 확인하고 실행한다.
//   node indexnow.js                 → sitemap.xml에서 lastmod가 오늘인 URL
//   node indexnow.js --all           → sitemap.xml 전체
//   node indexnow.js /ja/ https://talk.hanbogi.com/ja/thanks/  → 지정한 URL만
// 네이버 서치어드바이저와 api.indexnow.org(Bing 등 참여 엔진 공유)에 보낸다. 매일 전체를 보내지 말고 바뀐 것만.
const fs = require('fs'), path = require('path');
const HOST = 'talk.hanbogi.com', SITE = `https://${HOST}`, KEY = 'e386846d4b6f939fd1b440af9728c599';
const ENDPOINTS = ['https://searchadvisor.naver.com/indexnow', 'https://api.indexnow.org/indexnow'];

const args = process.argv.slice(2);
let urls;
if (args.length && args[0] !== '--all') urls = args.map(u => u.startsWith('http') ? u : SITE + u);
else {
  const today = new Date().toLocaleDateString('sv-SE');
  const sm = fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8');
  urls = [...sm.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].filter(m => args[0] === '--all' || m[2] === today).map(m => m[1]);
}
if (!urls.length) { console.log('보낼 URL 없음 (오늘 lastmod 없음). --all 또는 URL을 지정하세요.'); process.exit(0); }

(async () => {
  const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls });
  let fail = false;
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
      const t = (await r.text()).slice(0, 200);
      console.log(`${ep} → HTTP ${r.status}${t ? ' ' + t : ''}`);
      if (r.status >= 300) fail = true;   // 200 OK / 202 Accepted(키 확인 대기)
    } catch (e) { console.log(`${ep} → 오류 ${e.message}`); fail = true; }
  }
  console.log(`URL ${urls.length}개 전송`);
  process.exit(fail ? 1 : 0);
})();

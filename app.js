// 듣기: 브라우저 음성(speechSynthesis). .play[data-say][data-lang][data-ln] 안의 .p1(보통)/.p2(천천히), 카드[data-tap] 전체 탭도 재생
(() => {
  const toast = document.getElementById('toast');
  let tt;
  const tell = msg => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 3500); };
  const ss = window.speechSynthesis;

  const voices = () => new Promise(res => {   // 음성 목록은 늦게 채워지는 브라우저가 있다
    const v = ss.getVoices();
    if (v.length) return res(v);
    ss.addEventListener('voiceschanged', () => res(ss.getVoices()), { once: true });
    setTimeout(() => res(ss.getVoices()), 1200);
  });
  const pick = (list, lang) => {
    const norm = s => s.replace('_', '-').toLowerCase(), want = lang.toLowerCase(), base = want.split('-')[0];
    return list.find(v => norm(v.lang) === want) || list.find(v => norm(v.lang).split('-')[0] === base);
  };

  async function speak(box, slow, btn) {
    const { say, lang, ln } = box.dataset;
    if (!ss) return tell('이 브라우저는 음성 듣기를 지원하지 않아요.');
    const v = pick(await voices(), lang);
    if (!v) return tell(`이 기기에는 ${ln} 음성이 없어요(휴대폰에서는 대부분 들려요)`);
    ss.cancel();
    const u = new SpeechSynthesisUtterance(say);
    u.voice = v; u.lang = v.lang; u.rate = slow ? 0.6 : 0.95;
    document.querySelectorAll('.play button.on').forEach(b => b.classList.remove('on'));
    btn && btn.classList.add('on');
    u.onend = u.onerror = () => btn && btn.classList.remove('on');
    ss.speak(u);
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.play button');
    if (btn) return speak(btn.parentElement, btn.classList.contains('p2'), btn);
    if (e.target.closest('a,summary,details')) return;
    const card = e.target.closest('[data-tap]');
    if (card && !getSelection().toString()) { const box = card.querySelector('.play'); speak(box, false, box.querySelector('.p1')); }
  });
})();

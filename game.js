(() => {
  const canvas = document.querySelector('#game');
  const context = canvas.getContext('2d');
  const overlay = document.querySelector('#overlay');
  const startButton = document.querySelector('#startButton');

  const WIDTH = 405;
  const HEIGHT = 720;
  const dates = [
    { day: 19, dow: '土', type: 'sat', off: true },
    { day: 20, dow: '日', type: 'sun', off: true },
    { day: 21, dow: '月', type: 'weekday', off: true },
    { day: 22, dow: '火', type: 'weekday', off: true },
    { day: 23, dow: '水', type: 'weekday', off: true },
    { day: 24, dow: '木', type: 'weekday', off: false },
    { day: 25, dow: '金', type: 'weekday', off: false },
    { day: 26, dow: '土', type: 'sat', off: true },
    { day: 27, dow: '日', type: 'sun', off: true },
  ];

  let ratio = 1;
  let state = 'title';
  let lastTime = 0;
  let paddle;
  let ball;
  let bricks;
  let banner = '';
  let bannerTimer = 0;
  let elapsed = 0;
  let speedScale = 1;
  let nextSpeedUp = 4;
  let raf;
  let audioContext;
  let musicTimer;
  let musicStep = 0;

  function enableAudio() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  }

  function playTone(frequency, duration, volume, type = 'sine', delay = 0) {
    if (!audioContext) return;
    const startAt = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function startMusic() {
    if (!audioContext || musicTimer) return;
    const melody = [523, 659, 784, 659, 587, 698, 784, 698, 523, 659, 880, 784, 698, 659, 587, 523];
    const bass = [131, 147, 165, 147];
    const playStep = () => {
      playTone(melody[musicStep % melody.length], 0.16, 0.035, 'triangle');
      if (musicStep % 4 === 0) playTone(bass[Math.floor(musicStep / 4) % bass.length], 0.22, 0.045, 'sine');
      musicStep += 1;
    };
    musicStep = 0;
    playStep();
    musicTimer = window.setInterval(playStep, 250);
  }

  function stopMusic() {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = undefined;
  }

  function playSfx(kind) {
    if (!audioContext) return;
    if (kind === 'launch') playTone(440, 0.08, 0.06, 'square');
    if (kind === 'paddle') playTone(230, 0.07, 0.06, 'triangle');
    if (kind === 'brick') playTone(570, 0.045, 0.035, 'square');
    if (kind === 'holiday') { playTone(660, 0.08, 0.06, 'triangle'); playTone(880, 0.12, 0.045, 'triangle', 0.06); }
    if (kind === 'workday') { playTone(260, 0.1, 0.06, 'sawtooth'); playTone(180, 0.12, 0.04, 'sawtooth', 0.045); }
    if (kind === 'win') [523, 659, 784, 1047].forEach((note, index) => playTone(note, 0.18, 0.07, 'triangle', index * 0.09));
    if (kind === 'lost') { playTone(330, 0.15, 0.055, 'sine'); playTone(196, 0.28, 0.05, 'sine', 0.13); }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  }

  function resetGame() {
    dates.forEach((date, index) => { date.off = index !== 5 && index !== 6; });
    paddle = { x: WIDTH / 2 - 43, y: 665, width: 86, height: 13 };
    ball = { x: WIDTH / 2, y: 651, radius: 7, vx: 0, vy: 0, served: false };
    bricks = [];
    const colors = ['#8a6dea', '#5f81e7', '#58b7cb'];
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        bricks.push({ x: 38 + column * 48, y: 255 + row * 30, width: 42, height: 23, color: colors[row], alive: true });
      }
    }
    banner = '';
    bannerTimer = 0;
    elapsed = 0;
    speedScale = 1;
    nextSpeedUp = 4;
  }

  function start() {
    cancelAnimationFrame(raf);
    enableAudio();
    stopMusic();
    startMusic();
    resetGame();
    state = 'playing';
    overlay.classList.add('hidden');
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function serve() {
    if (!ball.served) {
      ball.served = true;
      ball.vx = 150;
      ball.vy = -320;
      playSfx('launch');
    }
  }

  function showResult(win) {
    state = win ? 'won' : 'lost';
    stopMusic();
    playSfx(win ? 'win' : 'lost');
    const holidayDays = dates.filter((date) => date.off).map((date) => date.day).join('、');
    const headline = win ? '9連休、完成！' : `あなたの休日は<br><span class="holiday-list">${holidayDays || 'ありません'}${holidayDays ? '日' : ''}</span>`;
    const text = win ? 'シルバーウィークがつながった！' : 'です。';
    startButton.textContent = win ? 'もう一度つくる' : 'もう一度挑戦する';
    overlay.querySelector('.panel').innerHTML = `
      <p class="eyebrow">2026年9月</p>
      <h1>${headline}</h1>
      <p class="intro">${text}</p>
      <button id="startButton" type="button">${startButton.textContent}</button>
      <a class="home-link" href="./">タイトルへ戻る</a>
      <p class="hint">黒い日付をすべて休日に変えるとクリア</p>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('#startButton').addEventListener('click', start, { once: true });
  }

  function continuousRuns() {
    const runs = [];
    let length = 0;
    dates.forEach((date) => {
      if (date.off) length += 1;
      else if (length) { runs.push(length); length = 0; }
    });
    if (length) runs.push(length);
    return runs;
  }

  function runLabel() {
    const runs = continuousRuns();
    return runs.map((count) => `${count === 1 ? '単休' : `${count}連休`}`).join(' ＋ ') || '連休なし';
  }

  function dateRect(index) {
    return { x: 18 + index * 41, y: 154, width: 37, height: 62 };
  }

  // 日付の下端を一枚の壁でつなぐ。日付のすき間・両端からボールが上へ抜けないためのレール。
  function calendarRail() {
    return { x: 8, y: 215, width: WIDTH - 16, height: 8 };
  }

  // 表示ブロックの下側まで判定を広げ、レールと同時に当たっても日付を取りこぼさない。
  function dateHitRect(index) {
    const rect = dateRect(index);
    return { x: rect.x, y: rect.y, width: rect.width, height: calendarRail().y + calendarRail().height - rect.y };
  }

  function circleRectCollision(circle, rect) {
    const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    const dx = circle.x - nearestX;
    const dy = circle.y - nearestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  function bounceFrom(rect) {
    const previousX = ball.x - ball.vx * 0.016;
    const previousY = ball.y - ball.vy * 0.016;
    const horizontal = previousX + ball.radius <= rect.x || previousX - ball.radius >= rect.x + rect.width;
    if (horizontal) ball.vx *= -1;
    else ball.vy *= -1;
  }

  function update(delta) {
    if (bannerTimer > 0) bannerTimer -= delta;
    if (!ball.served) {
      ball.x = paddle.x + paddle.width / 2;
      return;
    }
    elapsed += delta;
    while (elapsed >= nextSpeedUp && speedScale < 1.3) {
      const increase = Math.min(1.03, 1.3 / speedScale);
      ball.vx *= increase;
      ball.vy *= increase;
      speedScale *= increase;
      nextSpeedUp += 4;
    }
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    if (ball.x - ball.radius < 8 || ball.x + ball.radius > WIDTH - 8) ball.vx *= -1;
    ball.x = Math.max(8 + ball.radius, Math.min(WIDTH - 8 - ball.radius, ball.x));

    if (ball.vy > 0 && circleRectCollision(ball, paddle)) {
      const hit = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.vx = hit * 260 * speedScale;
      ball.vy = -Math.max(260, Math.abs(ball.vy));
      ball.y = paddle.y - ball.radius - 1;
      playSfx('paddle');
    }

    for (const brick of bricks) {
      if (brick.alive && circleRectCollision(ball, brick)) {
        brick.alive = false;
        bounceFrom(brick);
        playSfx('brick');
        break;
      }
    }

    for (let index = 0; index < dates.length; index += 1) {
      if (ball.vy < 0 && circleRectCollision(ball, dateHitRect(index))) {
        dates[index].off = !dates[index].off;
        ball.vy = Math.abs(ball.vy);
        ball.y = calendarRail().y + calendarRail().height + ball.radius + 1;
        banner = dates[index].off ? '休日にした！' : '平日に戻った！';
        bannerTimer = 0.65;
        playSfx(dates[index].off ? 'holiday' : 'workday');
        if (dates.every((date) => date.off)) showResult(true);
        break;
      }
    }
    // 日付ブロックに命中しなかった場合も、レールで下へ跳ね返す。
    if (ball.vy < 0 && circleRectCollision(ball, calendarRail())) {
      ball.vy *= -1;
      ball.y = calendarRail().y + calendarRail().height + ball.radius + 1;
    }
    if (ball.y - ball.radius > HEIGHT) showResult(false);
  }

  function roundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function draw() {
    context.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#1b2a49'); sky.addColorStop(0.48, '#101b32'); sky.addColorStop(1, '#080d1b');
    context.fillStyle = sky; context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#ffffff0c';
    for (let y = 105; y < 650; y += 30) context.fillRect(0, y, WIDTH, 1);

    context.textAlign = 'center';
    context.fillStyle = '#b9c9e7'; context.font = '700 13px sans-serif'; context.fillText('2026年9月', WIDTH / 2, 35);
    context.fillStyle = '#ffffff'; context.font = '800 26px sans-serif'; context.fillText(runLabel(), WIDTH / 2, 68);
    context.fillStyle = '#aebbd4'; context.font = '600 11px sans-serif'; context.fillText('黒い日付を休日に変えよう', WIDTH / 2, 91);

    const runs = continuousRuns();
    let runStart = null;
    context.fillStyle = '#637493';
    roundedRect(8, 215, WIDTH - 16, 8, 4); context.fill();

    dates.forEach((date, index) => {
      if (date.off && runStart === null) runStart = index;
      const ends = (!date.off || index === dates.length - 1) && runStart !== null;
      if (ends) {
        const end = date.off ? index : index - 1;
        const first = dateRect(runStart); const last = dateRect(end);
        context.fillStyle = '#ff596466';
        roundedRect(first.x, 222, last.x + last.width - first.x, 4, 2); context.fill();
        runStart = null;
      }
    });

    dates.forEach((date, index) => {
      const rect = dateRect(index);
      const color = !date.off ? '#252b39' : date.type === 'sat' ? '#2d7dd2' : '#e84d5b';
      context.shadowColor = date.off ? color : '#000'; context.shadowBlur = date.off ? 10 : 2;
      context.fillStyle = color; roundedRect(rect.x, rect.y, rect.width, rect.height, 7); context.fill(); context.shadowBlur = 0;
      context.fillStyle = date.type === 'sat' ? '#a9d9ff' : date.type === 'sun' ? '#ffbbc1' : '#e6eaf1';
      context.font = '800 10px sans-serif'; context.textAlign = 'right'; context.fillText(date.dow, rect.x + rect.width - 5, rect.y + 14);
      context.fillStyle = '#fff'; context.textAlign = 'center'; context.font = '800 22px sans-serif'; context.fillText(date.day, rect.x + rect.width / 2, rect.y + 42);
    });

    bricks.filter((brick) => brick.alive).forEach((brick) => {
      context.fillStyle = brick.color; roundedRect(brick.x, brick.y, brick.width, brick.height, 5); context.fill();
      context.fillStyle = '#ffffff2e'; context.fillRect(brick.x + 4, brick.y + 4, brick.width - 8, 3);
    });
    context.fillStyle = '#9caed0'; context.font = '700 11px sans-serif'; context.textAlign = 'center'; context.fillText('ブロックを崩して日付をねらえ', WIDTH / 2, 241);

    context.fillStyle = '#e7edf9'; roundedRect(paddle.x, paddle.y, paddle.width, paddle.height, 7); context.fill();
    context.fillStyle = '#ff6370'; context.beginPath(); context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#fff6'; context.beginPath(); context.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2); context.fill();
    if (!ball.served && state === 'playing') { context.fillStyle = '#c5d0e9'; context.font = '700 12px sans-serif'; context.textAlign = 'center'; context.fillText('タップして発射', WIDTH / 2, 625); }
    if (bannerTimer > 0) { context.fillStyle = banner.includes('休日') ? '#ffbec4' : '#f0c878'; context.font = '800 18px sans-serif'; context.textAlign = 'center'; context.fillText(banner, WIDTH / 2, 126); }
  }

  function loop(time) {
    const delta = Math.min((time - lastTime) / 1000, 0.03);
    lastTime = time;
    if (state === 'playing') update(delta);
    draw();
    if (state === 'playing') raf = requestAnimationFrame(loop);
  }

  function movePaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    paddle.x = Math.max(8, Math.min(WIDTH - 8 - paddle.width, x - paddle.width / 2));
  }

  canvas.addEventListener('pointermove', (event) => { if (state === 'playing') movePaddle(event.clientX); });
  canvas.addEventListener('pointerdown', (event) => { if (state === 'playing') { movePaddle(event.clientX); serve(); } });
  window.addEventListener('resize', () => { resize(); draw(); });
  startButton.addEventListener('click', start);
  resize(); resetGame(); draw();
})();

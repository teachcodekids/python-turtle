const byId = id => document.getElementById(id);
const canvas = byId('canvas');
const ctx = canvas.getContext('2d');
const stage = byId('stage');
const editor = byId('code');
const workspace = byId('workspace');
const split = byId('split');
const mobile = matchMedia('(max-width:700px)');
const example = `import turtle

t = turtle.Turtle()
t.color("#137c72")
t.pensize(3)
t.penup()
t.goto(-60, -50)
t.pendown()

# วาดตัวบ้าน
for _ in range(4):
    t.forward(120)
    t.left(90)

# วาดหลังคา
t.penup()
t.goto(-60, 70)
t.pendown()
t.goto(0, 125)
t.goto(60, 70)
t.hideturtle()`;
editor.value = example;
let zoom = 1;
let grid = true;
let pointer = null;
let worker;
let running = false;
let timer;
let operations = [
  ['line',-60,-50,60,-50,'#137c72',3],['line',60,-50,60,70,'#137c72',3],
  ['line',60,70,-60,70,'#137c72',3],['line',-60,70,-60,-50,'#137c72',3],
  ['line',-60,70,0,125,'#137c72',3],['line',0,125,60,70,'#137c72',3]
];
function draw() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const ratio = devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const x = value => width / 2 + value * zoom;
  const y = value => height / 2 - value * zoom;
  const line = (a,b,c,d,color,size) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.moveTo(a,b);
    ctx.lineTo(c,d);
    ctx.stroke();
  };
  ctx.fillStyle = operations.findLast(op => op[0] === 'background')?.[1] || '#fcfdff';
  ctx.fillRect(0,0,width,height);
  if (grid) {
    const step = zoom < 0.7 ? 100 : 50;
    ctx.font = '11px monospace';
    ctx.fillStyle = '#526b7b';
    for (let n = -Math.floor(width / (2 * step * zoom)); x(n * step) < width; n++) {
      const px = x(n * step);
      line(px,0,px,height,n ? '#e0e8ee' : '#9eb2bf',1);
      if (n) ctx.fillText(n * step,px + 3,height / 2 + 14);
    }
    for (let n = Math.floor(height / (2 * step * zoom)); y(n * step) < height; n--) {
      const py = y(n * step);
      line(0,py,width,py,n ? '#e0e8ee' : '#9eb2bf',1);
      if (n) ctx.fillText(n * step,width / 2 + 5,py - 4);
    }
    ctx.fillText('0',width / 2 + 5,height / 2 + 14);
  }
  for (const [type,a,b,c,d,e,f] of operations) {
    if (type === 'line') line(x(a),y(b),x(c),y(d),e,f * zoom);
    if (type === 'dot') {
      ctx.beginPath();ctx.arc(x(a),y(b),c * zoom / 2,0,Math.PI * 2);
      ctx.fillStyle = d;ctx.fill();
    }
    if (type === 'fill' && a.length) {
      ctx.beginPath();ctx.moveTo(x(a[0][0]),y(a[0][1]));
      for (const [px,py] of a.slice(1)) ctx.lineTo(x(px),y(py));
      ctx.closePath();ctx.fillStyle = b;ctx.fill();
    }
    if (type === 'text') {
      ctx.font = `${Math.max(1,e * zoom)}px sans-serif`;
      ctx.fillStyle = d;ctx.textAlign = f;ctx.fillText(c,x(a),y(b));ctx.textAlign = 'start';
    }
    if (type === 'cursor') {
      ctx.save();ctx.translate(x(a),y(b));ctx.rotate(-c * Math.PI / 180);
      ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,5);ctx.lineTo(-3,0);ctx.lineTo(-6,-5);ctx.closePath();
      ctx.fillStyle = d;ctx.fill();ctx.restore();
    }
  }
  const tip = byId('tip');
  const bounds = canvas.getBoundingClientRect();
  const px = pointer?.clientX - bounds.left;
  const py = pointer?.clientY - bounds.top;
  if (px >= 0 && py >= 0 && px < width && py < height) {
    const label = `x: ${Math.round((px-width/2)/zoom)}   y: ${Math.round((height/2-py)/zoom)}`;
    line(px-7,py,px+7,py,'#168476',1);
    line(px,py-7,px,py+7,'#168476',1);
    byId('coords').textContent = label;
    tip.textContent = label;
    tip.hidden = false;
    tip.style.left = Math.max(0,Math.min(px+12,width-tip.offsetWidth-3))+'px';
    tip.style.top = Math.max(0,py-tip.offsetHeight-9)+'px';
  } else {
    tip.hidden = true;
    byId('coords').textContent = 'x: —  y: —';
  }
}
new ResizeObserver(draw).observe(stage);
canvas.onpointermove = event => {pointer = event;draw();};
canvas.onpointerdown = canvas.onpointermove;
canvas.onpointerleave = () => {pointer = null;draw();};
byId('grid').onclick = event => {
  grid = !grid;
  event.target.textContent = translate(grid ? 'hideGrid' : 'showGrid');
  event.target.setAttribute('aria-pressed',grid);
  draw();
};
function setZoom(value) {
  zoom = Math.max(.4,Math.min(3,value));
  byId('reset').textContent = Math.round(zoom*100)+'%';
  draw();
}
byId('out').onclick = () => setZoom(zoom / 1.25);
byId('in').onclick = () => setZoom(zoom * 1.25);
byId('reset').onclick = () => setZoom(1);
const updateOrientation = () => {
  split.setAttribute('aria-orientation',mobile.matches ? 'horizontal' : 'vertical');
  split.setAttribute('aria-valuenow',getSplit());
};
function getSplit() {
  return Number.parseFloat(workspace.style.getPropertyValue(mobile.matches ? '--mobile' : '--left')) || (mobile.matches ? 42 : 45);
}
function resize(value) {
  const percent = Math.round(Math.max(22,Math.min(72,value)));
  workspace.style.setProperty(mobile.matches ? '--mobile' : '--left',percent+'%');
  split.setAttribute('aria-valuenow',percent);
}
mobile.onchange = updateOrientation;
updateOrientation();
split.onpointerdown = event => split.setPointerCapture(event.pointerId);
split.onpointermove = event => {
  if (!split.hasPointerCapture(event.pointerId)) return;
  const rect = workspace.getBoundingClientRect();
  resize(mobile.matches ? (event.clientY-rect.top)/rect.height*100 : (event.clientX-rect.left)/rect.width*100);
};
split.onkeydown = event => {
  const increases = mobile.matches ? 'ArrowDown' : 'ArrowRight';
  const decreases = mobile.matches ? 'ArrowUp' : 'ArrowLeft';
  if (event.key !== increases && event.key !== decreases) return;
  event.preventDefault();
  resize(getSplit() + (event.key === increases ? 3 : -3));
};
const run = byId('run');
const speed = byId('speed');
const pause = byId('pause');
const step = byId('step');
const progress = byId('progress');
let playback = null;
let playbackTimer;
let completedSteps = 0;
let totalSteps = 0;

function refreshPlayback() {
  pause.disabled = !playback;
  pause.textContent = translate(playback?.paused ? 'resume' : 'pause');
  step.disabled = running && !playback;
  progress.textContent = totalSteps ? `${translate('stepLabel')} ${completedSteps} / ${totalSteps}` : '';
}

function playStep() {
  const [action, first, second, cursor] = playback.steps[completedSteps++];
  if (action === 'clear') {
    for (const id of first) playback.drawing.delete(id);
    playback.cursor = second;
  } else if (action === 'pose') {
    playback.cursor = first;
  } else {
    if (first !== null) playback.drawing.set(first,second);
    if (cursor !== undefined) playback.cursor = cursor;
  }
  if (completedSteps === totalSteps) {
    completePlayback();
    return;
  }
  operations = [...playback.drawing.values()];
  if (playback.cursor) operations.push(playback.cursor);
  draw();
  refreshPlayback();
}

function completePlayback() {
  const {result, key} = playback;
  completedSteps = totalSteps;
  operations = result;
  draw();
  finish(key);
}

function schedulePlayback() {
  clearTimeout(playbackTimer);
  if (!playback || playback.paused) return;
  if (speed.value === 'instant') {completePlayback();return;}
  playbackTimer = setTimeout(() => {
    playStep();
    schedulePlayback();
  }, 180 / Number(speed.value));
}

function beginPlayback(data, manual) {
  const key = data.error ? 'failed' : 'finished';
  totalSteps = data.steps?.length || 0;
  completedSteps = 0;
  if (!totalSteps) {
    if (data.operations) {operations = data.operations;draw();}
    finish(key);
    return;
  }
  playback = {steps:data.steps, drawing:new Map(), cursor:null, paused:manual, result:data.operations, key};
  operations = [];
  draw();
  setStatus(manual ? 'paused' : 'playing');
  refreshPlayback();
  if (manual) playStep();
  else schedulePlayback();
}

pause.onclick = () => {
  if (!playback) return;
  playback.paused = !playback.paused;
  setStatus(playback.paused ? 'paused' : 'playing');
  refreshPlayback();
  schedulePlayback();
};
step.onclick = () => {
  if (!playback) {execute(true);return;}
  clearTimeout(playbackTimer);
  playback.paused = true;
  setStatus('paused');
  playStep();
};
speed.onchange = schedulePlayback;
const status = byId('status');
const messages = byId('messages');
function finish(key) {
  clearTimeout(timer);
  clearTimeout(playbackTimer);
  playback = null;
  running = false;
  run.textContent = translate('run');
  setStatus(key);
  refreshPlayback();
}
function stop(key) {
  worker?.terminate();
  worker = undefined;
  finish(key);
}
function execute(manual = false) {
  if (running) {stop('stopped');return;}
  running = true;
  completedSteps = totalSteps = 0;
  refreshPlayback();
  run.textContent = translate('stop');
  setStatus('running');
  messages.textContent = '';
  if (!editor.value.trim()) {finish('ready');return;}
  if (!worker) worker = new Worker('python-worker.js');
  worker.onmessage = ({data}) => {
    if (data.loading) {setStatus('loading');return;}
    clearTimeout(timer);
    messages.textContent = [data.output,data.error].filter(Boolean).join('\n').slice(0,4000);
    beginPlayback(data,manual);
  };
  worker.onerror = () => stop('unavailable');
  timer = setTimeout(() => stop('timeout'),45000);
  worker.postMessage(editor.value);
}
run.onclick = () => execute();
byId('example').onclick = () => {editor.value = example;renderEditor();editor.focus();};
editor.onkeydown = event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault();execute();}
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end');
    renderEditor();
  }
};
const dictionary = {
  th: {
    speed:'ความเร็ว', slow:'ช้า 0.5×', normal:'ปกติ 1×', fast:'เร็ว 2×', instant:'ทันที',
    nextStep:'ทีละขั้น', pause:'พัก', resume:'เล่นต่อ', stepLabel:'ขั้น', paused:'พักการวาด', playing:'กำลังวาด…',
    editor:'เขียนโค้ด Python', example:'ตัวอย่าง', clearCode:'ล้างโค้ด', drawing:'พื้นที่วาด Turtle',
    clearPicture:'ล้างภาพ', origin:'จุดกำเนิด (0, 0) อยู่กลางภาพ',
    language:'ภาษาของหน้าเว็บ', code:'โค้ด Python', split:'ปรับขนาดพื้นที่โค้ดและพื้นที่วาด',
    canvas:'ภาพวาดและตารางพิกัด Turtle', zoomOut:'ย่อภาพ', zoomIn:'ขยายภาพ', zoomReset:'คืนขนาดภาพ',
    hideGrid:'ซ่อนตาราง', showGrid:'แสดงตาราง', run:'▶ รันโค้ด', stop:'หยุด',
    ready:'พร้อมรัน', stopped:'หยุดแล้ว', running:'กำลังรัน Python…', loading:'กำลังโหลด Python ครั้งแรก…',
    failed:'พบข้อผิดพลาด', finished:'รันเสร็จแล้ว', unavailable:'โหลด Python ไม่สำเร็จ ลองรันอีกครั้ง',
    timeout:'หมดเวลารัน Python', codeCleared:'ล้างโค้ดแล้ว', pictureCleared:'ล้างภาพแล้ว'
  },
  en: {
    speed:'Speed', slow:'Slow 0.5×', normal:'Normal 1×', fast:'Fast 2×', instant:'Instant',
    nextStep:'Step', pause:'Pause', resume:'Resume', stepLabel:'Step', paused:'Paused', playing:'Drawing…',
    editor:'Python editor', example:'Example', clearCode:'Clear code', drawing:'Turtle canvas',
    clearPicture:'Clear drawing', origin:'The origin (0, 0) is at the center',
    language:'Page language', code:'Python code', split:'Resize editor and canvas',
    canvas:'Turtle drawing and coordinate grid', zoomOut:'Zoom out', zoomIn:'Zoom in', zoomReset:'Reset zoom',
    hideGrid:'Hide grid', showGrid:'Show grid', run:'▶ Run code', stop:'Stop',
    ready:'Ready', stopped:'Stopped', running:'Running Python…', loading:'Loading Python for the first time…',
    failed:'Error', finished:'Finished', unavailable:'Could not load Python. Try running again.',
    timeout:'Python run timed out', codeCleared:'Code cleared', pictureCleared:'Drawing cleared'
  }
};
const language = byId('language');
try {language.value = localStorage.getItem('turtle-language') === 'en' ? 'en' : 'th';} catch {}
const translate = key => dictionary[language.value][key];
let statusKey = 'ready';
const keywords = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
const pythonTokens = /(?<comment>#[^\n]*)|(?<string>(?:[rRuUbBfF]{1,2})?(?:"""(?:\\[\s\S]|(?!""")[\s\S])*(?:"""|$)|'''(?:\\[\s\S]|(?!''')[\s\S])*(?:'''|$)|"(?:\\[\s\S]|[^"\\\n])*"?|'(?:\\[\s\S]|[^'\\\n])*'?))|(?<number>(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?[\d_]+)?)[jJ]?)|(?<identifier>[\p{ID_Start}_][\p{ID_Continue}]*)/gu;
const highlight = byId('highlight');
const tokens = byId('tokens');
const lineGutter = byId('line-gutter');
const lineNumbers = byId('line-numbers');
function syncEditorScroll() {
  highlight.scrollTop = editor.scrollTop;
  highlight.scrollLeft = editor.scrollLeft;
  lineGutter.scrollTop = editor.scrollTop;
}
function renderEditor() {
  const source = editor.value;
  const fragments = document.createDocumentFragment();
  let offset = 0;
  for (const match of source.matchAll(pythonTokens)) {
    fragments.append(source.slice(offset, match.index));
    offset = match.index + match[0].length;
    const {comment, string, number, identifier} = match.groups;
    const kind = comment ? 'comment' : string ? 'string' : number ? 'number' :
      keywords.has(identifier) ? 'keyword' : /^\s*\(/.test(source.slice(offset)) ? 'call' : '';
    if (kind) {
      const span = document.createElement('span');
      span.className = 'tok-' + kind;
      span.textContent = match[0];
      fragments.append(span);
    } else {
      fragments.append(match[0]);
    }
  }
  fragments.append(source.slice(offset) + '\n');
  tokens.replaceChildren(fragments);
  lineNumbers.textContent = Array.from({length: source.split('\n').length}, (_, index) => index + 1).join('\n');
  syncEditorScroll();
}
editor.addEventListener('input', renderEditor);
editor.addEventListener('scroll', syncEditorScroll);
new ResizeObserver(syncEditorScroll).observe(editor);
function setStatus(key) {
  statusKey = key;
  status.textContent = translate(key);
}
function applyLanguage() {
  document.documentElement.lang = language.value;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = translate(node.dataset.i18n);
  });
  const labels = {language:'language',code:'code',split:'split',canvas:'canvas',out:'zoomOut',in:'zoomIn',reset:'zoomReset'};
  for (const [id, key] of Object.entries(labels)) byId(id).setAttribute('aria-label',translate(key));
  byId('grid').textContent = translate(grid ? 'hideGrid' : 'showGrid');
  run.textContent = translate(running ? 'stop' : 'run');
  setStatus(statusKey);
  refreshPlayback();
}
language.onchange = () => {
  try {localStorage.setItem('turtle-language',language.value);} catch {}
  applyLanguage();
};

byId('clear-code').onclick = () => {
  editor.value = '';
  messages.textContent = '';
  if (!running) setStatus('codeCleared');
  renderEditor();
  editor.focus();
};
byId('clear-picture').onclick = () => {
  if (running) stop('pictureCleared');
  else setStatus('pictureCleared');
  operations = [];
  completedSteps = totalSteps = 0;
  refreshPlayback();
  draw();
};
renderEditor();
applyLanguage();

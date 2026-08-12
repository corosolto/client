// Widgets de UI do editor — DOM puro, sem framework. Retornam {el, set} pra
// sincronizar por fora (o valor de verdade sempre mora no Project, não no DOM).
export function group(cap, label = null) {
  const g = document.createElement('div');
  g.className = 'grp';
  const c = document.createElement('div');
  c.className = 'cap';
  c.textContent = cap;
  if (label) {
    const m = document.createElement('span');
    m.className = 'muted';
    m.textContent = label;
    c.appendChild(m);
  }
  g.appendChild(c);
  return g;
}

export function ctl(label, { min, max, value, step = 1 } = {}) {
  const row = document.createElement('div');
  row.className = 'ctl';
  const lab = document.createElement('span');
  lab.textContent = label;
  lab.title = label;
  const range = document.createElement('input');
  range.type = 'range';
  range.min = min;
  range.max = max;
  range.step = step;
  range.value = value;
  const num = document.createElement('input');
  num.type = 'number';
  num.className = 'num';
  num.min = min;
  num.max = max;
  num.value = value;
  function clamp(v) {
    v = Math.round(Number(v));
    return Math.max(min, Math.min(max, isNaN(v) ? min : v));
  }
  function set(v) {
    const vv = clamp(v);
    range.value = vv;
    num.value = vv;
  }
  range.addEventListener('input', () => { num.value = range.value; onChange(+range.value); });
  num.addEventListener('input', () => { if (num.value !== '') set(+num.value); onChange(+num.value); });
  let onChange = () => {};
  row.append(lab, range, num);
  return { el: row, set, bind(fn) { onChange = fn; return this; } };
}

export function chips(items, { selected = null, title = (x) => '' } = {}) {
  const w = document.createElement('div');
  w.className = 'chips';
  const btn = (x) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = x;
    b.title = title(x);
    if (x === selected) b.classList.add('on');
    b.addEventListener('click', () => {
      w.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b));
      onPick(x);
    });
    w.appendChild(b);
    return b;
  };
  let onPick = () => {};
  const all = new Map();
  for (const x of items) all.set(x, btn(x));
  return {
    el: w,
    select(x) {
      w.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q.textContent === x));
      onPick(x);
    },
    mark(x, done) { const b = all.get(x); if (b) b.classList.toggle('done', done); },
    bind(fn) { onPick = fn; },
  };
}

export function seg(items, { selected = null } = {}) {
  const s = document.createElement('div');
  s.className = 'seg';
  let onPick = () => {};
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = it.label;
    b.dataset.value = it.value;
    if (it.value === selected) b.classList.add('on');
    b.addEventListener('click', () => {
      s.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b));
      onPick(it.value);
    });
    s.appendChild(b);
  }
  return { el: s, bind(fn) { onPick = fn; } };
}

export function select(items, { selected = null, label = (x) => x } = {}) {
  const sel = document.createElement('select');
  for (const it of items) {
    const o = document.createElement('option');
    o.value = it;
    o.textContent = label(it);
    sel.appendChild(o);
  }
  sel.value = selected;
  return sel;
}

export function btn(text, opts = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (opts.primary) b.classList.add('primary');
  if (opts.cls) b.classList.add(opts.cls);
  return b;
}

export function row(...els) {
  const r = document.createElement('div');
  r.className = 'row';
  r.append(...els);
  return r;
}

export function pre(id, maxH = 110) {
  const p = document.createElement('pre');
  p.id = id;
  p.className = 'vals';
  p.style.maxHeight = maxH + 'px';
  return p;
}

export function label(txt, control) {
  const l = document.createElement('label');
  l.textContent = txt;
  l.appendChild(control);
  return l;
}

export function detail(summary) {
  const d = document.createElement('details');
  d.className = 'help';
  const s = document.createElement('summary');
  s.textContent = summary;
  d.appendChild(s);
  const body = document.createElement('div');
  body.className = 'leg';
  d.appendChild(body);
  return { el: d, body };
}
/* 9 类 Scene 渲染器与步进控制 */
const SCENE_LABELS = {
  timeline: '时间轴',
  architecture: '架构图',
  sequence: '时序图',
  process: '流程图',
  comparison: '对比',
  algorithm: '算法演示',
  'data-structure': '数据结构',
  concept: '概念图',
  'future-scenario': '未来场景'
};

const FUTURE_STATUS = {
  fact: { label: '已发生', className: 'status-fact' },
  trend: { label: '进行中', className: 'status-trend' },
  speculation: { label: '推测', className: 'status-speculation' }
};

function svgId(value) {
  return String(value || 'scene').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function shortText(value, max) {
  const text = String(value == null ? '' : value);
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function wrapLabel(value, max, maxLines) {
  const text = String(value == null ? '' : value).trim();
  if (text.length <= max) return [text];
  const lines = [];
  let rest = text;
  while (rest && lines.length < maxLines) {
    if (rest.length <= max) {
      lines.push(rest);
      rest = '';
      break;
    }
    let cut = rest.lastIndexOf(' ', max);
    if (cut <= 0) cut = max;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest && lines.length) lines[lines.length - 1] = shortText(lines[lines.length - 1], max);
  return lines;
}

function createStepper(host, total, onStep) {
  const wrap = el('div', 'stepper');
  const prev = el('button', '', '上一步');
  const next = el('button', '', '下一步');
  const label = el('span', 'step-label');
  prev.type = 'button';
  next.type = 'button';
  let index = 0;

  function render() {
    label.textContent = `${index + 1} / ${total}`;
    prev.disabled = index === 0;
    next.disabled = index === total - 1;
    onStep(index);
  }

  prev.addEventListener('click', () => {
    if (index > 0) {
      index -= 1;
      render();
    }
  });
  next.addEventListener('click', () => {
    if (index < total - 1) {
      index += 1;
      render();
    }
  });

  wrap.append(prev, label, next);
  host.appendChild(wrap);
  render();

  return {
    go(value) {
      index = Math.max(0, Math.min(total - 1, value));
      render();
    },
    get index() {
      return index;
    }
  };
}

function renderTimeline(scene, body) {
  const events = (scene.data && scene.data.events) || [];
  if (!events.length) {
    body.appendChild(el('div', 'scene-empty', '暂无时间线数据。'));
    return;
  }
  const list = el('ul', 'timeline');
  events.forEach(event => {
    const item = el('li');
    item.innerHTML = `<div class="timeline-date">${esc(event.date || '')}</div>` +
      `<div class="timeline-title">${esc(event.title || '')}</div>` +
      (event.text ? `<p class="timeline-text">${raw(event.text)}</p>` : '') +
      (event.sourceIds && event.sourceIds.length ? `<div class="chip-row">${sourceChips(event.sourceIds)}</div>` : '');
    list.appendChild(item);
  });
  body.appendChild(list);

  if (events.length > 1) {
    createStepper(body, events.length, index => {
      $$('li', list).forEach((item, i) => item.classList.toggle('active', i === index));
    });
  }
}

function renderArchitecture(scene, body) {
  const data = scene.data || {};
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  if (!nodes.length) {
    body.appendChild(el('div', 'scene-empty', '暂无架构节点。'));
    return;
  }

  const laidOut = nodes.map((node, i) => ({
    ...node,
    x: Number.isFinite(node.x) ? node.x : 30 + (i % 4) * 190,
    y: Number.isFinite(node.y) ? node.y : 30 + Math.floor(i / 4) * 90,
    w: Number.isFinite(node.w) ? node.w : 150,
    h: Number.isFinite(node.h) ? node.h : 48
  }));
  const width = data.width || Math.max(320, ...laidOut.map(node => node.x + node.w)) + 30;
  const height = data.height || Math.max(180, ...laidOut.map(node => node.y + node.h)) + 30;
  const wrap = el('div', 'graph-wrap');
  const svg = svgEl('svg', {
    class: 'scene-graph',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': scene.title || '架构图'
  });

  const markerId = `arrow-${svgId(scene.id)}`;
  const defs = svgEl('defs');
  const marker = svgEl('marker', {
    id: markerId,
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '6',
    markerHeight: '6',
    orient: 'auto'
  });
  marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'arrow' }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  const nodeMap = new Map(laidOut.map(node => [node.id, node]));
  edges.forEach(edge => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return;
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h / 2;
    const x2 = to.x + to.w / 2;
    const y2 = to.y + to.h / 2;
    const group = svgEl('g', {
      class: `edge${edge.dashed ? ' dashed' : ''}`,
      'data-from': edge.from,
      'data-to': edge.to
    });
    group.appendChild(svgEl('line', { x1, y1, x2, y2, 'marker-end': `url(#${markerId})` }));
    if (edge.label) {
      const label = svgEl('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 6 });
      label.textContent = shortText(edge.label, 18);
      group.appendChild(label);
    }
    svg.appendChild(group);
  });

  laidOut.forEach(node => {
    const group = svgEl('g', {
      class: 'node',
      'data-node': node.id,
      'data-group': node.group || 'component'
    });
    group.appendChild(svgEl('rect', { x: node.x, y: node.y, width: node.w, height: node.h, rx: 8 }));
    const label = node.label || node.id;
    const lines = wrapLabel(label, 16, 2);
    const text = svgEl('text', {
      x: node.x + node.w / 2,
      y: node.y + node.h / 2 - ((lines.length - 1) * 14) / 2
    });
    lines.forEach((line, i) => {
      const tspan = svgEl('tspan', { x: node.x + node.w / 2, dy: i === 0 ? 0 : 14 });
      tspan.textContent = line;
      text.appendChild(tspan);
    });
    const title = svgEl('title');
    title.textContent = label;
    group.append(title, text);
    svg.appendChild(group);
  });

  wrap.appendChild(svg);
  body.appendChild(wrap);

  const detail = el('div', 'scene-detail');
  detail.innerHTML = '<span class="empty">点击节点查看说明。</span>';
  body.appendChild(detail);

  svg.addEventListener('click', event => {
    const nodeEl = event.target.closest('.node');
    if (!nodeEl) return;
    const id = nodeEl.dataset.node;
    const node = nodeMap.get(id);
    $$('.node', svg).forEach(item => item.classList.toggle('active', item.dataset.node === id));
    $$('.edge', svg).forEach(item => item.classList.toggle('active', item.dataset.from === id || item.dataset.to === id));
    if (!node) return;
    detail.innerHTML = `<strong>${esc(node.label || node.id)}</strong>` +
      (node.detail ? ` ${raw(node.detail)}` : '') +
      (node.sourceIds && node.sourceIds.length ? `<div class="chip-row">${sourceChips(node.sourceIds)}</div>` : '');
  });
}

function renderSequence(scene, body) {
  const data = scene.data || {};
  const actors = data.actors || [];
  const messages = data.messages || [];
  if (!actors.length || !messages.length) {
    body.appendChild(el('div', 'scene-empty', '暂无时序数据。'));
    return;
  }

  const actorList = actors.map((actor, i) => {
    const label = typeof actor === 'string' ? actor : (actor.label || actor.id || `Actor ${i + 1}`);
    const id = typeof actor === 'string' ? actor : (actor.id || label);
    return { id, label, x: 90 + i * 170 };
  });
  const actorMap = new Map();
  actorList.forEach(actor => {
    actorMap.set(actor.id, actor);
    actorMap.set(actor.label, actor);
  });
  const messageList = messages.map(message => ({
    ...message,
    fromActor: actorMap.get(message.from),
    toActor: actorMap.get(message.to)
  })).filter(message => message.fromActor && message.toActor);
  if (!messageList.length) {
    body.appendChild(el('div', 'scene-empty', '消息引用了不存在的 actor。'));
    return;
  }

  const width = Math.max(360, actorList.length * 170 + 40);
  const height = 110 + messageList.length * 56 + 30;
  const svg = svgEl('svg', {
    class: 'sequence-svg',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': scene.title || '时序图'
  });

  const markerId = `seq-arrow-${svgId(scene.id)}`;
  const defs = svgEl('defs');
  const marker = svgEl('marker', {
    id: markerId,
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '6',
    markerHeight: '6',
    orient: 'auto'
  });
  marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'arrow' }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  actorList.forEach(actor => {
    svg.appendChild(svgEl('line', {
      class: 'sequence-lifeline',
      x1: actor.x,
      y1: 58,
      x2: actor.x,
      y2: height - 20
    }));
  });

  actorList.forEach(actor => {
    const group = svgEl('g', { class: 'sequence-actor' });
    group.appendChild(svgEl('rect', { x: actor.x - 65, y: 16, width: 130, height: 38, rx: 7 }));
    const text = svgEl('text', { x: actor.x, y: 35 });
    text.textContent = shortText(actor.label, 16);
    const title = svgEl('title');
    title.textContent = actor.label;
    group.append(title, text);
    svg.appendChild(group);
  });

  const messageEls = [];
  messageList.forEach((message, i) => {
    const y = 110 + i * 56;
    const group = svgEl('g', { class: 'sequence-message', 'data-index': i });
    if (message.fromActor === message.toActor) {
      const x = message.fromActor.x;
      group.appendChild(svgEl('path', {
        d: `M ${x} ${y - 10} C ${x + 50} ${y - 28}, ${x + 50} ${y + 28}, ${x} ${y + 10}`,
        fill: 'none',
        'marker-end': `url(#${markerId})`
      }));
      const label = svgEl('text', { x: x + 34, y: y - 16 });
      label.textContent = shortText(message.label || '', 24);
      group.appendChild(label);
    } else {
      const x1 = message.fromActor.x;
      const x2 = message.toActor.x;
      group.appendChild(svgEl('line', { x1, y1: y, x2, y2: y, 'marker-end': `url(#${markerId})` }));
      const label = svgEl('text', { x: (x1 + x2) / 2, y: y - 8 });
      label.textContent = shortText(message.label || '', 28);
      group.appendChild(label);
    }
    svg.appendChild(group);
    messageEls.push(group);
  });

  const wrap = el('div', 'sequence-wrap');
  wrap.appendChild(svg);
  body.appendChild(wrap);

  const detail = el('div', 'scene-detail');
  body.appendChild(detail);

  function setStep(index) {
    messageEls.forEach((item, i) => {
      item.classList.toggle('active', i === index);
      item.classList.toggle('dim', i > index);
    });
    const message = messageList[index];
    if (!message) {
      detail.innerHTML = '';
      return;
    }
    detail.innerHTML = `<strong>${esc(message.fromActor.label)} → ${esc(message.toActor.label)}</strong>` +
      (message.label ? ` · ${esc(message.label)}` : '') +
      (message.note ? `<div>${raw(message.note)}</div>` : '') +
      (message.sourceIds && message.sourceIds.length ? `<div class="chip-row">${sourceChips(message.sourceIds)}</div>` : '');
  }

  if (messageList.length > 1) createStepper(body, messageList.length, setStep);
  else setStep(0);
}

function renderProcess(scene, body) {
  const steps = (scene.data && scene.data.steps) || [];
  if (!steps.length) {
    body.appendChild(el('div', 'scene-empty', '暂无流程步骤。'));
    return;
  }

  const grid = el('div', 'process-grid');
  const detail = el('div', 'step-detail');
  let stepper = null;

  function setStep(index) {
    $$('.process-step', grid).forEach((button, i) => button.classList.toggle('active', i === index));
    const step = steps[index];
    if (!step) {
      detail.innerHTML = '';
      return;
    }
    const state = step.state && typeof step.state === 'object' ? Object.entries(step.state) : [];
    detail.innerHTML = `<strong>${esc(step.title || '')}</strong>` +
      (step.text ? `<div>${raw(step.text)}</div>` : '') +
      (state.length ? `<table class="state-table">${state.map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(value)}</td></tr>`).join('')}</table>` : '') +
      (step.sourceIds && step.sourceIds.length ? `<div class="chip-row">${sourceChips(step.sourceIds)}</div>` : '');
  }

  steps.forEach((step, i) => {
    const button = el('button', 'process-step');
    button.type = 'button';
    button.innerHTML = `<div class="num">STEP ${i + 1}</div><div class="t">${esc(step.title || '')}</div>`;
    button.addEventListener('click', () => {
      if (stepper) stepper.go(i);
      else setStep(i);
    });
    grid.appendChild(button);
  });

  body.append(grid, detail);
  if (steps.length > 1) stepper = createStepper(body, steps.length, setStep);
  else setStep(0);
}

function renderComparison(scene, body) {
  const data = scene.data || {};
  const dimensions = data.dimensions || [];
  const options = data.options || [];
  if (!dimensions.length || !options.length) {
    body.appendChild(el('div', 'scene-empty', '暂无对比数据。'));
    return;
  }

  const wrap = el('div', 'table-wrap');
  const table = el('table', 'comparison-table');
  table.innerHTML = `<thead><tr><th>维度</th>${options.map(option =>
    `<th class="${option.highlight ? 'highlight-col' : ''}">${esc(option.name || '')}${option.highlight ? '<span class="option-badge">推荐</span>' : ''}</th>`
  ).join('')}</tr></thead><tbody>${dimensions.map((dimension, i) =>
    `<tr><th>${esc(dimension)}</th>${options.map(option =>
      `<td class="${option.highlight ? 'highlight-col' : ''}">${raw((option.values || [])[i] || '')}</td>`
    ).join('')}</tr>`
  ).join('')}</tbody>`;
  wrap.appendChild(table);
  body.appendChild(wrap);
  if (data.note) {
    const note = el('p', 'scene-note');
    note.innerHTML = raw(data.note);
    body.appendChild(note);
  }
}

function renderAlgorithm(scene, body) {
  const data = scene.data || {};
  if (data.formula) {
    const formula = el('div', 'formula');
    formula.innerHTML = raw(data.formula);
    body.appendChild(formula);
  }

  const columns = data.columns || [];
  const rows = data.rows || [];
  if (columns.length || rows.length) {
    const wrap = el('div', 'algo-table-wrap');
    const table = el('table', 'algo-table');
    table.innerHTML = `<thead><tr>${columns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead>` +
      `<tbody>${rows.map((row, i) => `<tr data-row="${i}">${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    wrap.appendChild(table);
    body.appendChild(wrap);
    if (data.note) {
      const note = el('p', 'scene-note');
      note.innerHTML = raw(data.note);
      body.appendChild(note);
    }
    if (rows.length > 1) {
      createStepper(body, rows.length, index => {
        $$('tbody tr', table).forEach((row, i) => row.classList.toggle('active', i === index));
      });
    }
  } else if (data.note) {
    const note = el('p', 'scene-note');
    note.innerHTML = raw(data.note);
    body.appendChild(note);
  }
}

function renderDataStructure(scene, body) {
  const data = scene.data || {};
  const items = data.items || [];
  if (!items.length) {
    body.appendChild(el('div', 'scene-empty', '暂无结构数据。'));
    return;
  }

  const grid = el('div', 'ds-grid');
  items.forEach((item, i) => {
    const label = typeof item === 'string' ? String(i) : (item.label != null ? item.label : String(i));
    const value = typeof item === 'string' ? item : (item.value != null ? item.value : '');
    const cell = el('div', 'ds-cell');
    cell.innerHTML = `<div class="ds-label">${esc(label)}</div><div class="ds-value">${esc(value)}</div>`;
    grid.appendChild(cell);
  });
  body.appendChild(grid);

  const steps = data.steps || [];
  if (!steps.length) return;
  const detail = el('div', 'step-detail');
  body.appendChild(detail);

  function setStep(index) {
    const step = steps[index];
    const highlight = new Set((step && step.highlight) || []);
    $$('.ds-cell', grid).forEach((cell, i) => cell.classList.toggle('active', highlight.has(i)));
    if (!step) {
      detail.innerHTML = '';
      return;
    }
    detail.innerHTML = `<strong>${esc(step.title || '')}</strong>` +
      (step.text ? `<div>${raw(step.text)}</div>` : '') +
      (step.sourceIds && step.sourceIds.length ? `<div class="chip-row">${sourceChips(step.sourceIds)}</div>` : '');
  }

  if (steps.length > 1) createStepper(body, steps.length, setStep);
  else setStep(0);
}

function conceptChip(id) {
  const concept = IS.maps.concepts.get(id);
  const name = concept ? concept.name : id;
  if (!concept) return `<span class="concept-chip">${esc(name)}</span>`;
  return `<button type="button" class="concept-chip" data-concept="${esc(id)}">${esc(name)}</button>`;
}

function renderConceptScene(scene, body) {
  const data = scene.data || {};
  const groups = data.groups || [];
  const edges = data.edges || [];
  if (!groups.length && !edges.length) {
    body.appendChild(el('div', 'scene-empty', '暂无概念数据。'));
    return;
  }

  if (groups.length) {
    const grid = el('div', 'concept-groups');
    groups.forEach(group => {
      const card = el('div', 'concept-group');
      card.innerHTML = `<h4>${esc(group.name || '')}</h4>` +
        `<div class="concept-chips">${(group.concepts || []).map(conceptChip).join('')}</div>`;
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  if (edges.length) {
    const list = el('ul', 'relation-list');
    edges.forEach(edge => {
      const item = el('li');
      item.innerHTML = (edge.label ? `<span class="pill">${esc(edge.label)}</span> ` : '') +
        `${conceptChip(edge.from)}<span class="arrow">→</span>${conceptChip(edge.to)}`;
      list.appendChild(item);
    });
    body.appendChild(list);
  }
}

function renderFuture(scene, body) {
  const branches = (scene.data && scene.data.branches) || [];
  if (!branches.length) {
    body.appendChild(el('div', 'scene-empty', '暂无未来分支。'));
    return;
  }

  const legend = el('div', 'future-legend');
  legend.innerHTML = Object.values(FUTURE_STATUS)
    .map(info => `<span class="status-badge ${info.className}">${info.label}</span>`)
    .join('');
  body.appendChild(legend);

  const grid = el('div', 'future-grid');
  branches.forEach(branch => {
    const info = FUTURE_STATUS[branch.status] || FUTURE_STATUS.speculation;
    const card = el('div', 'future-card');
    card.innerHTML = `<span class="status-badge ${info.className}">${info.label}</span>` +
      `<h4>${esc(branch.title || '')}</h4>` +
      (branch.text ? `<p>${raw(branch.text)}</p>` : '') +
      (branch.evidence ? `<div class="future-evidence"><strong>依据：</strong>${raw(branch.evidence)}</div>` : '') +
      (branch.sourceIds && branch.sourceIds.length ? `<div class="chip-row">${sourceChips(branch.sourceIds)}</div>` : '');
    grid.appendChild(card);
  });
  body.appendChild(grid);
}

const SCENE_RENDERERS = {
  timeline: renderTimeline,
  architecture: renderArchitecture,
  sequence: renderSequence,
  process: renderProcess,
  comparison: renderComparison,
  algorithm: renderAlgorithm,
  'data-structure': renderDataStructure,
  concept: renderConceptScene,
  'future-scenario': renderFuture
};

function renderScene(scene, index) {
  const figure = el('figure', 'scene');
  figure.id = `scene-${scene.id}`;
  const head = el('div', 'scene-head');
  head.innerHTML = `<div class="scene-kicker">Scene ${index + 1} · ${esc(SCENE_LABELS[scene.type] || scene.type)}</div>` +
    `<h3>${esc(scene.title || '')}</h3>` +
    (scene.description ? `<p class="scene-desc">${raw(scene.description)}</p>` : '');
  figure.appendChild(head);

  const body = el('div', 'scene-body');
  figure.appendChild(body);
  const renderer = SCENE_RENDERERS[scene.type];
  if (renderer) renderer(scene, body);
  else body.appendChild(el('div', 'scene-empty', `未知场景类型：${esc(scene.type)}`));

  if (scene.sourceIds && scene.sourceIds.length) {
    const sources = el('div', 'scene-sources');
    sources.innerHTML = `<span>来源：</span>${sourceChips(scene.sourceIds)}`;
    figure.appendChild(sources);
  }
  return figure;
}

IS.renderScenesInChapter = function (contentEl, chapter) {
  const placed = new Set();
  let index = 0;
  $$('[data-scene]', contentEl).forEach(slot => {
    const id = slot.dataset.scene;
    placed.add(id);
    const scene = IS.maps.scenes.get(id);
    if (!scene) {
      slot.replaceWith(el('div', 'scene-empty', `未找到场景：${esc(id)}`));
      index += 1;
      return;
    }
    slot.replaceWith(renderScene(scene, index));
    index += 1;
  });

  ((chapter && chapter.sceneIds) || []).forEach(id => {
    if (placed.has(id)) return;
    const scene = IS.maps.scenes.get(id);
    if (!scene) return;
    contentEl.appendChild(renderScene(scene, index));
    index += 1;
  });
};

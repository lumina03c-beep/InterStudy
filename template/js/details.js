/* 概念弹窗、算法/模块深入视图、来源列表 */
IS.state.lockCount = IS.state.lockCount || 0;

function lockBody() {
  IS.state.lockCount += 1;
  document.body.classList.add('locked');
}

function unlockBody() {
  IS.state.lockCount = Math.max(0, IS.state.lockCount - 1);
  if (!IS.state.lockCount) document.body.classList.remove('locked');
}

function detailSection(title, content) {
  if (!content) return '';
  return `<div class="detail-section"><h3>${esc(title)}</h3>${content}</div>`;
}

function listHtml(items) {
  if (!items || !items.length) return '';
  return `<ul>${items.map(item => `<li>${raw(item)}</li>`).join('')}</ul>`;
}

function pillRow(items) {
  if (!items || !items.length) return '';
  return `<div class="pill-row">${items.map(item => `<span class="pill">${esc(item)}</span>`).join('')}</div>`;
}

function relatedHtml(obj, type) {
  const ids = new Set();
  if (type === 'concept') (obj.relatedConceptIds || []).forEach(id => ids.add(id));
  if (type === 'algorithm') (obj.relatedAlgorithmIds || []).forEach(id => ids.add(id));
  const refs = (IS.T.crossReferences || []).filter(ref => ref.sourceId === obj.id || ref.targetId === obj.id);
  refs.forEach(ref => ids.add(ref.sourceId === obj.id ? ref.targetId : ref.sourceId));
  ids.delete(obj.id);

  const pills = Array.from(ids).map(id => `<span class="pill">${refButton(id)}</span>`).join('');
  const relations = refs.map(ref => {
    const other = ref.sourceId === obj.id ? ref.targetId : ref.sourceId;
    return `<li><span class="pill">${esc(xrefLabel(ref.type))}</span> ${refButton(other)}${ref.description ? `<span class="empty"> ${raw(ref.description)}</span>` : ''}</li>`;
  }).join('');

  if (!pills && !relations) return '';
  return `${pills ? `<div class="pill-row">${pills}</div>` : ''}${relations ? `<ul class="relation-list">${relations}</ul>` : ''}`;
}

function buildConceptBody(concept) {
  const parts = [];
  parts.push(detailSection('定义', concept.definition ? `<p>${raw(concept.definition)}</p>` : ''));
  parts.push(detailSection('通俗解释', concept.explanation ? `<p>${raw(concept.explanation)}</p>` : ''));
  parts.push(detailSection('技术原理', listHtml(concept.principles)));
  parts.push(detailSection('示例', listHtml(concept.examples)));
  parts.push(detailSection('相关与关联', relatedHtml(concept, 'concept')));
  if (concept.sourceIds && concept.sourceIds.length) {
    parts.push(detailSection('来源', `<div class="chip-row">${sourceChips(concept.sourceIds)}</div>`));
  }
  return parts.filter(Boolean).join('') || '<p class="empty">暂无详细内容。</p>';
}

function buildAlgorithmDetail(algorithm) {
  const parts = [];
  parts.push(detailSection('它解决的问题', algorithm.problem ? `<p>${raw(algorithm.problem)}</p>` : ''));
  parts.push(detailSection('背景', algorithm.background ? `<p>${raw(algorithm.background)}</p>` : ''));
  parts.push(detailSection('前置概念', pillRow(algorithm.prerequisites)));
  parts.push(detailSection('核心思想', algorithm.principle ? `<p>${raw(algorithm.principle)}</p>` : ''));
  if (algorithm.formulas && algorithm.formulas.length) {
    parts.push(detailSection('公式', algorithm.formulas.map(formula => `<div class="formula">${raw(formula)}</div>`).join('')));
  }
  if (algorithm.pseudocode) {
    parts.push(detailSection('伪代码', `<pre><code>${esc(algorithm.pseudocode)}</code></pre>`));
  }
  if (algorithm.steps && algorithm.steps.length) {
    parts.push(detailSection('执行步骤', `<ol>${algorithm.steps.map(step => `<li><strong>${esc(step.title || '')}</strong>${step.text ? `：${raw(step.text)}` : ''}</li>`).join('')}</ol>`));
  }
  if (algorithm.complexity) {
    const complexity = [];
    if (algorithm.complexity.time) complexity.push(`时间：${algorithm.complexity.time}`);
    if (algorithm.complexity.space) complexity.push(`空间：${algorithm.complexity.space}`);
    parts.push(detailSection('复杂度', pillRow(complexity)));
  }
  parts.push(detailSection('优势', listHtml(algorithm.advantages)));
  parts.push(detailSection('局限', listHtml(algorithm.limitations)));
  parts.push(detailSection('适用场景', listHtml(algorithm.applications)));
  parts.push(detailSection('相关与关联', relatedHtml(algorithm, 'algorithm')));
  if (algorithm.sourceIds && algorithm.sourceIds.length) {
    parts.push(detailSection('来源', `<div class="chip-row">${sourceChips(algorithm.sourceIds)}</div>`));
  }
  return parts.filter(Boolean).join('') || '<p class="empty">暂无详细内容。</p>';
}

function buildModuleDetail(module) {
  const parts = [];
  parts.push(detailSection('模块职责', module.responsibility ? `<p>${raw(module.responsibility)}</p>` : ''));
  parts.push(detailSection('输入', listHtml(module.inputs)));
  parts.push(detailSection('输出', listHtml(module.outputs)));
  parts.push(detailSection('内部组件', pillRow(module.components)));
  parts.push(detailSection('依赖', pillRow(module.dependencies)));
  if (module.executionFlow && module.executionFlow.length) {
    parts.push(detailSection('执行流程', `<ol>${module.executionFlow.map(step => `<li>${raw(step)}</li>`).join('')}</ol>`));
  }
  if (module.implementation) {
    parts.push(detailSection('关键实现', `<pre><code>${esc(module.implementation)}</code></pre>`));
  }
  parts.push(detailSection('相关与关联', relatedHtml(module, 'module')));
  if (module.sourceIds && module.sourceIds.length) {
    parts.push(detailSection('来源', `<div class="chip-row">${sourceChips(module.sourceIds)}</div>`));
  }
  return parts.filter(Boolean).join('') || '<p class="empty">暂无详细内容。</p>';
}

IS.openConcept = function (id) {
  const concept = IS.maps.concepts.get(id);
  if (!concept) {
    console.warn('[InterStudy] 未找到概念', id);
    return;
  }
  const modal = $('#conceptModal');
  if (modal.hidden) {
    IS.state.lastFocus = document.activeElement;
    lockBody();
  }
  $('#conceptTitle').textContent = concept.name || id;
  const body = $('#conceptBody');
  body.innerHTML = buildConceptBody(concept);
  setupCodeBlocks(body);
  modal.hidden = false;
  const panel = modal.querySelector('.modal-panel');
  if (panel) panel.scrollTop = 0;
  const close = modal.querySelector('[data-close="concept"]');
  if (close) close.focus();
};

IS.closeConcept = function (restoreFocus = true) {
  const modal = $('#conceptModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  unlockBody();
  if (restoreFocus && IS.state.lastFocus && document.contains(IS.state.lastFocus)) {
    IS.state.lastFocus.focus({ preventScroll: true });
  }
  if (!document.getElementById('detail') || document.getElementById('detail').hidden) {
    IS.state.lastFocus = null;
  }
};

IS.openDetail = function (type, id) {
  let kind = type;
  let object = kind === 'algorithm' ? IS.maps.algorithms.get(id) : IS.maps.modules.get(id);
  if (!object && kind === 'algorithm' && IS.maps.modules.has(id)) {
    kind = 'module';
    object = IS.maps.modules.get(id);
  }
  if (!object && kind === 'module' && IS.maps.algorithms.has(id)) {
    kind = 'algorithm';
    object = IS.maps.algorithms.get(id);
  }
  if (!object) {
    console.warn('[InterStudy] 未找到深入条目', type, id);
    return;
  }

  const detail = $('#detail');
  const concept = $('#conceptModal');
  const conceptOpen = !concept.hidden;

  if (detail.hidden) {
    IS.state.lastFocus = conceptOpen ? IS.state.lastFocus : document.activeElement;
    lockBody();
  }
  if (conceptOpen) IS.closeConcept(false);

  detail.dataset.type = kind;
  detail.dataset.id = id;
  $('#detailKicker').textContent = kind === 'algorithm' ? '算法深入' : '模块深入';
  $('#detailTitle').textContent = object.name || id;
  const body = $('#detailBody');
  body.innerHTML = kind === 'algorithm' ? buildAlgorithmDetail(object) : buildModuleDetail(object);
  setupCodeBlocks(body);
  detail.hidden = false;
  const panel = detail.querySelector('.detail-panel');
  if (panel) panel.scrollTop = 0;
  const close = $('#detailClose');
  if (close) close.focus();
};

IS.closeDetail = function (restoreFocus = true) {
  const detail = $('#detail');
  if (!detail || detail.hidden) return;
  detail.hidden = true;
  detail.dataset.type = '';
  detail.dataset.id = '';
  unlockBody();
  if (restoreFocus && IS.state.lastFocus && document.contains(IS.state.lastFocus)) {
    IS.state.lastFocus.focus({ preventScroll: true });
  }
  IS.state.lastFocus = null;
};

IS.closeAllOverlays = function () {
  if (!document.getElementById('conceptModal').hidden) IS.closeConcept(false);
  if (!document.getElementById('detail').hidden) IS.closeDetail(false);
};

IS.renderSourcesSection = function () {
  const section = $('#sources');
  const root = $('#sourcesRoot');
  const sources = IS.T.sources || [];
  if (!sources.length) {
    if (section) section.remove();
    return;
  }
  root.innerHTML = sources.map(source => {
    const title = source.url
      ? `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title || source.id)}</a>`
      : esc(source.title || source.id);
    const meta = [
      sourceTypeLabel(source.type),
      source.author,
      source.publisher,
      source.publishedAt ? `发表 ${source.publishedAt}` : '',
      source.accessedAt ? `访问 ${source.accessedAt}` : ''
    ].filter(Boolean).join(' · ');
    const evidence = source.evidenceDescription
      ? `<div class="source-evidence">${raw(source.evidenceDescription)}</div>`
      : '';
    return `<li class="source-item" id="src-${esc(source.id)}"><div class="source-title">${title}</div><div class="source-meta">${esc(meta)}</div>${evidence}</li>`;
  }).join('');
};

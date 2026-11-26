/* 核心：数据索引、知识树、章节、滚动联动、主题与校验 */
const IS = {
  T: window.TOPIC || {},
  state: {
    currentChapterId: null,
    activeTreeNodeId: null,
    expanded: new Set(),
    preSearchExpanded: null,
    treeInitialized: false,
    theme: 'light',
    lastFocus: null,
    warnings: []
  },
  maps: {},
  dom: {
    treeNodes: new Map(),
    treeRows: new Map(),
    treeToggles: new Map(),
    treeChildUls: new Map()
  }
};

const TYPE_LABELS = {
  topic: '主题', chapter: '章节', section: '小节', concept: '概念',
  algorithm: '算法', module: '模块', component: '组件', process: '流程'
};
const TYPE_BADGES = {
  topic: '◆', chapter: '§', section: '·', concept: 'C',
  algorithm: 'A', module: 'M', component: '⬡', process: '→'
};
const SOURCE_TYPE_LABELS = {
  'official-documentation': '官方文档', 'academic-paper': '论文', github: 'GitHub',
  'technical-blog': '技术博客', book: '书籍', other: '其他'
};
const XREF_LABELS = {
  'depends-on': '依赖', 'related-to': '相关', 'compared-with': '对比',
  'implements': '实现', 'extends': '扩展', 'communicates-with': '通信',
  'alternative-to': '替代'
};

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v != null) node.setAttribute(k, v);
  });
  return node;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function raw(value) { return value == null ? '' : String(value); }

function byId(list) {
  const map = new Map();
  (list || []).forEach(item => { if (item && item.id) map.set(item.id, item); });
  return map;
}

function typeLabel(type) { return TYPE_LABELS[type] || type; }
function badgeFor(type) { return TYPE_BADGES[type] || '·'; }

function sourceTitle(id) {
  const source = IS.maps.sources && IS.maps.sources.get(id);
  return source ? source.title : id;
}

function sourceChips(ids) {
  const list = (ids || []).filter(Boolean);
  if (!list.length) return '';
  return list.map(id => {
    const title = sourceTitle(id);
    const short = title.length > 30 ? title.slice(0, 30) + '…' : title;
    return `<a class="source-chip" href="#src-${esc(id)}" title="${esc(title)}">${esc(short)}</a>`;
  }).join('');
}

function refButton(id, label) {
  const text = label || (IS.maps.concepts.get(id) || IS.maps.algorithms.get(id) ||
    IS.maps.modules.get(id) || IS.maps.chapters.get(id) || {}).name || id;
  if (IS.maps.concepts.has(id)) return `<button class="concept-link" data-concept="${esc(id)}">${esc(text)}</button>`;
  if (IS.maps.algorithms.has(id)) return `<button class="concept-link" data-algorithm="${esc(id)}">${esc(text)}</button>`;
  if (IS.maps.modules.has(id)) return `<button class="concept-link" data-module="${esc(id)}">${esc(text)}</button>`;
  const chapter = IS.maps.chapters.get(id);
  if (chapter) return `<a href="#ch-${esc(id)}">${esc(text)}</a>`;
  if (id === 'quiz') return '<a href="#quiz">测验</a>';
  if (id === 'sources') return '<a href="#sources">参考</a>';
  return `<span>${esc(text)}</span>`;
}

function chapterLabel(id) {
  if (id === 'quiz') return '测验';
  if (id === 'sources') return '参考';
  const chapter = IS.maps.chapters.get(id);
  return chapter ? chapter.title : id;
}

function xrefLabel(type) { return XREF_LABELS[type] || type; }
function sourceTypeLabel(type) { return SOURCE_TYPE_LABELS[type] || type || '来源'; }

function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 1600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制');
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); toast('已复制'); }
    catch (err) { toast('复制失败，请手动选择'); }
    area.remove();
  }
}

function highlightCode(code, lang) {
  if (code.dataset.highlighted) return;
  const source = code.textContent;
  if (!source.trim()) return;
  try {
    const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const hashLangs = /^(py|python|sh|bash|shell|yaml|yml|ruby|rb|toml)$/i;
    const slashLangs = /^(js|javascript|ts|typescript|jsx|tsx|java|c|cpp|cs|csharp|go|rust|rs|swift|kotlin|kt|json|css|scss|less)$/i;
    let commentPattern;
    if (hashLangs.test(lang)) commentPattern = '#[^\\n]*';
    else if (slashLangs.test(lang)) commentPattern = '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
    else commentPattern = '\\/\\/[^\\n]*|#[^\\n]*';
    const stringPattern = "\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`";
    const re = new RegExp(`(${commentPattern})|(${stringPattern})|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[A-Za-z_][A-Za-z0-9_]*\\b)`, 'g');
    const keywords = new Set([
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new',
      'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw',
      'typeof', 'instanceof', 'in', 'of', 'this', 'super', 'extends', 'implements', 'interface',
      'type', 'enum', 'def', 'self', 'None', 'True', 'False', 'and', 'or', 'not', 'is', 'lambda',
      'with', 'as', 'pass', 'break', 'continue', 'yield', 'raise', 'except', 'global', 'nonlocal',
      'print', 'range', 'len', 'int', 'float', 'str', 'list', 'dict', 'set', 'tuple', 'do', 'switch',
      'case', 'void', 'public', 'private', 'protected', 'static', 'final', 'struct', 'impl', 'fn',
      'mut', 'use', 'mod', 'pub', 'match', 'where', 'select', 'insert', 'update', 'delete', 'create'
    ]);
    let out = '';
    let last = 0;
    let match;
    while ((match = re.exec(escaped))) {
      out += escaped.slice(last, match.index);
      if (match[1]) out += `<span class="tok-com">${match[1]}</span>`;
      else if (match[2]) out += `<span class="tok-str">${match[2]}</span>`;
      else if (match[3]) out += `<span class="tok-num">${match[3]}</span>`;
      else if (match[4] && keywords.has(match[4])) out += `<span class="tok-key">${match[4]}</span>`;
      else out += match[4];
      last = re.lastIndex;
    }
    out += escaped.slice(last);
    code.innerHTML = out;
    code.dataset.highlighted = '1';
  } catch (error) {
    console.warn('[InterStudy] 代码高亮失败', error);
  }
}

function setupCodeBlocks(root) {
  $$('pre', root).forEach(pre => {
    if (pre.querySelector('.copy-btn')) return;
    const code = pre.querySelector('code');
    if (!code) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = '复制';
    button.addEventListener('click', event => {
      event.stopPropagation();
      copyText(code.textContent);
    });
    pre.appendChild(button);
    if (code.dataset.lang) highlightCode(code, code.dataset.lang);
  });
}

function validateTopic() {
  const warnings = [];
  const T = IS.T;
  const meta = T.meta || {};
  if (!meta.title) warnings.push('meta.title 缺失');
  if (!meta.slug) warnings.push('meta.slug 缺失，文件名将使用 topic');
  if (!Array.isArray(T.chapters) || !T.chapters.length) warnings.push('至少需要一个章节');
  if (!T.tree || !Array.isArray(T.tree.nodes) || !T.tree.nodes.length) warnings.push('知识树为空');
  if (Array.isArray(T.quiz) && T.quiz.length !== 5) warnings.push(`测验应为 5 题，当前 ${T.quiz.length} 题`);
  if (!Array.isArray(T.quiz) || !T.quiz.length) warnings.push('测验为空');

  const chapterIds = new Set((T.chapters || []).map(c => c.id));
  if (chapterIds.has('quiz') || chapterIds.has('sources')) warnings.push('章节 id 不能使用 quiz 或 sources');

  (T.chapters || []).forEach(ch => {
    (ch.sceneIds || []).forEach(id => {
      if (!IS.maps.scenes.has(id)) warnings.push(`章节 ${ch.id} 引用了不存在的场景 ${id}`);
    });
    (ch.sourceIds || []).forEach(id => {
      if (!IS.maps.sources.has(id)) warnings.push(`章节 ${ch.id} 引用了不存在的来源 ${id}`);
    });
    if (/<script\b/i.test(ch.content || '')) warnings.push(`章节 ${ch.id} 包含 <script>`);
  });

  (T.tree.nodes || []).forEach(node => {
    const target = node.targetId;
    if (!target) return;
    if (node.type === 'chapter' && !chapterIds.has(target) && target !== 'quiz' && target !== 'sources') {
      warnings.push(`树节点 ${node.id} 指向不存在的章节 ${target}`);
    }
    if (node.type === 'concept' && !IS.maps.concepts.has(target)) warnings.push(`树节点 ${node.id} 指向不存在的概念 ${target}`);
    if (node.type === 'algorithm' && !IS.maps.algorithms.has(target)) warnings.push(`树节点 ${node.id} 指向不存在的算法 ${target}`);
    if ((node.type === 'module' || node.type === 'component') && !IS.maps.modules.has(target)) {
      warnings.push(`树节点 ${node.id} 指向不存在的模块 ${target}`);
    }
    if (node.type === 'process' && !IS.maps.algorithms.has(target) && !IS.maps.modules.has(target)) {
      warnings.push(`树节点 ${node.id} 指向不存在的流程对象 ${target}`);
    }
  });

  (T.concepts || []).forEach(c => {
    (c.relatedConceptIds || []).forEach(id => {
      if (!IS.maps.concepts.has(id)) warnings.push(`概念 ${c.id} 关联了不存在的概念 ${id}`);
    });
  });
  (T.algorithms || []).forEach(a => {
    (a.relatedAlgorithmIds || []).forEach(id => {
      if (!IS.maps.algorithms.has(id)) warnings.push(`算法 ${a.id} 关联了不存在的算法 ${id}`);
    });
  });
  (T.quiz || []).forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length < 2) warnings.push(`测验第 ${i + 1} 题选项不足`);
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= (q.options || []).length) {
      warnings.push(`测验第 ${i + 1} 题 answer 下标无效`);
    }
  });

  IS.state.warnings = warnings;
  if (warnings.length) {
    console.warn('[InterStudy] 内容校验警告：', warnings);
    if (/[?&](debug|validate)\b/.test(location.search)) {
      const banner = el('div', 'callout');
      banner.innerHTML = `<strong>内容校验警告</strong><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>`;
      $('#main').prepend(banner);
    }
  }
}

IS.index = function () {
  const T = IS.T;
  T.chapters = T.chapters || [];
  T.concepts = T.concepts || [];
  T.algorithms = T.algorithms || [];
  T.modules = T.modules || [];
  T.scenes = T.scenes || [];
  T.sources = T.sources || [];
  T.crossReferences = T.crossReferences || [];
  T.quiz = T.quiz || [];
  T.tree = T.tree || { rootId: null, nodes: [] };
  T.tree.nodes = T.tree.nodes || [];

  IS.maps.chapters = byId(T.chapters);
  IS.maps.concepts = byId(T.concepts);
  IS.maps.algorithms = byId(T.algorithms);
  IS.maps.modules = byId(T.modules);
  IS.maps.scenes = byId(T.scenes);
  IS.maps.sources = byId(T.sources);
  IS.maps.nodes = byId(T.tree.nodes);
  IS.maps.children = new Map();
  T.tree.nodes.forEach(node => {
    const key = node.parentId || '__root__';
    if (!IS.maps.children.has(key)) IS.maps.children.set(key, []);
    IS.maps.children.get(key).push(node);
  });
  IS.maps.children.forEach(list => list.sort((a, b) => (a.order || 0) - (b.order || 0)));
};

function childrenOf(id) { return IS.maps.children.get(id) || []; }

IS.renderHero = function () {
  const meta = IS.T.meta || {};
  $('#heroEyebrow').textContent = meta.subtitle || '交互式技术学习';
  $('#heroTitle').textContent = meta.title || '未命名主题';
  $('#heroLede').textContent = meta.description || '';
  $('#topicTitle').textContent = meta.title || '';

  const chapters = IS.T.chapters || [];
  const scenes = IS.T.scenes || [];
  const sources = IS.T.sources || [];
  const chars = chapters.reduce((sum, ch) => sum + String(ch.content || '').replace(/<[^>]+>/g, '').length, 0);
  const minutes = Math.max(5, Math.round(chars / 500));

  const chips = [
    `${chapters.length} 章`,
    `${scenes.length} 个图解`,
    `约 ${minutes} 分钟`,
    `${sources.length} 个来源`
  ];
  const metaRoot = $('#heroMeta');
  metaRoot.innerHTML = '';
  chips.forEach(text => metaRoot.appendChild(el('span', 'meta-chip', esc(text))));

  $('#sidebarFoot').textContent = `${chapters.length} 章 · ${scenes.length} 个图解 · ${sources.length} 个来源`;
  $('#pageFooter').innerHTML = `<span>InterStudy · 交互式技术学习页</span><span>${esc(meta.createdAt || '')}${meta.createdAt ? ' · ' : ''}关键结论请查阅原始来源</span>`;
};

IS.renderChapters = function () {
  const root = $('#chapters');
  root.innerHTML = '';
  const chapters = (IS.T.chapters || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!chapters.length) {
    root.appendChild(el('p', 'empty', '暂无章节。'));
    return;
  }
  chapters.forEach((chapter, index) => {
    const section = document.createElement('section');
    section.className = 'chapter';
    section.id = `ch-${chapter.id}`;
    section.dataset.chapter = chapter.id;

    const head = el('div', 'chapter-head');
    head.innerHTML = `<div class="chapter-kicker">第 ${index + 1} 章</div><h2>${esc(chapter.title || '')}</h2>${chapter.summary ? `<p class="chapter-summary">${esc(chapter.summary)}</p>` : ''}`;
    section.appendChild(head);

    const content = el('div', 'chapter-content', raw(chapter.content));
    section.appendChild(content);
    IS.renderScenesInChapter(content, chapter);

    const sources = document.createElement('div');
    if (chapter.sourceIds && chapter.sourceIds.length) {
      sources.className = 'chapter-sources';
      sources.innerHTML = `<span class="label">本章来源</span>${sourceChips(chapter.sourceIds)}`;
      section.appendChild(sources);
    }
    root.appendChild(section);
  });
};

IS.renderTree = function () {
  const tree = $('#tree');
  tree.innerHTML = '';
  const rootNode = IS.maps.nodes.get(IS.T.tree.rootId);
  if (!rootNode) {
    tree.appendChild(el('p', 'empty', '知识树为空。'));
    return;
  }
  if (!IS.state.treeInitialized) {
    IS.state.expanded.add(rootNode.id);
    childrenOf(rootNode.id).forEach(node => IS.state.expanded.add(node.id));
    IS.state.treeInitialized = true;
  }
  tree.appendChild(buildTreeNode(rootNode));
  IS.updateTreeActive(IS.state.currentChapterId);
};

function buildTreeNode(node) {
  const li = document.createElement('li');
  li.className = `tree-node type-${node.type}`;
  li.dataset.nodeId = node.id;
  IS.dom.treeNodes.set(node.id, li);

  const row = document.createElement('div');
  row.className = 'tree-row';
  row.dataset.nodeId = node.id;
  row.setAttribute('role', 'treeitem');
  IS.dom.treeRows.set(node.id, row);

  const children = childrenOf(node.id);
  if (children.length) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle';
    toggle.textContent = '▸';
    toggle.setAttribute('aria-label', `展开或收起 ${node.title || ''}`);
    toggle.setAttribute('aria-expanded', String(IS.state.expanded.has(node.id)));
    if (IS.state.expanded.has(node.id)) toggle.classList.add('open');
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      toggleTreeNode(node.id);
    });
    row.appendChild(toggle);
    IS.dom.treeToggles.set(node.id, toggle);
  } else {
    row.appendChild(el('span', 'tree-spacer'));
  }

  const badge = el('span', 'tree-badge', esc(badgeFor(node.type)));
  badge.title = typeLabel(node.type);
  row.appendChild(badge);
  row.appendChild(el('span', 'tree-title', esc(node.title || '')));

  row.addEventListener('click', () => activateTreeNode(node));
  li.appendChild(row);

  if (children.length) {
    const ul = document.createElement('ul');
    ul.className = 'tree-children';
    ul.hidden = !IS.state.expanded.has(node.id);
    children.forEach(child => ul.appendChild(buildTreeNode(child)));
    li.appendChild(ul);
    IS.dom.treeChildUls.set(node.id, ul);
  }
  return li;
}

function applyExpanded(id, open) {
  const ul = IS.dom.treeChildUls.get(id);
  const toggle = IS.dom.treeToggles.get(id);
  if (ul) ul.hidden = !open;
  if (toggle) {
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  if (open) IS.state.expanded.add(id);
  else IS.state.expanded.delete(id);
}

function toggleTreeNode(id) {
  const open = !IS.state.expanded.has(id);
  applyExpanded(id, open);
}

function expandAncestors(id) {
  let node = IS.maps.nodes.get(id);
  while (node && node.parentId) {
    applyExpanded(node.parentId, true);
    node = IS.maps.nodes.get(node.parentId);
  }
}

function activateTreeNode(node) {
  if (node.type === 'topic') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (node.type === 'concept') {
    IS.openConcept(node.targetId);
  } else if (node.type === 'algorithm') {
    IS.openDetail('algorithm', node.targetId);
  } else if (node.type === 'module' || node.type === 'component') {
    IS.openDetail('module', node.targetId);
  } else if (node.type === 'process') {
    IS.openDetail(IS.maps.algorithms.has(node.targetId) ? 'algorithm' : 'module', node.targetId);
  } else {
    IS.scrollToTarget(node.targetId);
  }
  IS.closeNav();
}

IS.scrollToTarget = function (id) {
  if (!id) return;
  const direct = document.getElementById(id);
  const chapter = document.getElementById(`ch-${id}`);
  if (chapter) {
    chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    IS.setActiveChapter(id);
    return;
  }
  if (direct) {
    direct.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const parent = direct.closest('[data-chapter]');
    if (parent) IS.setActiveChapter(parent.dataset.chapter);
  }
};

IS.setActiveChapter = function (id) {
  if (!id) return;
  if (IS.state.currentChapterId === id && IS.state.activeTreeNodeId) return;
  const same = IS.state.currentChapterId === id;
  IS.state.currentChapterId = id;
  $('#chapterIndicator').textContent = chapterLabel(id);

  IS.dom.treeRows.forEach(row => {
    row.classList.remove('active');
    row.removeAttribute('aria-current');
  });

  const matches = (IS.T.tree.nodes || []).filter(node =>
    node.targetId === id && (node.type === 'chapter' || node.type === 'section')
  );
  matches.forEach(node => {
    const row = IS.dom.treeRows.get(node.id);
    if (row) {
      row.classList.add('active');
      row.setAttribute('aria-current', 'page');
      IS.state.activeTreeNodeId = node.id;
    }
    expandAncestors(node.id);
  });

  if (!same && matches.length) {
    const first = IS.dom.treeRows.get(matches[0].id);
    const tree = $('#tree');
    if (first && tree) {
      const rowRect = first.getBoundingClientRect();
      const treeRect = tree.getBoundingClientRect();
      if (rowRect.top < treeRect.top || rowRect.bottom > treeRect.bottom) {
        tree.scrollTop += rowRect.top - treeRect.top - tree.clientHeight / 2;
      }
    }
  }
};

IS.updateTreeActive = function (id) { if (id) IS.setActiveChapter(id); };

function setupTreeSearch() {
  const input = $('#treeSearch');
  if (!input) return;
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => applyTreeSearch(input.value.trim()), 120);
  });
}

function applyTreeSearch(query) {
  const nodes = IS.T.tree.nodes || [];
  if (!query) {
    if (IS.state.preSearchExpanded) {
      IS.state.expanded = new Set(IS.state.preSearchExpanded);
      IS.state.preSearchExpanded = null;
    }
    nodes.forEach(node => {
      const li = IS.dom.treeNodes.get(node.id);
      const row = IS.dom.treeRows.get(node.id);
      if (li) li.hidden = false;
      if (row) row.classList.remove('match');
      applyExpanded(node.id, IS.state.expanded.has(node.id));
    });
    return;
  }
  if (!IS.state.preSearchExpanded) {
    IS.state.preSearchExpanded = new Set(IS.state.expanded);
  }
  const needle = query.toLowerCase();
  const matches = new Set();
  nodes.forEach(node => {
    const text = `${node.title || ''} ${node.description || ''}`.toLowerCase();
    if (text.includes(needle)) matches.add(node.id);
  });
  const visible = new Set(matches);
  matches.forEach(id => {
    let node = IS.maps.nodes.get(id);
    while (node && node.parentId) {
      visible.add(node.parentId);
      node = IS.maps.nodes.get(node.parentId);
    }
  });
  nodes.forEach(node => {
    const li = IS.dom.treeNodes.get(node.id);
    const row = IS.dom.treeRows.get(node.id);
    if (li) li.hidden = !visible.has(node.id);
    if (row) row.classList.toggle('match', matches.has(node.id));
  });
  visible.forEach(id => applyExpanded(id, true));
}

IS.closeNav = function () {};

function setupMobileNav() {
  const body = document.body;
  const button = $('#navToggle');
  const backdrop = $('#sidebarBackdrop');
  if (!button || !backdrop) return;
  const open = () => {
    body.classList.add('nav-open');
    button.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
  };
  const close = () => {
    body.classList.remove('nav-open');
    button.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
  };
  IS.closeNav = close;
  button.addEventListener('click', () => body.classList.contains('nav-open') ? close() : open());
  backdrop.addEventListener('click', close);
  window.addEventListener('resize', () => { if (window.innerWidth > 900) close(); });
}

function setupTheme() {
  const root = document.documentElement;
  const button = $('#themeToggle');
  const setTheme = theme => {
    root.dataset.theme = theme;
    IS.state.theme = theme;
    if (button) {
      button.textContent = theme === 'dark' ? '☀' : '◐';
      button.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
    }
    try { localStorage.setItem('interstudy-theme', theme); } catch (error) { /* 离线文件可能禁用存储 */ }
  };
  let saved = null;
  try { saved = localStorage.getItem('interstudy-theme'); } catch (error) { /* ignore */ }
  setTheme(saved === 'dark' ? 'dark' : 'light');
  if (button) {
    button.addEventListener('click', () => setTheme(IS.state.theme === 'dark' ? 'light' : 'dark'));
  }
}

function setupScrollSpy() {
  const sections = $$('.chapter');
  if (!sections.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const bar = $('#progressBar');
    if (bar) bar.style.width = `${progress * 100}%`;

    const line = window.scrollY + 150;
    let current = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top + window.scrollY <= line) current = section;
    });
    if (current && current.dataset.chapter) IS.setActiveChapter(current.dataset.chapter);
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

function setupGlobalClicks() {
  document.addEventListener('click', event => {
    const concept = event.target.closest('[data-concept]');
    if (concept) {
      event.preventDefault();
      IS.openConcept(concept.dataset.concept);
      IS.closeNav();
      return;
    }
    const algorithm = event.target.closest('[data-algorithm]');
    if (algorithm) {
      event.preventDefault();
      IS.openDetail('algorithm', algorithm.dataset.algorithm);
      IS.closeNav();
      return;
    }
    const module = event.target.closest('[data-module]');
    if (module) {
      event.preventDefault();
      IS.openDetail('module', module.dataset.module);
      IS.closeNav();
      return;
    }
    const close = event.target.closest('[data-close="concept"]');
    if (close) {
      event.preventDefault();
      IS.closeConcept();
      return;
    }
    const sourceLink = event.target.closest('a[href^="#src-"]');
    if (sourceLink) {
      IS.closeAllOverlays();
      return;
    }
    const pageLink = event.target.closest('a[href^="#ch-"], a[href="#quiz"], a[href="#sources"]');
    if (pageLink && (!document.getElementById('detail').hidden || !document.getElementById('conceptModal').hidden)) {
      IS.closeAllOverlays();
    }
  });

  const detail = $('#detail');
  if (detail) {
    detail.addEventListener('click', event => {
      if (event.target === detail) IS.closeDetail();
    });
  }
  const back = $('#detailBack');
  const close = $('#detailClose');
  if (back) back.addEventListener('click', () => IS.closeDetail());
  if (close) close.addEventListener('click', () => IS.closeDetail());

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!document.getElementById('conceptModal').hidden) IS.closeConcept();
    else if (!document.getElementById('detail').hidden) IS.closeDetail();
  });
}

IS.init = function () {
  IS.index();
  validateTopic();
  IS.renderHero();
  IS.renderChapters();
  IS.renderTree();
  IS.renderQuiz();
  IS.renderSourcesSection();
  setupTheme();
  setupTreeSearch();
  setupMobileNav();
  setupGlobalClicks();
  setupScrollSpy();
  setupCodeBlocks(document);

  const hash = decodeURIComponent(location.hash.slice(1));
  let initial = (IS.T.chapters[0] || {}).id || null;
  if (hash.startsWith('ch-')) initial = hash.slice(3);
  else if (hash === 'quiz' || hash === 'sources') initial = hash;
  if (initial) IS.setActiveChapter(initial);
  if (hash && document.getElementById(hash)) {
    setTimeout(() => document.getElementById(hash).scrollIntoView({ block: 'start' }), 0);
  }
};

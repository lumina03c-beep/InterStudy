#!/usr/bin/env node
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'template');
const ENGINE_FILES = ['core.js', 'details.js', 'scenes.js', 'quiz.js', 'main.js'];
const SCENE_TYPES = new Set(['timeline', 'architecture', 'sequence', 'process', 'comparison', 'algorithm', 'data-structure', 'concept', 'future-scenario']);
const SOURCE_TYPES = new Set(['official-documentation', 'academic-paper', 'github', 'technical-blog', 'book', 'other']);

const args = process.argv.slice(2);
if (!args.length) {
  console.error('用法: node scripts/build.mjs <topic.json> [output.html]');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), args[0]);
let topic;
try {
  topic = JSON.parse(await readFile(inputPath, 'utf8'));
} catch (error) {
  console.error(`无法读取或解析 ${inputPath}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const fail = message => errors.push(message);
const warn = message => warnings.push(message);
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const array = value => Array.isArray(value) ? value : [];
const text = value => typeof value === 'string' ? value : '';
const requireString = (value, label) => {
  if (!text(value).trim()) fail(`${label} 必须是非空字符串`);
};

function checkIds(list, label) {
  const seen = new Set();
  list.forEach((item, i) => {
    if (!isObject(item)) {
      fail(`${label}[${i}] 必须是对象`);
      return;
    }
    if (!text(item.id)) fail(`${label}[${i}].id 缺失`);
    else if (seen.has(item.id)) fail(`${label} 中 id 重复：${item.id}`);
    else seen.add(item.id);
  });
  return seen;
}

if (!isObject(topic)) fail('topic.json 顶层必须是对象');
const meta = isObject(topic.meta) ? topic.meta : {};
const chapters = array(topic.chapters);
const concepts = array(topic.concepts);
const algorithms = array(topic.algorithms);
const modules = array(topic.modules);
const scenes = array(topic.scenes);
const crossReferences = array(topic.crossReferences);
const sources = array(topic.sources);
const quiz = array(topic.quiz);
const tree = isObject(topic.tree) ? topic.tree : {};
const nodes = array(tree.nodes);

const chapterIds = checkIds(chapters, 'chapters');
const conceptIds = checkIds(concepts, 'concepts');
const algorithmIds = checkIds(algorithms, 'algorithms');
const moduleIds = checkIds(modules, 'modules');
const sceneIds = checkIds(scenes, 'scenes');
const sourceIds = checkIds(sources, 'sources');
const nodeIds = checkIds(nodes, 'tree.nodes');
const nodeById = new Map(nodes.filter(isObject).map(node => [node.id, node]));

const contentIds = new Set();
[['chapters', chapterIds], ['concepts', conceptIds], ['algorithms', algorithmIds], ['modules', moduleIds]].forEach(([label, ids]) => {
  ids.forEach(id => {
    if (contentIds.has(id)) warn(`内容 id 冲突：${id}（${label}）会导致引用歧义`);
    contentIds.add(id);
  });
});

if (!isObject(topic.meta)) fail('meta 缺失或不是对象');
requireString(meta.title, 'meta.title');
requireString(meta.description, 'meta.description');
requireString(meta.slug, 'meta.slug');
if (text(meta.slug) && !/^[a-z0-9][a-z0-9-]*$/.test(meta.slug)) fail('meta.slug 只能包含小写字母、数字和连字符');
if (text(meta.createdAt) && !/^\d{4}-\d{2}-\d{2}$/.test(meta.createdAt)) warn('meta.createdAt 建议使用 YYYY-MM-DD');

if (!chapters.length) fail('chapters 至少需要 1 章');
chapters.forEach((chapter, i) => {
  if (!isObject(chapter)) return;
  requireString(chapter.title, `chapters[${i}].title`);
  requireString(chapter.content, `chapters[${i}].content`);
  if (!Number.isFinite(Number(chapter.order))) warn(`chapters[${i}].order 不是数字`);
  array(chapter.sceneIds).forEach(id => {
    if (!sceneIds.has(id)) fail(`章节 ${chapter.id || i} 的 sceneIds 引用了不存在的场景 ${id}`);
  });
  array(chapter.sourceIds).forEach(id => {
    if (!sourceIds.has(id)) fail(`章节 ${chapter.id || i} 的 sourceIds 引用了不存在的来源 ${id}`);
  });
  const content = text(chapter.content);
  const refs = [
    [/data-scene="([^"]+)"/g, sceneIds, '场景'],
    [/data-concept="([^"]+)"/g, conceptIds, '概念'],
    [/data-algorithm="([^"]+)"/g, algorithmIds, '算法'],
    [/data-module="([^"]+)"/g, moduleIds, '模块'],
    [/href="#src-([^"]+)"/g, sourceIds, '来源']
  ];
  refs.forEach(([pattern, ids, label]) => {
    [...content.matchAll(pattern)].forEach(match => {
      if (!ids.has(match[1])) fail(`章节 ${chapter.id || i} 的正文引用了不存在的${label} ${match[1]}`);
    });
  });
});

if (!isObject(topic.tree)) fail('tree 缺失或不是对象');
if (!text(tree.rootId)) fail('tree.rootId 缺失');
if (nodes.length && !nodeIds.has(tree.rootId)) fail(`tree.rootId 不存在：${tree.rootId}`);
nodes.forEach((node, i) => {
  if (!isObject(node)) return;
  requireString(node.title, `tree.nodes[${i}].title`);
  if (!text(node.type)) fail(`tree.nodes[${i}].type 缺失`);
  if (node.id === tree.rootId) {
    if (node.parentId != null) fail('根节点的 parentId 必须为 null');
  } else if (!text(node.parentId)) {
    fail(`树节点 ${node.id || i} 缺少 parentId`);
  } else if (!nodeIds.has(node.parentId)) {
    fail(`树节点 ${node.id || i} 的 parentId 不存在：${node.parentId}`);
  } else if (node.parentId === node.id) {
    fail(`树节点 ${node.id || i} 不能以自己为父节点`);
  }

  const type = node.type;
  if (['chapter', 'section', 'concept', 'algorithm', 'module', 'component', 'process'].includes(type) && !text(node.targetId)) {
    fail(`树节点 ${node.id || i}（${type}）缺少 targetId`);
  }
  if (type === 'chapter' && !chapterIds.has(node.targetId) && node.targetId !== 'quiz' && node.targetId !== 'sources') fail(`树节点 ${node.id || i} 指向不存在的章节 ${node.targetId}`);
  if (type === 'concept' && !conceptIds.has(node.targetId)) fail(`树节点 ${node.id || i} 指向不存在的概念 ${node.targetId}`);
  if (type === 'algorithm' && !algorithmIds.has(node.targetId)) fail(`树节点 ${node.id || i} 指向不存在的算法 ${node.targetId}`);
  if ((type === 'module' || type === 'component') && !moduleIds.has(node.targetId)) fail(`树节点 ${node.id || i} 指向不存在的模块 ${node.targetId}`);
  if (type === 'process' && !algorithmIds.has(node.targetId) && !moduleIds.has(node.targetId)) fail(`树节点 ${node.id || i} 的 process targetId 必须是算法或模块`);
});

nodes.forEach(node => {
  if (!isObject(node)) return;
  const seen = new Set();
  let current = node;
  while (current && current.parentId != null) {
    if (seen.has(current.id)) {
      fail(`知识树存在环：${node.id}`);
      break;
    }
    seen.add(current.id);
    current = nodeById.get(current.parentId);
  }
});

function ancestorChapter(node) {
  let current = node;
  const seen = new Set();
  while (current && current.parentId != null) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    current = nodeById.get(current.parentId);
    if (current && current.type === 'chapter') return current.targetId;
  }
  return null;
}

nodes.forEach(node => {
  if (!isObject(node) || node.type !== 'section') return;
  const chapterId = ancestorChapter(node);
  const chapter = chapters.find(item => item.id === chapterId);
  if (!chapter) return;
  const anchor = text(node.targetId);
  const content = text(chapter.content);
  if (anchor && !content.includes(`id="${anchor}"`) && !content.includes(`id='${anchor}'`)) {
    warn(`树节点 ${node.id} 的锚点 #${anchor} 未在章节 ${chapter.id} 的正文中找到`);
  }
});

scenes.forEach((scene, i) => {
  if (!isObject(scene)) return;
  if (!SCENE_TYPES.has(scene.type)) fail(`场景 ${scene.id || i} 的类型无效：${scene.type}`);
  requireString(scene.title, `scenes[${i}].title`);
  if (!isObject(scene.data)) fail(`场景 ${scene.id || i} 缺少 data 对象`);
  const data = isObject(scene.data) ? scene.data : {};

  if (scene.type === 'timeline') {
    if (!array(data.events).length) fail(`场景 ${scene.id} 的 events 为空`);
    array(data.events).forEach((event, j) => {
      if (!isObject(event) || !text(event.title)) fail(`场景 ${scene.id} 的 events[${j}].title 缺失`);
    });
  } else if (scene.type === 'architecture') {
    const list = array(data.nodes);
    if (!list.length) fail(`场景 ${scene.id} 的 nodes 为空`);
    const ids = new Set();
    list.forEach((node, j) => {
      if (!isObject(node) || !text(node.id)) fail(`场景 ${scene.id} 的 nodes[${j}].id 缺失`);
      else if (ids.has(node.id)) fail(`场景 ${scene.id} 的节点 id 重复：${node.id}`);
      else ids.add(node.id);
      if (!text(node.label)) warn(`场景 ${scene.id} 的节点 ${node.id || j} 缺少 label`);
    });
    array(data.edges).forEach((edge, j) => {
      if (!isObject(edge)) return;
      if (!ids.has(edge.from) || !ids.has(edge.to)) fail(`场景 ${scene.id} 的 edges[${j}] 引用了不存在的节点`);
    });
  } else if (scene.type === 'sequence') {
    const actors = array(data.actors);
    if (!actors.length) fail(`场景 ${scene.id} 的 actors 为空`);
    const keys = new Set();
    actors.forEach((actor, j) => {
      if (typeof actor === 'string') {
        if (!actor) fail(`场景 ${scene.id} 的 actors[${j}] 为空`);
        else keys.add(actor);
      } else if (isObject(actor)) {
        if (!actor.id && !actor.label) fail(`场景 ${scene.id} 的 actors[${j}] 缺少 id 或 label`);
        if (actor.id) keys.add(actor.id);
        if (actor.label) keys.add(actor.label);
      }
    });
    const messages = array(data.messages);
    if (!messages.length) fail(`场景 ${scene.id} 的 messages 为空`);
    messages.forEach((message, j) => {
      if (!isObject(message)) return;
      if (!keys.has(message.from) || !keys.has(message.to)) fail(`场景 ${scene.id} 的 messages[${j}] 引用了不存在的 actor`);
      if (!text(message.label)) warn(`场景 ${scene.id} 的 messages[${j}].label 为空`);
    });
  } else if (scene.type === 'process') {
    if (array(data.steps).length < 2) fail(`场景 ${scene.id} 至少需要 2 个步骤`);
    array(data.steps).forEach((step, j) => {
      if (!isObject(step) || !text(step.title)) fail(`场景 ${scene.id} 的 steps[${j}].title 缺失`);
    });
  } else if (scene.type === 'comparison') {
    const dimensions = array(data.dimensions);
    const options = array(data.options);
    if (!dimensions.length) fail(`场景 ${scene.id} 的 dimensions 为空`);
    if (options.length < 2) fail(`场景 ${scene.id} 至少需要 2 个选项`);
    options.forEach((option, j) => {
      if (!isObject(option) || !text(option.name)) fail(`场景 ${scene.id} 的 options[${j}].name 缺失`);
      if (array(option.values).length !== dimensions.length) fail(`场景 ${scene.id} 的选项 ${option.name || j} 的 values 数量与 dimensions 不一致`);
    });
  } else if (scene.type === 'algorithm') {
    const columns = array(data.columns);
    const rows = array(data.rows);
    if (!columns.length) fail(`场景 ${scene.id} 的 columns 为空`);
    if (!rows.length) fail(`场景 ${scene.id} 的 rows 为空`);
    rows.forEach((row, j) => {
      if (array(row).length !== columns.length) fail(`场景 ${scene.id} 的 rows[${j}] 列数与 columns 不一致`);
    });
    if (data.formula && !text(data.formula).includes('<math')) warn(`场景 ${scene.id} 的 formula 建议使用 MathML`);
  } else if (scene.type === 'data-structure') {
    const items = array(data.items);
    if (!items.length) fail(`场景 ${scene.id} 的 items 为空`);
    array(data.steps).forEach((step, j) => {
      if (!isObject(step)) return;
      array(step.highlight).forEach(index => {
        if (!Number.isInteger(index) || index < 0 || index >= items.length) fail(`场景 ${scene.id} 的 steps[${j}].highlight 下标越界：${index}`);
      });
    });
  } else if (scene.type === 'concept') {
    const groups = array(data.groups);
    if (!groups.length) fail(`场景 ${scene.id} 的 groups 为空`);
    groups.forEach((group, j) => {
      if (!isObject(group) || !text(group.name)) fail(`场景 ${scene.id} 的 groups[${j}].name 缺失`);
      array(group.concepts).forEach(id => {
        if (!conceptIds.has(id)) fail(`场景 ${scene.id} 的分组引用了不存在的概念 ${id}`);
      });
    });
    array(data.edges).forEach((edge, j) => {
      if (!isObject(edge)) return;
      if (!conceptIds.has(edge.from) || !conceptIds.has(edge.to)) fail(`场景 ${scene.id} 的 edges[${j}] 引用了不存在的概念`);
    });
  } else if (scene.type === 'future-scenario') {
    if (!array(data.branches).length) fail(`场景 ${scene.id} 的 branches 为空`);
    array(data.branches).forEach((branch, j) => {
      if (!isObject(branch) || !text(branch.title)) fail(`场景 ${scene.id} 的 branches[${j}].title 缺失`);
      if (!['fact', 'trend', 'speculation'].includes(branch.status)) fail(`场景 ${scene.id} 的 branches[${j}].status 无效：${branch.status}`);
      if (branch.status === 'speculation' && !text(branch.evidence)) warn(`场景 ${scene.id} 的推测分支 ${branch.title || j} 建议补充 evidence`);
    });
  }

  array(scene.sourceIds).forEach(id => {
    if (!sourceIds.has(id)) fail(`场景 ${scene.id} 引用了不存在的来源 ${id}`);
  });
});

concepts.forEach((concept, i) => {
  if (!isObject(concept)) return;
  requireString(concept.name, `concepts[${i}].name`);
  requireString(concept.definition, `concepts[${i}].definition`);
  if (!text(concept.explanation)) warn(`概念 ${concept.id || i} 缺少 explanation`);
  array(concept.relatedConceptIds).forEach(id => {
    if (!conceptIds.has(id)) fail(`概念 ${concept.id || i} 的 relatedConceptIds 引用了不存在的概念 ${id}`);
  });
  array(concept.sourceIds).forEach(id => {
    if (!sourceIds.has(id)) fail(`概念 ${concept.id || i} 引用了不存在的来源 ${id}`);
  });
});

algorithms.forEach((algorithm, i) => {
  if (!isObject(algorithm)) return;
  requireString(algorithm.name, `algorithms[${i}].name`);
  requireString(algorithm.problem, `algorithms[${i}].problem`);
  requireString(algorithm.principle, `algorithms[${i}].principle`);
  array(algorithm.relatedAlgorithmIds).forEach(id => {
    if (!algorithmIds.has(id)) fail(`算法 ${algorithm.id || i} 的 relatedAlgorithmIds 引用了不存在的算法 ${id}`);
  });
  array(algorithm.sourceIds).forEach(id => {
    if (!sourceIds.has(id)) fail(`算法 ${algorithm.id || i} 引用了不存在的来源 ${id}`);
  });
});

modules.forEach((module, i) => {
  if (!isObject(module)) return;
  requireString(module.name, `modules[${i}].name`);
  requireString(module.responsibility, `modules[${i}].responsibility`);
  array(module.sourceIds).forEach(id => {
    if (!sourceIds.has(id)) fail(`模块 ${module.id || i} 引用了不存在的来源 ${id}`);
  });
});

crossReferences.forEach((reference, i) => {
  if (!isObject(reference)) return;
  if (!contentIds.has(reference.sourceId)) fail(`crossReferences[${i}].sourceId 不存在：${reference.sourceId}`);
  if (!contentIds.has(reference.targetId)) fail(`crossReferences[${i}].targetId 不存在：${reference.targetId}`);
  if (!text(reference.type)) warn(`crossReferences[${i}].type 为空`);
});

if (!sources.length) warn('没有来源，来源区块会被移除');
sources.forEach((source, i) => {
  if (!isObject(source)) return;
  requireString(source.title, `sources[${i}].title`);
  if (text(source.url) && !/^https?:\/\//.test(source.url)) warn(`来源 ${source.id || i} 的 url 不是 http(s) 链接`);
  if (!SOURCE_TYPES.has(source.type)) warn(`来源 ${source.id || i} 的 type 未识别：${source.type}`);
  if (!text(source.evidenceDescription)) warn(`来源 ${source.id || i} 缺少 evidenceDescription`);
});

if (quiz.length !== 5) warn(`quiz 建议恰好 5 题，当前 ${quiz.length} 题`);
quiz.forEach((item, i) => {
  if (!isObject(item)) return;
  requireString(item.question, `quiz[${i}].question`);
  const options = array(item.options);
  if (options.length < 2) fail(`quiz[${i}] 至少需要 2 个选项`);
  const answer = Number(item.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) fail(`quiz[${i}].answer 越界：${item.answer}`);
});

const usedScenes = new Set();
chapters.forEach(chapter => {
  array(chapter.sceneIds).forEach(id => usedScenes.add(id));
  [...text(chapter.content).matchAll(/data-scene="([^"]+)"/g)].forEach(match => usedScenes.add(match[1]));
});
scenes.forEach(scene => {
  if (!usedScenes.has(scene.id)) warn(`场景 ${scene.id} 没有被任何章节使用`);
});
if (scenes.length < 3) warn(`场景数量为 ${scenes.length}，建议 3–6 个`);
if (scenes.length > 8) warn(`场景数量为 ${scenes.length}，建议拆分或精简`);
if (!concepts.length) warn('没有概念，概念弹窗不会出现');
if (!quiz.length) warn('没有测验，测验区块会被移除');

if (errors.length) {
  console.error(`✖ ${errors.length} 个错误：`);
  errors.forEach(message => console.error(`  - ${message}`));
  if (warnings.length) {
    console.error(`\n⚠ ${warnings.length} 条警告：`);
    warnings.forEach(message => console.error(`  - ${message}`));
  }
  process.exit(1);
}

const html = await readFile(path.join(TEMPLATE, 'index.html'), 'utf8');
const css = await readFile(path.join(TEMPLATE, 'styles.css'), 'utf8');
const engine = (await Promise.all(ENGINE_FILES.map(file => readFile(path.join(TEMPLATE, 'js', file), 'utf8')))).join('\n');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const topicJson = JSON.stringify(topic)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const replacements = {
  '__LANG__': escapeHtml(meta.language || 'zh-CN'),
  '__TITLE__': escapeHtml(meta.title || 'InterStudy'),
  '/*__STYLES__*/': css,
  '/*__TOPIC__*/': topicJson,
  '/*__ENGINE__*/': engine
};
const output = html.replace(/__LANG__|__TITLE__|\/\*__STYLES__\*\/|\/\*__TOPIC__\*\/|\/\*__ENGINE__\*\//g, token => replacements[token]);

const today = new Date().toISOString().slice(0, 10);
const slug = text(meta.slug) || 'interstudy';
let outputPath = args[1] ? path.resolve(process.cwd(), args[1]) : path.join(process.cwd(), `${today}-${slug}.html`);
const existing = await stat(outputPath).catch(() => null);
if (existing && existing.isDirectory()) outputPath = path.join(outputPath, `${today}-${slug}.html`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, 'utf8');

console.log(`✓ 生成 ${path.relative(process.cwd(), outputPath) || outputPath}`);
console.log(`  ${chapters.length} 章 · ${scenes.length} 场景 · ${concepts.length} 概念 · ${sources.length} 来源 · ${quiz.length} 题`);
console.log(`  ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB`);
if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} 条警告：`);
  warnings.forEach(message => console.warn(`  - ${message}`));
}

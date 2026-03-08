const PLATFORM_KEYS = ['feishu', 'wechat', 'xiaohongshu'];
const PLATFORM_LABELS = {
  feishu: '飞书',
  wechat: '公众号',
  xiaohongshu: '小红书'
};
const WECHAT_RECO_LIMIT = 10;
const WECHAT_DEFAULT_QUERY = '实用软件 免费工具 效率工具 工具测评';

const dom = {
  lanHint: document.getElementById('lanHint'),
  healthCard: document.getElementById('healthCard'),
  statusCard: document.getElementById('statusCard'),
  modelPrimaryInput: document.getElementById('modelPrimaryInput'),
  configEditor: document.getElementById('configEditor'),
  skillSlugInput: document.getElementById('skillSlugInput'),
  skillsList: document.getElementById('skillsList'),
  memoryFiles: document.getElementById('memoryFiles'),
  memoryEditor: document.getElementById('memoryEditor'),
  currentMemoryPath: document.getElementById('currentMemoryPath'),
  newMemoryFileInput: document.getElementById('newMemoryFileInput'),
  mediaPanel: document.getElementById('mediaPanel'),
  wechatRecoPanel: document.getElementById('wechatRecoPanel'),
  wechatSearchInput: document.getElementById('wechatSearchInput'),
  wechatSearchBtn: document.getElementById('wechatSearchBtn'),
  wechatSearchMsg: document.getElementById('wechatSearchMsg'),
  wechatRecoList: document.getElementById('wechatRecoList'),
  refreshAllBtn: document.getElementById('refreshAllBtn'),
  restartGatewayBtn: document.getElementById('restartGatewayBtn'),
  saveModelPrimaryBtn: document.getElementById('saveModelPrimaryBtn'),
  reloadConfigBtn: document.getElementById('reloadConfigBtn'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  formatConfigBtn: document.getElementById('formatConfigBtn'),
  reloadConfigTextBtn: document.getElementById('reloadConfigTextBtn'),
  installSkillBtn: document.getElementById('installSkillBtn'),
  updateSkillBtn: document.getElementById('updateSkillBtn'),
  removeSkillBtn: document.getElementById('removeSkillBtn'),
  updateAllSkillsBtn: document.getElementById('updateAllSkillsBtn'),
  refreshSkillsBtn: document.getElementById('refreshSkillsBtn'),
  saveMemoryBtn: document.getElementById('saveMemoryBtn'),
  createMemoryFileBtn: document.getElementById('createMemoryFileBtn'),
  refreshMemoryFilesBtn: document.getElementById('refreshMemoryFilesBtn'),
  refreshTrendingBtn: document.getElementById('refreshTrendingBtn'),
  modelMsg: document.getElementById('modelMsg'),
  skillsMsg: document.getElementById('skillsMsg'),
  memoryMsg: document.getElementById('memoryMsg'),
  configMsg: document.getElementById('configMsg')
};

const state = {
  activeView: 'openclawView',
  activeTab: 'feishu',
  skills: [],
  selectedSkillSlug: '',
  memoryFiles: [],
  currentMemoryPath: '',
  trendingData: null,
  wechatRecommendations: [],
  wechatQuery: WECHAT_DEFAULT_QUERY,
  wechatFetchedAt: '',
  wechatWarnings: []
};

const msgTimers = new WeakMap();

init().catch((err) => {
  const message = pickText(err?.message, String(err)) || '初始化失败';
  console.error(err);
  setMessage(dom.modelMsg, message, 'error');
});

function init() {
  wireSidebarViews();
  wireMediaTabs();
  wireActions();
  syncLanHint();
  setActiveView(state.activeView);
  setActiveTab(state.activeTab);
  renderSkills();
  renderMemoryFiles();
  renderMediaSections();
  renderWechatRecommendations();
  setCurrentMemoryPath('');

  return initialLoad();
}

async function initialLoad() {
  const jobs = [
    loadHealth(),
    loadStatus(),
    loadConfig(),
    loadSkills(),
    loadMemoryFiles({ autoOpen: true }),
    loadTrending(),
    loadWechatRecommendations({ query: WECHAT_DEFAULT_QUERY, announce: false })
  ];
  const settled = await Promise.allSettled(jobs);
  const failed = settled.filter((r) => r.status === 'rejected').length;
  if (failed) {
    setMessage(dom.modelMsg, `初始加载完成，${failed} 项失败`, 'error');
  }
}

function wireSidebarViews() {
  const buttons = document.querySelectorAll('.menu-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const viewId = button.dataset.view;
      if (viewId) setActiveView(viewId);
    });
  });
}

function wireMediaTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      if (!tab) return;
      setActiveTab(tab);
      if (!state.trendingData) {
        loadTrending().catch((err) => {
          console.error(err);
        });
      }
    });
  });
}

function wireActions() {
  dom.refreshAllBtn?.addEventListener('click', refreshAllData);
  dom.restartGatewayBtn?.addEventListener('click', restartGateway);
  dom.saveModelPrimaryBtn?.addEventListener('click', saveModelPrimary);
  dom.reloadConfigBtn?.addEventListener('click', () => reloadConfig(dom.modelMsg));
  dom.saveConfigBtn?.addEventListener('click', saveConfigEditor);
  dom.formatConfigBtn?.addEventListener('click', formatConfigEditor);
  dom.reloadConfigTextBtn?.addEventListener('click', () => reloadConfig(dom.configMsg));

  dom.refreshSkillsBtn?.addEventListener('click', () => refreshSkills(true));
  dom.installSkillBtn?.addEventListener('click', installSkill);
  dom.updateSkillBtn?.addEventListener('click', updateSkill);
  dom.removeSkillBtn?.addEventListener('click', removeSkill);
  dom.updateAllSkillsBtn?.addEventListener('click', updateAllSkills);

  dom.refreshMemoryFilesBtn?.addEventListener('click', refreshMemoryFiles);
  dom.saveMemoryBtn?.addEventListener('click', saveMemoryFile);
  dom.createMemoryFileBtn?.addEventListener('click', createMemoryFile);

  dom.refreshTrendingBtn?.addEventListener('click', refreshTrending);

  dom.wechatSearchBtn?.addEventListener('click', () => {
    searchWechatRecommendations().catch((err) => {
      console.error(err);
    });
  });
  dom.wechatSearchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchWechatRecommendations().catch((err) => {
        console.error(err);
      });
    }
  });

  dom.newMemoryFileInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createMemoryFile().catch((err) => {
        console.error(err);
      });
    }
  });
}

function setActiveView(viewId) {
  state.activeView = viewId;

  document.querySelectorAll('.menu-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewId);
  });

  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === viewId);
  });
}

function setActiveTab(tabKey) {
  state.activeTab = PLATFORM_KEYS.includes(tabKey) ? tabKey : PLATFORM_KEYS[0];
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });
  syncMediaSectionVisibility();
  syncWechatRecoVisibility();
}

function syncMediaSectionVisibility() {
  const sections = document.querySelectorAll('[data-tab-section]');
  sections.forEach((section) => {
    const isActive = section.dataset.tabSection === state.activeTab;
    section.hidden = !isActive;
  });
}

function syncWechatRecoVisibility() {
  if (!dom.wechatRecoPanel) return;
  dom.wechatRecoPanel.hidden = state.activeTab !== 'wechat';
}

function syncLanHint() {
  if (!dom.lanHint) return;
  dom.lanHint.textContent = `LAN: ${window.location.protocol}//${window.location.host}`;
}

function renderHealthCard(payload) {
  if (!dom.healthCard) return;
  const lines = [
    `ok: ${safeBoolText(payload?.ok)}`,
    `app: ${pickText(payload?.app) || '-'}`,
    `time: ${pickText(payload?.time) || '-'}`,
    `uptimeSec: ${safeNumber(payload?.uptimeSec)}`,
    `pid: ${safeNumber(payload?.pid)}`
  ];
  dom.healthCard.textContent = lines.join('\n');
}

function renderStatusCard(text) {
  if (!dom.statusCard) return;
  dom.statusCard.textContent = pickText(text) || '暂无状态输出';
}

function renderSkills() {
  if (!dom.skillsList) return;
  dom.skillsList.innerHTML = '';

  const list = toArray(state.skills);
  if (!list.length) {
    dom.skillsList.appendChild(emptyListItem('暂无 Skills'));
    return;
  }

  for (const skill of list) {
    const slug = pickText(skill?.slug) || '(unknown)';
    const version = pickText(skill?.version) || '-';
    const row = document.createElement('div');
    row.className = 'list-item';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.classList.toggle('active', slug === state.selectedSkillSlug);

    const left = document.createElement('span');
    left.textContent = slug;
    left.className = 'mono';

    const right = document.createElement('span');
    right.textContent = version;
    right.style.color = 'var(--muted)';
    right.style.fontSize = '12px';

    row.append(left, right);
    row.addEventListener('click', () => {
      state.selectedSkillSlug = slug;
      if (dom.skillSlugInput) dom.skillSlugInput.value = slug;
      renderSkills();
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        row.click();
      }
    });

    dom.skillsList.appendChild(row);
  }
}

function renderMemoryFiles() {
  if (!dom.memoryFiles) return;
  dom.memoryFiles.innerHTML = '';

  if (!state.memoryFiles.length) {
    dom.memoryFiles.appendChild(emptyListItem('暂无记忆文件'));
    return;
  }

  for (const filePath of state.memoryFiles) {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.classList.toggle('active', filePath === state.currentMemoryPath);

    const label = document.createElement('span');
    label.textContent = filePath;
    label.className = 'mono';

    row.appendChild(label);
    row.addEventListener('click', () => {
      loadMemoryFile(filePath).catch((err) => {
        console.error(err);
      });
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        row.click();
      }
    });

    dom.memoryFiles.appendChild(row);
  }
}

function renderMediaSections() {
  if (!dom.mediaPanel) return;
  dom.mediaPanel.innerHTML = '';

  if (!state.trendingData) {
    const placeholder = document.createElement('div');
    placeholder.className = 'media-card';
    const title = document.createElement('h4');
    title.textContent = '热门数据';
    const body = document.createElement('p');
    body.style.color = 'var(--muted)';
    body.style.margin = '0';
    body.textContent = '尚未加载数据';
    placeholder.append(title, body);
    dom.mediaPanel.appendChild(placeholder);
    return;
  }

  const root = asObject(state.trendingData);
  const updatedAt = pickText(root.updatedAt);

  for (const platform of PLATFORM_KEYS) {
    const section = document.createElement('section');
    section.dataset.tabSection = platform;
    section.style.display = 'grid';
    section.style.gap = '10px';

    const head = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.style.margin = '0';
    h3.textContent = `${PLATFORM_LABELS[platform] || platform} 热门`;
    head.appendChild(h3);
    if (updatedAt) {
      const small = document.createElement('small');
      small.style.color = 'var(--muted)';
      small.textContent = `更新时间: ${updatedAt}`;
      head.appendChild(small);
    }
    section.appendChild(head);

    const platformData = asObject(root[platform]);
    const topics = toArray(platformData.topics).map((t) => pickText(t)).filter(Boolean);
    const articles = toArray(platformData.articles);

    const grid = document.createElement('div');
    grid.className = 'media-grid';
    grid.appendChild(
      buildMediaCard('热门话题', topics.length ? topics : ['暂无话题数据'], { platform })
    );
    grid.appendChild(
      buildMediaCard(
        '热门文章',
        articles.length ? articles : ['暂无文章数据'],
        { platform }
      )
    );
    section.appendChild(grid);

    const pipelineCols = extractPipelineColumns(platformData);
    if (pipelineCols.length) {
      const kanbanCard = document.createElement('article');
      kanbanCard.className = 'media-card';
      const h4 = document.createElement('h4');
      h4.textContent = 'Pipeline 看板';
      kanbanCard.appendChild(h4);

      const board = document.createElement('div');
      board.className = 'kanban';
      for (const col of pipelineCols) {
        const colEl = document.createElement('section');
        colEl.className = 'kanban-col';

        const title = document.createElement('h5');
        title.textContent = col.name;
        colEl.appendChild(title);

        const list = document.createElement('div');
        list.className = 'kanban-list';
        const items = toArray(col.items);
        if (!items.length) {
          const empty = document.createElement('div');
          empty.className = 'kanban-item';
          empty.style.color = 'var(--muted)';
          empty.textContent = '暂无卡片';
          list.appendChild(empty);
        } else {
          for (const rawItem of items) {
            const item = document.createElement('div');
            item.className = 'kanban-item';
            item.textContent = formatKanbanItem(rawItem);
            list.appendChild(item);
          }
        }
        colEl.appendChild(list);
        board.appendChild(colEl);
      }

      kanbanCard.appendChild(board);
      section.appendChild(kanbanCard);
    }

    dom.mediaPanel.appendChild(section);
  }

  syncMediaSectionVisibility();
  syncWechatRecoVisibility();
}

function renderWechatRecommendations() {
  if (!dom.wechatRecoList) return;
  dom.wechatRecoList.innerHTML = '';

  const items = toArray(state.wechatRecommendations);
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'wechat-reco-item';
    const txt = document.createElement('p');
    txt.textContent = '暂无推荐内容，点击搜索获取实时数据。';
    empty.appendChild(txt);
    dom.wechatRecoList.appendChild(empty);
    return;
  }

  for (const row of items) {
    const item = asObject(row);
    const url = pickText(item.url);
    const card = document.createElement('article');
    card.className = 'wechat-reco-item';

    const title = document.createElement('h5');
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = pickText(item.title) || '未命名文章';
      title.appendChild(a);
    } else {
      title.textContent = pickText(item.title) || '未命名文章';
    }
    card.appendChild(title);

    const summary = document.createElement('p');
    summary.textContent = pickText(item.summary) || '暂无摘要';
    card.appendChild(summary);

    const meta = document.createElement('div');
    meta.className = 'wechat-reco-meta';
    const source = pickText(item.source) || '-';
    const publishedAt = formatTime(item.publishedAt);
    meta.textContent = `来源域名: ${source} · 发布时间: ${publishedAt}`;
    card.appendChild(meta);

    const metrics = asObject(item.metrics);
    const metricGrid = document.createElement('div');
    metricGrid.className = 'wechat-metric-grid';
    metricGrid.appendChild(buildWechatMetric('阅读', metrics.read));
    metricGrid.appendChild(buildWechatMetric('点赞', metrics.like));
    metricGrid.appendChild(buildWechatMetric('转发', metrics.share));
    metricGrid.appendChild(buildWechatMetric('收藏', metrics.favorite));
    metricGrid.appendChild(buildWechatMetric('在看', metrics.watching));
    card.appendChild(metricGrid);

    const foot = document.createElement('div');
    foot.className = 'wechat-reco-foot';
    const heatScore = safeMetric(item.heatScore);
    const fetchedAt = formatTime(item.fetchedAt || state.wechatFetchedAt);
    foot.textContent = `热度分: ${heatScore} · 抓取时间: ${fetchedAt}`;
    card.appendChild(foot);

    dom.wechatRecoList.appendChild(card);
  }
}

function buildWechatMetric(label, value) {
  const cell = document.createElement('div');
  cell.className = 'wechat-metric';

  const name = document.createElement('span');
  name.className = 'label';
  name.textContent = label;

  const text = document.createElement('span');
  text.className = 'value';
  text.textContent = safeMetric(value);

  cell.append(name, text);
  return cell;
}

function buildMediaCard(titleText, items, options = {}) {
  const card = document.createElement('article');
  card.className = 'media-card';

  const title = document.createElement('h4');
  title.textContent = titleText;
  card.appendChild(title);

  const list = document.createElement('ul');
  const safeItems = toArray(items);
  for (const value of safeItems) {
    const item = normalizeMediaItem(value, options.platform);
    const li = document.createElement('li');

    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = item.text || '查看原文';
      li.appendChild(a);
    } else {
      li.textContent = item.text || '-';
    }

    if (item.meta) {
      const meta = document.createElement('div');
      meta.style.color = 'var(--muted)';
      meta.style.fontSize = '12px';
      meta.style.marginTop = '2px';
      meta.textContent = item.meta;
      li.appendChild(meta);
    }

    list.appendChild(li);
  }

  card.appendChild(list);
  return card;
}

function normalizeMediaItem(value, platformKey) {
  if (typeof value === 'string') {
    return { text: value, meta: '', url: '' };
  }

  const row = asObject(value);
  const text = pickText(row.title, row.name, row.topic, row.text) || '未命名内容';
  const meta = [pickText(row.tag), pickText(row.idea, row.summary)]
    .filter(Boolean)
    .join(' · ');

  const url = pickText(
    row.url,
    row.link,
    row.href,
    row.sourceUrl,
    row.articleUrl,
    row.source
  );

  if (url) {
    return { text, meta, url };
  }

  return {
    text: `${text}（未配置原文直达链接）`,
    meta,
    url: ''
  };
}

function extractPipelineColumns(platformData) {
  const source = asObject(platformData);
  const candidate =
    source.pipeline ??
    source.pipelineColumns ??
    source.kanban ??
    source.board ??
    source.columns;

  if (!candidate) return [];

  if (Array.isArray(candidate)) {
    return candidate
      .map((col, index) => normalizeColumn(col, index))
      .filter((col) => col && col.name);
  }

  if (typeof candidate === 'object') {
    const obj = asObject(candidate);
    if (Array.isArray(obj.columns)) {
      return obj.columns
        .map((col, index) => normalizeColumn(col, index))
        .filter((col) => col && col.name);
    }
    if (Array.isArray(obj.lanes)) {
      return obj.lanes
        .map((col, index) => normalizeColumn(col, index))
        .filter((col) => col && col.name);
    }
    return Object.entries(obj)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value], index) => ({
        name: pickText(key) || `COL ${index + 1}`,
        items: toArray(value)
      }));
  }

  return [];
}

function normalizeColumn(raw, index) {
  if (typeof raw === 'string') {
    return { name: `COL ${index + 1}`, items: [raw] };
  }
  const col = asObject(raw);
  const name =
    pickText(col.name, col.title, col.key, col.id) || `COL ${index + 1}`;
  const items = toArray(
    col.items ?? col.cards ?? col.list ?? col.tasks ?? col.values
  );
  return { name, items };
}

function formatKanbanItem(item) {
  if (typeof item === 'string') return item;
  const obj = asObject(item);
  return (
    pickText(
      obj.title,
      obj.name,
      obj.topic,
      obj.idea,
      obj.text,
      obj.content,
      obj.tag
    ) || safeJson(item)
  );
}

async function refreshAllData() {
  const buttons = [dom.refreshAllBtn];
  await withRequestState(buttons, async () => {
    setMessage(dom.modelMsg, '正在刷新...', 'info', 0);
    const tasks = [
      loadHealth(),
      loadStatus(),
      loadConfig(),
      loadSkills(),
      loadMemoryFiles({ autoOpen: true })
    ];
    const settled = await Promise.allSettled(tasks);
    const failed = settled.filter((r) => r.status === 'rejected').length;
    if (failed) {
      setMessage(dom.modelMsg, `刷新完成，${failed} 项失败`, 'error');
      return;
    }
    setMessage(dom.modelMsg, '全部数据已刷新', 'success');
  });
}

async function loadHealth() {
  try {
    const data = await apiJson('/api/health');
    renderHealthCard(data);
    syncLanHint();
    return data;
  } catch (err) {
    if (dom.healthCard) dom.healthCard.textContent = `加载失败\n${err.message}`;
    throw err;
  }
}

async function loadStatus() {
  try {
    const data = await apiJson('/api/openclaw/status');
    renderStatusCard(data?.text);
    return data;
  } catch (err) {
    renderStatusCard(`加载失败: ${err.message}`);
    throw err;
  }
}

async function loadConfig() {
  try {
    const data = await apiJson('/api/openclaw/config');
    const config = asObject(data?.config);
    const primary = pickText(
      data?.modelPrimary,
      config?.agents?.defaults?.model?.primary
    );
    if (dom.modelPrimaryInput) dom.modelPrimaryInput.value = primary;
    if (dom.configEditor) dom.configEditor.value = prettyJson(config);
    return data;
  } catch (err) {
    if (dom.configEditor) {
      dom.configEditor.value = `{\n  "error": ${JSON.stringify(err.message)}\n}\n`;
    }
    throw err;
  }
}

async function saveModelPrimary() {
  const modelPrimary = pickText(dom.modelPrimaryInput?.value);
  if (!modelPrimary) {
    setMessage(dom.modelMsg, '请输入模型 primary', 'error');
    return;
  }

  await withRequestState([dom.saveModelPrimaryBtn], async () => {
    setMessage(dom.modelMsg, '保存中...', 'info', 0);
    const data = await apiJson('/api/openclaw/model-primary', {
      method: 'POST',
      body: { modelPrimary }
    });
    const saved = pickText(data?.modelPrimary, modelPrimary);
    if (dom.modelPrimaryInput) dom.modelPrimaryInput.value = saved;
    setMessage(dom.modelMsg, `模型配置已保存: ${saved}`, 'success');
    await loadConfig().catch(() => {});
  }).catch((err) => {
    setMessage(dom.modelMsg, err.message, 'error');
  });
}

async function restartGateway() {
  if (!window.confirm('确认重启 OpenClaw Gateway？')) return;

  await withRequestState([dom.restartGatewayBtn], async () => {
    setMessage(dom.modelMsg, '正在重启 Gateway...', 'info', 0);
    const data = await apiJson('/api/openclaw/restart', { method: 'POST' });
    const detail = shrink(pickText(data?.text), 120);
    const suffix = detail ? `: ${detail}` : '';
    setMessage(dom.modelMsg, `Gateway 重启已触发${suffix}`, 'success');
    await loadStatus().catch(() => {});
  }).catch((err) => {
    setMessage(dom.modelMsg, err.message, 'error');
  });
}

async function reloadConfig(msgEl) {
  await withRequestState([dom.reloadConfigBtn, dom.reloadConfigTextBtn], async () => {
    setMessage(msgEl, '加载配置...', 'info', 0);
    await loadConfig();
    setMessage(msgEl, '配置已重载', 'success');
  }).catch((err) => {
    setMessage(msgEl, err.message, 'error');
  });
}

function formatConfigEditor() {
  const raw = pickText(dom.configEditor?.value);
  if (!raw) {
    setMessage(dom.configMsg, '配置为空', 'error');
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (dom.configEditor) dom.configEditor.value = prettyJson(parsed);
    setMessage(dom.configMsg, 'JSON 已格式化', 'success');
  } catch (err) {
    setMessage(dom.configMsg, `JSON 解析失败: ${err.message}`, 'error');
  }
}

async function saveConfigEditor() {
  const raw = pickText(dom.configEditor?.value);
  if (!raw) {
    setMessage(dom.configMsg, '配置为空，无法保存', 'error');
    return;
  }

  let configObj;
  try {
    configObj = JSON.parse(raw);
  } catch (err) {
    setMessage(dom.configMsg, `JSON 解析失败: ${err.message}`, 'error');
    return;
  }

  await withRequestState([dom.saveConfigBtn], async () => {
    setMessage(dom.configMsg, '保存中...', 'info', 0);
    const data = await apiJson('/api/openclaw/config', {
      method: 'PUT',
      body: { config: configObj }
    });
    const backupPath = pickText(data?.backupPath);
    const suffix = backupPath ? `，备份: ${backupPath}` : '';
    setMessage(dom.configMsg, `配置已保存${suffix}`, 'success');
    await loadConfig().catch(() => {});
  }).catch((err) => {
    setMessage(dom.configMsg, err.message, 'error');
  });
}

function getDesiredSkillSlug() {
  const inputSlug = pickText(dom.skillSlugInput?.value);
  if (inputSlug) return inputSlug;
  return pickText(state.selectedSkillSlug);
}

function skillButtons() {
  return [
    dom.installSkillBtn,
    dom.updateSkillBtn,
    dom.removeSkillBtn,
    dom.updateAllSkillsBtn,
    dom.refreshSkillsBtn
  ];
}

function isValidSkillSlug(slug) {
  return /^[a-z0-9][a-z0-9-_]{0,80}$/i.test(slug);
}

async function loadSkills() {
  try {
    const data = await apiJson('/api/skills');
    state.skills = toArray(data?.skills).map((item) => ({
      slug: pickText(item?.slug),
      version: pickText(item?.version)
    }));
    if (state.selectedSkillSlug) {
      const exists = state.skills.some(
        (s) => pickText(s.slug) === state.selectedSkillSlug
      );
      if (!exists) state.selectedSkillSlug = '';
    }
    renderSkills();
    return data;
  } catch (err) {
    state.skills = [];
    renderSkills();
    throw err;
  }
}

async function refreshSkills(showMsg) {
  await withRequestState(skillButtons(), async () => {
    if (showMsg) setMessage(dom.skillsMsg, '刷新中...', 'info', 0);
    await loadSkills();
    if (showMsg) setMessage(dom.skillsMsg, 'Skills 列表已刷新', 'success');
  }).catch((err) => {
    setMessage(dom.skillsMsg, err.message, 'error');
  });
}

async function installSkill() {
  const slug = getDesiredSkillSlug();
  if (!slug || !isValidSkillSlug(slug)) {
    setMessage(dom.skillsMsg, '请输入有效 skill slug', 'error');
    return;
  }

  await withRequestState(skillButtons(), async () => {
    setMessage(dom.skillsMsg, `安装 ${slug}...`, 'info', 0);
    const data = await apiJson('/api/skills/install', {
      method: 'POST',
      body: { slug }
    });
    state.selectedSkillSlug = slug;
    if (dom.skillSlugInput) dom.skillSlugInput.value = slug;
    await loadSkills().catch(() => {});
    const detail = shrink(pickText(data?.text), 90);
    setMessage(
      dom.skillsMsg,
      detail ? `安装完成: ${detail}` : `安装完成: ${slug}`,
      'success'
    );
  }).catch((err) => {
    setMessage(dom.skillsMsg, err.message, 'error');
  });
}

async function updateSkill() {
  const slug = getDesiredSkillSlug();
  if (!slug || !isValidSkillSlug(slug)) {
    setMessage(dom.skillsMsg, '请选择或输入有效 skill slug', 'error');
    return;
  }

  await withRequestState(skillButtons(), async () => {
    setMessage(dom.skillsMsg, `更新 ${slug}...`, 'info', 0);
    const data = await apiJson('/api/skills/update', {
      method: 'POST',
      body: { slug }
    });
    state.selectedSkillSlug = slug;
    if (dom.skillSlugInput) dom.skillSlugInput.value = slug;
    await loadSkills().catch(() => {});
    const detail = shrink(pickText(data?.text), 90);
    setMessage(
      dom.skillsMsg,
      detail ? `更新完成: ${detail}` : `更新完成: ${slug}`,
      'success'
    );
  }).catch((err) => {
    setMessage(dom.skillsMsg, err.message, 'error');
  });
}

async function removeSkill() {
  const slug = getDesiredSkillSlug();
  if (!slug || !isValidSkillSlug(slug)) {
    setMessage(dom.skillsMsg, '请选择或输入有效 skill slug', 'error');
    return;
  }

  await withRequestState(skillButtons(), async () => {
    setMessage(dom.skillsMsg, `卸载 ${slug}...`, 'info', 0);
    const data = await apiJson(`/api/skills/${encodeURIComponent(slug)}`, {
      method: 'DELETE'
    });
    if (state.selectedSkillSlug === slug) state.selectedSkillSlug = '';
    if (dom.skillSlugInput && pickText(dom.skillSlugInput.value) === slug) {
      dom.skillSlugInput.value = '';
    }
    await loadSkills().catch(() => {});
    const detail = shrink(pickText(data?.text), 90);
    setMessage(
      dom.skillsMsg,
      detail ? `卸载完成: ${detail}` : `卸载完成: ${slug}`,
      'success'
    );
  }).catch((err) => {
    setMessage(dom.skillsMsg, err.message, 'error');
  });
}

async function updateAllSkills() {
  await withRequestState(skillButtons(), async () => {
    setMessage(dom.skillsMsg, '更新全部 Skills...', 'info', 0);
    const data = await apiJson('/api/skills/update', {
      method: 'POST',
      body: {}
    });
    await loadSkills().catch(() => {});
    const detail = shrink(pickText(data?.text), 90);
    setMessage(
      dom.skillsMsg,
      detail ? `全部更新完成: ${detail}` : '全部 Skills 更新完成',
      'success'
    );
  }).catch((err) => {
    setMessage(dom.skillsMsg, err.message, 'error');
  });
}

function setCurrentMemoryPath(filePath) {
  state.currentMemoryPath = pickText(filePath);
  if (dom.currentMemoryPath) {
    dom.currentMemoryPath.textContent = state.currentMemoryPath || '未选择文件';
  }
  if (dom.saveMemoryBtn) {
    dom.saveMemoryBtn.disabled = !state.currentMemoryPath;
  }
  renderMemoryFiles();
}

async function loadMemoryFiles(opts = {}) {
  const { autoOpen = true } = opts;
  try {
    const data = await apiJson('/api/memory/files');
    state.memoryFiles = toArray(data?.files)
      .map((item) => pickText(item))
      .filter(Boolean);
    renderMemoryFiles();

    if (!autoOpen) return data;

    let target = state.currentMemoryPath;
    if (!target || !state.memoryFiles.includes(target)) {
      target = state.memoryFiles[0];
    }

    if (target) {
      await loadMemoryFile(target, { announce: false });
    } else {
      setCurrentMemoryPath('');
      if (dom.memoryEditor) dom.memoryEditor.value = '';
    }
    return data;
  } catch (err) {
    state.memoryFiles = [];
    renderMemoryFiles();
    throw err;
  }
}

async function loadMemoryFile(filePath, opts = {}) {
  const { announce = true } = opts;
  const target = pickText(filePath);
  if (!target) return;

  setCurrentMemoryPath(target);
  try {
    const data = await apiJson(`/api/memory/file?path=${encodeURIComponent(target)}`);
    const content = typeof data?.content === 'string' ? data.content : '';
    if (dom.memoryEditor) dom.memoryEditor.value = content;
    const actualPath = pickText(data?.path, target);
    setCurrentMemoryPath(actualPath);
    if (announce) setMessage(dom.memoryMsg, `已加载 ${actualPath}`, 'success');
  } catch (err) {
    setMessage(dom.memoryMsg, err.message, 'error');
    throw err;
  }
}

async function refreshMemoryFiles() {
  await withRequestState(
    [dom.refreshMemoryFilesBtn, dom.createMemoryFileBtn, dom.saveMemoryBtn],
    async () => {
      setMessage(dom.memoryMsg, '刷新中...', 'info', 0);
      await loadMemoryFiles({ autoOpen: true });
      setMessage(dom.memoryMsg, '记忆文件列表已刷新', 'success');
    }
  ).catch((err) => {
    setMessage(dom.memoryMsg, err.message, 'error');
  });
}

async function saveMemoryFile() {
  const path = pickText(state.currentMemoryPath);
  if (!path) {
    setMessage(dom.memoryMsg, '请先选择文件', 'error');
    return;
  }

  await withRequestState([dom.saveMemoryBtn], async () => {
    setMessage(dom.memoryMsg, `保存 ${path}...`, 'info', 0);
    const content = typeof dom.memoryEditor?.value === 'string' ? dom.memoryEditor.value : '';
    await apiJson('/api/memory/file', {
      method: 'PUT',
      body: { path, content }
    });
    setMessage(dom.memoryMsg, `已保存 ${path}`, 'success');
  }).catch((err) => {
    setMessage(dom.memoryMsg, err.message, 'error');
  });
}

async function createMemoryFile() {
  const path = pickText(dom.newMemoryFileInput?.value);
  if (!path) {
    setMessage(dom.memoryMsg, '请输入文件名', 'error');
    return;
  }

  await withRequestState(
    [dom.createMemoryFileBtn, dom.refreshMemoryFilesBtn, dom.saveMemoryBtn],
    async () => {
      setMessage(dom.memoryMsg, `创建 ${path}...`, 'info', 0);
      await apiJson('/api/memory/file', {
        method: 'POST',
        body: { path, content: '' }
      });
      if (dom.newMemoryFileInput) dom.newMemoryFileInput.value = '';
      await loadMemoryFiles({ autoOpen: false });
      await loadMemoryFile(path, { announce: false });
      setMessage(dom.memoryMsg, `已创建并加载 ${path}`, 'success');
    }
  ).catch((err) => {
    setMessage(dom.memoryMsg, err.message, 'error');
  });
}

async function loadTrending() {
  try {
    const data = await apiJson('/api/media/trending');
    state.trendingData = asObject(data?.data);
    renderMediaSections();
    return data;
  } catch (err) {
    state.trendingData = null;
    renderMediaSections();
    throw err;
  }
}

async function refreshTrending() {
  await withRequestState([dom.refreshTrendingBtn], async () => {
    await loadTrending();
  }).catch((err) => {
    console.error(err);
  });
}

async function searchWechatRecommendations() {
  const query = pickText(dom.wechatSearchInput?.value);
  await withRequestState([dom.wechatSearchBtn], async () => {
    await loadWechatRecommendations({ query, announce: true });
  }).catch((err) => {
    setMessage(dom.wechatSearchMsg, err.message, 'error');
  });
}

async function loadWechatRecommendations(options = {}) {
  const query = pickText(options.query, state.wechatQuery, WECHAT_DEFAULT_QUERY);
  const announce = options.announce !== false;
  const params = new URLSearchParams();
  params.set('limit', String(WECHAT_RECO_LIMIT));
  if (query) params.set('q', query);

  if (announce) {
    setMessage(dom.wechatSearchMsg, '正在抓取公众号推荐...', 'info', 0);
  }

  try {
    const data = await apiJson(`/api/media/wechat/recommendations?${params.toString()}`);
    state.wechatRecommendations = toArray(data?.items);
    state.wechatQuery = pickText(data?.query, query, WECHAT_DEFAULT_QUERY);
    state.wechatFetchedAt = pickText(data?.fetchedAt);
    state.wechatWarnings = toArray(data?.warnings).map((x) => pickText(x)).filter(Boolean);

    if (dom.wechatSearchInput && !pickText(dom.wechatSearchInput.value)) {
      dom.wechatSearchInput.value = state.wechatQuery;
    }

    renderWechatRecommendations();
    const count = state.wechatRecommendations.length;
    const warning = state.wechatWarnings.length ? `（${state.wechatWarnings[0]}）` : '';
    if (announce) {
      setMessage(
        dom.wechatSearchMsg,
        `已加载 ${count} 篇推荐${warning}`,
        state.wechatWarnings.length ? 'info' : 'success',
        6500
      );
    }
    return data;
  } catch (err) {
    state.wechatRecommendations = [];
    state.wechatWarnings = [];
    renderWechatRecommendations();
    if (announce) {
      setMessage(dom.wechatSearchMsg, err.message, 'error');
    }
    throw err;
  }
}

async function apiJson(url, options = {}) {
  const init = { method: 'GET', ...options };
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  if (init.body !== undefined && init.body !== null && !(init.body instanceof FormData)) {
    if (typeof init.body !== 'string') {
      init.body = JSON.stringify(init.body);
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }
  init.headers = headers;

  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new Error(`网络错误: ${pickText(err?.message, String(err))}`);
  }

  let raw = '';
  try {
    raw = await response.text();
  } catch {
    raw = '';
  }

  let parsed = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  }

  if (!response.ok || parsed?.ok === false) {
    throw new Error(extractError(parsed, raw, response.status));
  }

  return asObject(parsed);
}

function extractError(data, rawText, status) {
  const bag = [];

  const push = (value) => {
    const text = pickText(value);
    if (text) bag.push(text);
  };

  const obj = asObject(data);
  push(obj.error);
  push(obj.message);
  push(obj.msg);
  push(obj.detail);
  push(obj.details);

  if (typeof obj.error === 'object' && obj.error) {
    push(obj.error.message);
  }

  if (!bag.length) {
    const raw = pickText(rawText);
    if (raw) bag.push(raw);
  }

  const first = bag.find(Boolean);
  if (first) return shrink(first.replace(/\s+/g, ' '), 220);
  return `请求失败 (${status || 'unknown'})`;
}

async function withRequestState(buttons, task) {
  const list = uniqueButtons(buttons);
  const previous = new Map();
  for (const button of list) {
    previous.set(button, button.disabled);
    button.disabled = true;
  }

  try {
    return await task();
  } finally {
    for (const button of list) {
      button.disabled = previous.get(button);
    }
  }
}

function uniqueButtons(buttons) {
  const arr = Array.isArray(buttons) ? buttons : [buttons];
  const set = new Set();
  for (const item of arr) {
    if (item && typeof item.disabled === 'boolean') set.add(item);
  }
  return Array.from(set);
}

function setMessage(el, text, tone = 'info', holdMs = 4200) {
  if (!el) return;
  const message = pickText(text);
  const colors = {
    info: 'var(--muted)',
    success: 'var(--good)',
    error: 'var(--danger)'
  };

  el.textContent = message;
  el.style.color = colors[tone] || colors.info;

  const old = msgTimers.get(el);
  if (old) clearTimeout(old);

  if (!message || holdMs <= 0) return;
  const timer = setTimeout(() => {
    if (el.textContent === message) {
      el.textContent = '';
      el.style.color = colors.info;
    }
  }, holdMs);
  msgTimers.set(el, timer);
}

function emptyListItem(text) {
  const row = document.createElement('div');
  row.className = 'list-item';
  row.style.color = 'var(--muted)';
  row.textContent = text;
  return row;
}

function pickText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  return '';
}

function safeNumber(value) {
  return Number.isFinite(value) ? String(value) : '-';
}

function safeMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function formatTime(value) {
  const text = pickText(value);
  if (!text) return '-';
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function safeBoolText(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return '-';
}

function prettyJson(value) {
  return `${safeJson(value)}\n`;
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
}

function shrink(value, maxLen) {
  if (!value) return '';
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 3))}...`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

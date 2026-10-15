let token, inventory, selection, current, atlas;
const el = id => document.getElementById(id);
const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
async function get(url) {
  const response = await fetch(url);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '读取失败，请重新读取。');
  return value;
}

const CATEGORIES = [
  ['hosted', '本机宿主 GenPet'],
  ['genpet', 'GenPet'],
  ['unknown', '未知'],
  ['other', '非 GenPet'],
];
const SOURCES = {
  builtin: '内置',
  local: '本地清单',
  'cloud-cache': '云端缓存',
  'host-list': '宿主列表',
  record: 'GenPet 记录',
};
const category = pet => (pet.hostedHere ? 'hosted' : pet.genpet ? 'genpet' : pet.genpet === null ? 'unknown' : 'other');
const selectedId = () => (selection?.available ? selection.effectiveSelectedPetId : null);
const switchable = pet => pet.sources.some(source => source !== 'record');
const displayName = pet => pet.name ?? pet.records[0]?.name ?? '（本机没有名称）';

/** Fields exactly as stored, nested by structure; millisecond timestamps also show local time. */
function fields(value, key = '') {
  if (value === null || value === undefined) return make('span', String(value), 'muted');
  if (typeof value === 'number' && value > 1e12 && /(at|At|since)$/.test(key))
    return make('span', `${value}（${new Date(value).toLocaleString()}）`);
  if (typeof value !== 'object') return make('span', String(value), 'value');
  if (Array.isArray(value) && value.every(item => item === null || typeof item !== 'object'))
    return make('span', value.length ? value.join('\n') : '[]', 'value');
  const table = make('table', undefined, 'fields');
  for (const [name, item] of Object.entries(value)) {
    const row = table.insertRow();
    row.append(make('th', name));
    row.insertCell().append(fields(item, name));
  }
  if (!table.rows.length) return make('span', Array.isArray(value) ? '[]' : '{}', 'muted');
  return table;
}
function section(title, body, open = true) {
  const box = make('details', undefined, 'section');
  box.open = open;
  box.append(make('summary', title), body);
  return box;
}
const raw = value => make('pre', JSON.stringify(value, null, 2));

function renderList() {
  const nav = el('list');
  nav.replaceChildren();
  for (const [key, label] of CATEGORIES) {
    const pets = inventory.pets.filter(pet => category(pet) === key);
    if (!pets.length) continue;
    nav.append(make('h2', `${label} · ${pets.length}`));
    for (const pet of pets) {
      const item = make('div', undefined, 'item' + (pet.id === current ? ' current' : ''));
      const name = make('button', displayName(pet), 'name');
      name.title = pet.id;
      name.addEventListener('click', () => {
        location.hash = encodeURIComponent(pet.id);
        current = pet.id;
        renderList();
        renderDetail();
      });
      item.append(name);
      if (pet.id === selectedId()) item.append(make('span', '● 选中', 'badge'));
      else if (switchable(pet)) item.append(switchButton(pet.id));
      item.append(make('div', pet.id, 'id'));
      nav.append(item);
    }
  }
}
function switchButton(petId) {
  const button = make('button', '切换', 'small');
  button.disabled = !selection?.available;
  button.title = selection?.available ? `让宿主选中 ${petId}` : '读不到宿主选择，无法切换';
  button.addEventListener('click', () => switchPet(petId));
  return button;
}

async function renderDetail() {
  const pet = inventory.pets.find(pet => pet.id === current);
  const detail = el('detail');
  detail.replaceChildren();
  if (!pet) return detail.append(make('p', '左侧选择一只宠物。', 'muted'));
  const title = make('h2', displayName(pet));
  title.append(make('span', ` ${CATEGORIES.find(([key]) => key === category(pet))[1]}`, 'muted'));
  detail.append(title);
  detail.append(
    fields({
      宿主ID: pet.id,
      ...(pet.localId ? { 本地别名: pet.localId } : {}),
      宿主选中: pet.id === selectedId() ? '是' : selection?.available ? '否' : '读不到',
      来源: pet.sources.map(source => SOURCES[source] ?? source),
      GenPet依据: pet.evidence.length ? pet.evidence : '无',
    }),
  );
  if (pet.id !== selectedId() && switchable(pet)) detail.append(switchButton(pet.id));
  if (!pet.records.length) {
    detail.append(make('p', '本机没有这只宠物的 GenPet 记录；以上是宿主侧能读到的全部信息。', 'muted'));
    return;
  }
  const tabs = make('div', undefined, 'tabs');
  const body = make('div');
  pet.records.forEach((record, index) => {
    const tab = make(
      'button',
      `${record.host} · ${record.petId}${record.archived ? ' · 已归档' : ''}${record.error ? ' · 记录异常' : ''}`,
    );
    tab.addEventListener('click', () => {
      for (const other of tabs.children) other.classList.toggle('active', other === tab);
      renderRecord(record, body);
    });
    tabs.append(tab);
    if (index === 0) tab.classList.add('active');
  });
  if (pet.records.length > 1) detail.append(tabs);
  detail.append(body);
  await renderRecord(pet.records[0], body);
}

async function renderRecord(record, body) {
  body.replaceChildren(make('p', '读取记录中…', 'muted'));
  const query = `?host=${encodeURIComponent(record.host)}&pet=${encodeURIComponent(record.petId)}`;
  try {
    const [{ state }, host] = await Promise.all([get('/api/state' + query), get('/api/native-pets' + query)]);
    const { pet, stories, art, pending, schedule, growthClock, version, ...rest } = state;
    const { soul, memory, state: petState, ...identity } = pet ?? {};
    const check = host.target ?? {};
    body.replaceChildren(
      section(
        '宿主检查',
        fields({
          记录文件: host.record?.file,
          宿主目标: check.avatarId ?? check.reason ?? null,
          云端ID: check.cloudId ?? null,
          当前选中: host.selected?.available ? host.selected.id : (host.selected?.error ?? null),
          是否选中: check.active ?? null,
          本地素材一致: host.localArtwork?.storedArtworkVerified ?? null,
          刷新通道: host.refresh?.available ?? null,
          画面: host.displayStatus,
        }),
      ),
      section(
        `形象与动作 · ${art.filter(item => item.kind === 'atlas').length}`,
        appearancePanel(state, record, query),
      ),
      section('身份', fields({ ...identity, recordVersion: version })),
      section('soul', fields(soul)),
      section('memory', fields(memory)),
      section('state', fields({ ...petState, growthClock })),
      section(`故事历史 · ${stories.length}`, storyList(stories, art, query), stories.length > 0),
      section(`素材 · ${art.length}`, artGrid(art, query), art.length > 0),
      section('未完成故事', fields(pending), pending !== null),
      section('日程与其他字段', fields({ schedule, ...rest }), false),
      section('宿主检查原始结果', raw(host), false),
      section('原始 JSON', raw(state), false),
    );
  } catch (error) {
    body.replaceChildren(make('p', `读取记录失败：${error.message}`, 'error'));
  }
}
/** Newest first; each story shows the images it produced or carried, then its fields as stored. */
function storyList(stories, art, query) {
  const list = make('div');
  for (const story of [...stories].reverse()) {
    const entry = make('article', undefined, 'story');
    entry.append(make('h3', `${new Date(story.at).toLocaleString()} · ${story.stage} · ${story.triggerId}`));
    const ids = [...new Set([...(story.mediaIds ?? []), ...(story.appearanceId ? [story.appearanceId] : [])])];
    const images = art.filter(record => ids.includes(record.id) && record.kind !== 'artifact');
    if (images.length) entry.append(artGrid(images, query, false));
    entry.append(make('p', story.text ?? '', 'value'));
    entry.append(section('全部字段', fields(story), false));
    list.append(entry);
  }
  return list;
}
function artGrid(art, query, withFields = true) {
  const grid = make('div', undefined, 'grid');
  for (const record of art) {
    const card = make('figure');
    if (record.kind !== 'artifact') {
      const image = make('img');
      image.src = '/art/' + encodeURIComponent(record.id) + query;
      image.alt = record.description;
      image.loading = 'lazy';
      card.append(image);
    }
    const caption = make('figcaption', withFields ? undefined : `${record.kind} · ${record.stage}`);
    if (withFields) caption.append(section(`${record.kind} · ${record.stage} · ${record.id}`, fields(record), false));
    card.append(caption);
    grid.append(card);
  }
  return grid;
}

/** Every saved atlas of this record, newest first: action preview in the page and debug display on the host. */
function appearancePanel(state, record, query) {
  const box = make('div');
  const actions = make('div', undefined, 'actions');
  const restore = make('button', '恢复当前形象');
  restore.title = '把记录里的当前形象重新写回这只宿主 Pet';
  restore.addEventListener('click', () => hostAction({ action: 'restore-appearance', petId: record.petId }));
  const refresh = make('button', '请求宿主刷新');
  refresh.addEventListener('click', () => hostAction({ action: 'refresh' }));
  actions.append(restore, refresh);
  if (record.host === 'desktop') box.append(actions);
  const atlases = state.art.filter(item => item.kind === 'atlas').reverse();
  if (!atlases.length) box.append(make('p', '这只宠物还没有保存的图集。', 'muted'));
  for (const item of atlases) {
    const current = item.id === state.pet?.state.appearanceId;
    const row = make('div', undefined, 'atlas');
    row.append(
      make(
        'h3',
        `${current ? '● 当前 · ' : ''}${item.stage} · ${new Date(item.createdAt).toLocaleString()} · ${item.id}`,
      ),
    );
    row.append(player('/art/' + encodeURIComponent(item.id) + query));
    if (record.host === 'desktop') {
      const show = make('button', '在桌面显示这版');
      show.title = '调试预览：只改宿主 Pet，不改 GenPet 记录';
      show.addEventListener('click', () =>
        hostAction({ action: 'preview-appearance', petId: record.petId, artId: item.id }),
      );
      row.append(show);
    }
    box.append(row);
  }
  return box;
}

/** Plays one atlas row with the host's own frame timings. */
function player(src) {
  const wrap = make('div', undefined, 'player');
  const canvas = make('canvas');
  canvas.width = atlas.cellWidth;
  canvas.height = atlas.cellHeight;
  const choose = make('select');
  const rows = [
    ...atlas.actions,
    ...[9, 10].map(row => ({
      name: `directions-${row}`,
      row,
      count: atlas.columns,
      durations: Array(atlas.columns).fill(400),
    })),
  ];
  for (const action of rows) choose.add(new Option(action.name, String(action.row)));
  const image = new Image();
  let frame = 0,
    timer;
  const context = canvas.getContext('2d');
  const draw = () => {
    const action = rows.find(item => String(item.row) === choose.value);
    frame %= action.count;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      frame * atlas.cellWidth,
      action.row * atlas.cellHeight,
      atlas.cellWidth,
      atlas.cellHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    clearTimeout(timer);
    if (canvas.isConnected) timer = setTimeout(draw, action.durations[frame++]);
  };
  choose.addEventListener('change', () => {
    frame = 0;
    draw();
  });
  image.addEventListener('load', draw);
  image.src = src;
  wrap.append(canvas, choose);
  return wrap;
}

async function hostAction(body) {
  el('error').textContent = '';
  el('switch-result').textContent = '处理中…';
  try {
    const response = await fetch('/api/action', {
      method: 'POST',
      headers: { 'X-GenPet-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || '操作失败。');
    const result = value.result;
    const box = el('switch-result');
    box.replaceChildren();
    if (result.agentSteps?.length) {
      box.append(
        make('p', '这是已迁移的云端 Pet，需要在 Codex 对话里由 Agent 上传。把下面这段发给 Codex：'),
        make(
          'pre',
          `请用宿主 Pets 工具按以下步骤更新云端 Pet ${result.cloudId}，保留名称、描述和当前选择，完成后用 get_pet_download_link 回读核对：\n` +
            JSON.stringify(result.agentSteps, null, 2),
        ),
      );
    } else
      box.append(
        make(
          'p',
          result.refreshRequested || result.refresh?.refreshRequested || result.hostRefreshRequested
            ? '已写入宿主并请求刷新（画面未验证）。'
            : '已完成；刷新请求未送达或不需要，画面未验证。',
        ),
      );
    box.append(section('结果', fields(result), false));
  } catch (error) {
    el('switch-result').textContent = '';
    el('error').textContent = `操作失败：${error.message}`;
  }
}

async function switchPet(petId) {
  el('error').textContent = '';
  el('switch-result').textContent = `正在切换到 ${petId}…`;
  try {
    const response = await fetch('/api/action', {
      method: 'POST',
      headers: { 'X-GenPet-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'switch-pet', petId }),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || '切换失败。');
    el('switch-result').textContent =
      `宿主已选中 ${value.result.effectiveSelectedPetId}（已读回确认；桌面画面未验证）。`;
  } catch (error) {
    el('switch-result').textContent = '';
    el('error').textContent = `切换失败：${error.message}`;
  }
  load();
}

async function load() {
  el('error').textContent = '';
  try {
    let state;
    [inventory, selection, { token, state }, atlas] = await Promise.all([
      get('/api/inventory'),
      get('/api/selection'),
      get('/api/state'),
      atlas ?? get('/api/atlas'),
    ]);
    const hash = decodeURIComponent(location.hash.slice(1));
    const ids = inventory.pets.map(pet => pet.id);
    if (!ids.includes(current))
      current = [hash, selectedId(), inventory.pets.find(pet => pet.hostedHere)?.id, ids[0]].find(id =>
        ids.includes(id),
      );
    el('summary').textContent = `${state.host} · 本机共 ${inventory.pets.length} 只`;
    el('selection').textContent = selection.available
      ? `宿主当前选中：${selectedId() ?? '无'}`
      : `读不到宿主选择，切换不可用：${selection.reason}（请在 Codex 对话里用 /genpet-debugger 打开）`;
    el('sources').textContent = inventory.hostList
      ? `宿主列表读取于 ${new Date(inventory.hostList.savedAt).toLocaleString()}（${inventory.hostList.pets} 只）`
      : '没有宿主列表：本机缓存里没有云端宠物名称，未知的云端宠物需要 Agent 用 list_pets 结果重新打开调试器。';
    renderList();
    await renderDetail();
  } catch (error) {
    el('error').textContent = `读取失败：${error.message}`;
  }
}
el('reload').addEventListener('click', load);
el('stop').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/action', {
      method: 'POST',
      headers: { 'X-GenPet-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    if (!response.ok) throw new Error('请关闭此页面后重试。');
    el('stop').disabled = true;
    el('summary').textContent = '调试器已关闭。';
  } catch (error) {
    el('error').textContent = error.message;
  }
});
load();

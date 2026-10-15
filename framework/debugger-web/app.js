/** GenPet debugger: the GenPet records this machine hosts. Only appearance actions touch the host. */
let token,
  atlas,
  records = [],
  current,
  data,
  host;
const view = { tab: 'overview', artId: null, action: 0, speed: 1, filter: 'all' };

const $ = id => document.getElementById(id);
/** h('div.card', {onclick}, child...) — strings become text nodes; null children are skipped. */
function h(spec, props, ...children) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  for (const [key, value] of Object.entries(props ?? {}))
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  for (const child of children.flat())
    if (child !== null && child !== undefined && child !== false)
      node.append(child instanceof Node ? child : String(child));
  return node;
}
async function get(url) {
  const response = await fetch(url);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '读取失败');
  return value;
}
async function action(body) {
  const response = await fetch('/api/action', {
    method: 'POST',
    headers: { 'X-GenPet-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '操作失败');
  return value.result;
}

const STAGES = { egg: '蛋', hatchling: '幼年', juvenile: '少年', adult: '成年' };
const KINDS = { all: '全部', grow: '成长', appearance: '换装', home: '家', item: '物件', text: '纯文字' };
const time = ms => (ms ? new Date(ms).toLocaleString() : '—');
const stageBadge = stage => h(`span.badge.stage-${stage}`, STAGES[stage] ?? stage ?? '未知');
const query = () => `?host=${encodeURIComponent(current.host)}&pet=${encodeURIComponent(current.id)}`;
const artUrl = id => '/art/' + encodeURIComponent(id) + query();
const copyText = text => navigator.clipboard?.writeText(text);
const copy = text => h('button.copy', { title: '复制', onclick: () => copyText(text) }, '⧉');
const remember = () => {
  try {
    history.replaceState(null, '', `#${current.host}|${encodeURIComponent(current.id)}|${view.tab}`);
  } catch {}
};
const rerender = change => () => (change(), remember(), renderContent());

/** Fields exactly as stored, nested by structure; millisecond timestamps also show local time. */
function fields(value, key = '') {
  if (value === null || value === undefined) return h('span.muted', String(value));
  if (typeof value === 'number' && value > 1e12 && /(at|At|since)$/.test(key))
    return h('span', `${value}（${time(value)}）`);
  if (typeof value !== 'object') return h('span.value', String(value));
  if (Array.isArray(value) && value.every(item => item === null || typeof item !== 'object'))
    return h('span.value', value.length ? value.join('\n') : '[]');
  const entries = Object.entries(value);
  if (!entries.length) return h('span.muted', Array.isArray(value) ? '[]' : '{}');
  return h(
    'table.fields',
    h(
      'tbody',
      entries.map(([name, item]) => h('tr', h('th', name), h('td', fields(item, name)))),
    ),
  );
}

const ACTION_NAMES = ['待机', '向右跑', '向左跑', '挥手', '跳', '失败', '等待', '奔跑', '审查'];
const rows = () => [
  ...atlas.actions.map((action, index) => ({ ...action, label: ACTION_NAMES[index] ?? action.name })),
  ...[9, 10].map((row, index) => ({
    label: `方向 ${index + 1}`,
    row,
    count: atlas.columns,
    durations: Array(atlas.columns).fill(400),
  })),
];
/** One atlas row played with the host's own frame timings; stops once its canvas leaves the page. */
function player(src, { row = () => 0, speed = () => 1, size = '' } = {}) {
  const canvas = h(`canvas.sprite${size ? '.' + size : ''}`, { width: atlas.cellWidth, height: atlas.cellHeight });
  const context = canvas.getContext('2d');
  const image = new Image();
  let frame = 0;
  const tick = () => {
    if (!canvas.isConnected) return;
    const current = rows()[row()] ?? rows()[0];
    frame %= current.count;
    const [w, ht] = [atlas.cellWidth, atlas.cellHeight];
    context.clearRect(0, 0, w, ht);
    context.drawImage(image, frame * w, current.row * ht, w, ht, 0, 0, w, ht);
    setTimeout(tick, current.durations[frame++] / speed());
  };
  image.addEventListener('load', () => requestAnimationFrame(tick));
  image.src = src;
  return canvas;
}

function notice(content, kind = '') {
  const box = $('notice');
  box.className = kind;
  box.replaceChildren();
  if (!content) return;
  box.append(h('div.notice-body', [content].flat()), h('button.quiet.close', { onclick: () => notice(null) }, '×'));
}

// ── Sidebar ──────────────────────────────────────────────────────────────
function renderRecords() {
  const nav = $('records');
  nav.replaceChildren();
  if (!records.length) nav.append(h('p.muted', '本机还没有 GenPet 记录。'));
  for (const record of records) {
    const active = current && record.host === current.host && record.id === current.id;
    const src = `/art/${encodeURIComponent(record.appearanceId)}?host=${record.host}&pet=${encodeURIComponent(record.id)}`;
    nav.append(
      h(
        `button.record${active ? '.active' : ''}`,
        { onclick: () => select(record.host, record.id) },
        record.appearanceId ? player(src, { size: 'thumb' }) : h('span.sprite.thumb.empty', '无图'),
        h(
          'span.record-text',
          h('strong', record.name || record.id),
          h(
            'span.record-meta',
            stageBadge(record.stage),
            record.active ? h('span.badge.ok', '在养') : null,
            record.archived ? h('span.badge', '已归档') : null,
            record.error ? h('span.badge.bad', '记录异常') : null,
          ),
          h('span.mono.muted', `${record.host} · ${record.id.slice(0, 15)}…`),
        ),
      ),
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
function renderContent() {
  const content = $('content');
  if (!current)
    return content.replaceChildren(
      h(
        'div.empty-state',
        h('h2', '本机还没有 GenPet'),
        h('p.muted', `数据目录：${$('env').textContent}。宿主上的其他宠物可以在「本机所有宠物」里查看。`),
      ),
    );
  if (!data) return content.replaceChildren(h('p.muted.pad', '读取记录中…'));
  const { state } = data;
  if (!state.pet) return content.replaceChildren(h('p.muted.pad', '这条记录里还没有宠物。'), fields(state));
  const atlases = state.art.filter(art => art.kind === 'atlas');
  const shown =
    atlases.find(art => art.id === view.artId) ?? atlases.find(art => art.id === state.pet.state.appearanceId);
  const homes = state.stories.filter(story => (data.outputs[story.id] ?? []).includes('home'));
  const tabs = {
    overview: ['概览', overview],
    stories: [`故事 ${state.stories.length}`, storyTimeline],
    looks: [`形象 ${atlases.length}`, gallery],
    homes: [`家 ${homes.length}`, homeTimeline],
    progress: ['进行中', progress],
    raw: ['原始数据', raw],
  };
  content.replaceChildren(
    hero(state, shown),
    h(
      'nav.tabs',
      Object.entries(tabs).map(([key, [label]]) =>
        h(`button${view.tab === key ? '.active' : ''}`, { onclick: rerender(() => (view.tab = key)) }, label),
      ),
    ),
    h('div.panel', tabs[view.tab][1](state, homes, atlases)),
  );
}

function hero(state, shown) {
  const pet = state.pet;
  const stage = h('div.stage-box');
  if (shown) {
    const isCurrent = shown.id === pet.state.appearanceId;
    stage.append(
      h('div.canvas-wrap', player(artUrl(shown.id), { row: () => view.action, speed: () => view.speed, size: 'big' })),
      h(
        'p.caption',
        isCurrent ? '当前形象' : `历史形象 · ${STAGES[shown.stage]} · ${time(shown.createdAt)} `,
        isCurrent ? null : h('button.link', { onclick: rerender(() => (view.artId = null)) }, '回到当前'),
      ),
      h(
        'div.pills',
        rows().map((row, index) =>
          h(
            `button${view.action === index ? '.active' : ''}`,
            { onclick: rerender(() => (view.action = index)) },
            row.label,
          ),
        ),
      ),
      h(
        'div.pills.small',
        h('span.muted', '速度'),
        [0.5, 1, 2].map(speed =>
          h(
            `button${view.speed === speed ? '.active' : ''}`,
            { onclick: rerender(() => (view.speed = speed)) },
            `${speed}×`,
          ),
        ),
      ),
    );
  } else stage.append(h('div.canvas-wrap.big.empty', '还没有图集'));
  const target = host?.target ?? {};
  const chip = (label, ok) =>
    h(
      `span.chip${ok === true ? '.ok' : ok === false ? '.bad' : ''}`,
      `${label} ${ok === true ? '✓' : ok === false ? '✗' : '?'}`,
    );
  return h(
    'section.hero',
    stage,
    h(
      'div.summary',
      h(
        'h2',
        pet.name,
        ' ',
        stageBadge(pet.state.stage),
        pet.state.special ? h('span.badge.special', '特殊形态') : null,
      ),
      h('p.mono.muted', pet.id, ' ', copy(pet.id)),
      h(
        'dl',
        h('dt', '领养'),
        h('dd', time(pet.adoptedAt)),
        h('dt', '故事'),
        h('dd', `${state.stories.length} 个 · 最近 ${time(state.stories.at(-1)?.at)}`),
        h('dt', '宿主 Pet'),
        h('dd.mono', target.cloudId ?? target.avatarId ?? pet.binding?.avatarId ?? '未绑定'),
        target.reason ? [h('dt', '说明'), h('dd.muted', target.reason)] : null,
        h('dt', '环境'),
        h('dd', current.host === 'desktop' ? '桌面 Pet（本机）' : '云端'),
        h('dt', '现在'),
        h('dd.clip3', { title: pet.state.description }, pet.state.description || '—'),
      ),
      h(
        'div.chips',
        chip('记录', host?.record?.exists ?? null),
        chip('已绑定', Boolean(pet.binding)),
        chip('桌面素材一致', host?.localArtwork?.storedArtworkVerified ?? null),
        chip('刷新通道', host?.refresh?.available ?? null),
        h('span.chip', '画面 未确认'),
      ),
    ),
  );
}

const card = (title, ...body) => h('section.card', title ? h('h3', title) : null, ...body);
function overview(state, homes) {
  const pet = state.pet;
  const latestHome = homes.at(-1);
  return h(
    'div.grid',
    h(
      'section.card.wide',
      h('h3', '基因与性格'),
      fields({ genes: pet.soul.genes, personality: pet.soul.personality, designReason: pet.soul.designReason }),
    ),
    card('记忆', h('p.value', pet.memory.text || '（空）'), h('p.muted', `更新于 ${time(pet.memory.updatedAt)}`)),
    card(
      '现在的家',
      h('p.value', pet.state.home || '还没有家'),
      latestHome ? images(state, latestHome.mediaIds) : null,
      homes.length ? h('button.link', { onclick: rerender(() => (view.tab = 'homes')) }, '查看家的变化 →') : null,
    ),
    card(
      '状态',
      fields({ stage: pet.state.stage, description: pet.state.description, special: pet.state.special ?? null }),
    ),
    card(
      '领养与命名',
      fields({
        place: pet.soul.acquisition?.place ?? null,
        connection: pet.soul.acquisition?.connection ?? null,
        naming: pet.naming ?? null,
      }),
    ),
  );
}

function images(state, ids) {
  const pictures = state.art.filter(art => ids.includes(art.id) && art.kind !== 'artifact' && art.kind !== 'atlas');
  if (!pictures.length) return null;
  return h(
    'div.pictures',
    pictures.map(art =>
      h(
        'figure',
        h('img', { src: artUrl(art.id), alt: art.description, loading: 'lazy' }),
        h('figcaption.muted', art.kind),
      ),
    ),
  );
}
function storyTimeline(state) {
  const items = state.stories
    .map((story, index) => {
      const kinds = [...(data.outputs[story.id] ?? [])];
      if (index && state.stories[index - 1].stage !== story.stage) kinds.unshift('grow');
      return { story, kinds: kinds.length ? kinds : ['text'] };
    })
    .reverse()
    .filter(({ kinds }) => view.filter === 'all' || kinds.includes(view.filter));
  return h(
    'div',
    h(
      'div.pills.small',
      Object.entries(KINDS).map(([key, label]) =>
        h(`button${view.filter === key ? '.active' : ''}`, { onclick: rerender(() => (view.filter = key)) }, label),
      ),
    ),
    items.length ? null : h('p.muted', '没有这类故事。'),
    h(
      'ol.timeline',
      items.map(({ story, kinds }) =>
        h(
          'li',
          h(
            'div.story-head',
            h('time', time(story.at)),
            stageBadge(story.stage),
            kinds.map(kind => h(`span.badge.kind-${kind}`, KINDS[kind])),
            h('span.mono.muted', story.triggerId),
          ),
          kinds.includes('appearance') && story.appearanceId
            ? h(
                'div.inline-sprite',
                h('div.canvas-wrap', player(artUrl(story.appearanceId))),
                h('button.link', { onclick: () => preview(story.appearanceId) }, '预览这版形象'),
              )
            : null,
          h('p.story-text', story.text || '（没有正文）'),
          images(state, story.mediaIds),
          h('details', h('summary', '依据与完整字段'), fields(story)),
        ),
      ),
    ),
  );
}

function preview(artId) {
  view.artId = artId;
  view.action = 0;
  renderContent();
  scrollTo({ top: 0, behavior: 'smooth' });
}
function gallery(state, _homes, atlases) {
  const desktop = current.host === 'desktop';
  const currentId = state.pet.state.appearanceId;
  return h(
    'div',
    desktop
      ? h(
          'div.actions',
          h('button', { onclick: () => run({ action: 'restore-appearance', petId: current.id }) }, '恢复当前形象'),
          h('button.quiet', { onclick: () => run({ action: 'refresh' }) }, '请求宿主刷新'),
          h(
            'p.muted',
            '「在桌面显示这版」只改桌面上的形象，不改记录，随时可以恢复当前形象。已迁移到云端的 Pet 需要 Agent 上传，页面会给出交给 Codex 的步骤。',
          ),
        )
      : null,
    Object.keys(STAGES).map(stage => {
      const list = atlases.filter(art => art.stage === stage).reverse();
      if (!list.length) return null;
      return h(
        'section.group',
        h('h3', STAGES[stage], h('span.muted', ` · ${list.length}`)),
        h(
          'div.looks',
          list.map(art =>
            h(
              `article.look${art.id === currentId ? '.current' : ''}`,
              h('div.canvas-wrap', player(artUrl(art.id))),
              h('p', art.id === currentId ? h('span.badge.ok', '当前') : null, ' ', time(art.createdAt)),
              h('p.muted.clip', { title: art.description }, art.description),
              h(
                'div.look-actions',
                h('button.quiet', { onclick: () => preview(art.id) }, '预览动作'),
                desktop
                  ? h(
                      'button.quiet',
                      { onclick: () => run({ action: 'preview-appearance', petId: current.id, artId: art.id }) },
                      '在桌面显示这版',
                    )
                  : null,
              ),
            ),
          ),
        ),
      );
    }),
  );
}

function homeTimeline(state, homes) {
  if (!homes.length)
    return card('家', h('p.value', state.pet.state.home || '还没有家'), h('p.muted', '还没有画出家的故事。'));
  return h(
    'ol.timeline',
    [...homes]
      .reverse()
      .map((story, index) =>
        h(
          'li',
          h(
            'div.story-head',
            h('time', time(story.at)),
            stageBadge(story.stage),
            index === 0 ? h('span.badge.ok', '最新') : null,
          ),
          h('p.value', story.home),
          images(state, story.mediaIds),
          h('details', h('summary', '这次的故事'), h('p.story-text', story.text)),
        ),
      ),
  );
}

function progress(state) {
  const pending = state.pending;
  return h(
    'div.grid',
    card(
      '未完成的故事',
      pending
        ? [
            fields({
              mode: pending.mode,
              triggerId: pending.triggerId,
              startedAt: pending.startedAt,
              stage: pending.plan?.stage ?? null,
              text: pending.plan?.text ?? null,
            }),
            h('details', h('summary', '完整字段'), fields(pending)),
          ]
        : h('p.muted', '没有'),
    ),
    card('日程', state.schedule ? fields(state.schedule) : h('p.muted', '没有开启')),
    card('成长（内部计数，不对用户显示）', data.growth ? fields(data.growth) : h('p.muted', '无')),
    card(
      '对话记录',
      h('p', `${state.chats?.length ?? 0} 条`),
      state.chats?.length ? h('details', h('summary', '最近 10 条'), fields(state.chats.slice(-10))) : null,
    ),
  );
}

function raw(state) {
  const file = host?.record?.file;
  return h(
    'div.stack',
    card('记录文件', h('p.mono', file ?? '—', ' ', file ? copy(file) : null)),
    h(
      'details.card',
      h('summary', '完整记录 JSON'),
      h('button.quiet', { onclick: () => copyText(JSON.stringify(state, null, 2)) }, '复制 JSON'),
      h('pre', JSON.stringify(state, null, 2)),
    ),
    h('details.card', h('summary', '宿主检查原始结果'), h('pre', JSON.stringify(host, null, 2))),
  );
}

async function run(body) {
  notice('处理中…');
  try {
    const result = await action(body);
    if (result.agentSteps?.length) {
      const text =
        `请用宿主 Pets 工具按以下步骤更新云端 Pet ${result.cloudId}，保留名称、描述和当前选择，` +
        `完成后用 get_pet_download_link 回读核对：\n${JSON.stringify(result.agentSteps, null, 2)}`;
      notice(
        [
          h('strong', '这是云端 Pet，需要在 Codex 对话里交给 Agent 上传。 '),
          h('button.quiet', { onclick: () => copyText(text) }, '复制给 Codex'),
          h('pre', text),
        ],
        'info',
      );
    } else
      notice(
        result.refresh?.refreshRequested || result.refreshRequested || result.hostRefreshRequested
          ? '已写入宿主并请求刷新（桌面画面未验证）。'
          : '已完成；刷新请求未送达或不需要，桌面画面未验证。',
        'ok',
      );
    host = await get('/api/native-pets' + query());
    renderContent();
  } catch (error) {
    notice(`操作失败：${error.message}`, 'bad');
  }
}

// ── All pets on this machine (secondary) ─────────────────────────────────
async function showAllPets() {
  const body = $('all-body');
  body.replaceChildren(h('p.muted', '读取中…'));
  $('all-dialog').showModal();
  try {
    const inventory = await get('/api/inventory');
    const category = pet =>
      pet.hostedHere ? '本机宿主 GenPet' : pet.genpet ? 'GenPet' : pet.genpet === null ? '未知' : '非 GenPet';
    body.replaceChildren(
      h(
        'p.muted',
        `共 ${inventory.pets.length} 只。`,
        inventory.hostList
          ? `宿主列表读取于 ${time(Date.parse(inventory.hostList.savedAt))}。`
          : '没有宿主列表，云端宠物的名称未知。',
      ),
      h(
        'div.scroll',
        h(
          'table.list',
          h(
            'thead',
            h(
              'tr',
              ['类别', '名称', '宿主 ID', 'GenPet 依据', ''].map(text => h('th', text)),
            ),
          ),
          h(
            'tbody',
            inventory.pets.map(pet =>
              h(
                'tr',
                h('td', category(pet)),
                h('td', pet.name ?? pet.records[0]?.name ?? '—'),
                h('td.mono', pet.id),
                h('td.muted', pet.evidence.join('；') || '—'),
                h(
                  'td',
                  pet.records.map(record =>
                    h(
                      'button.link',
                      { onclick: () => ($('all-dialog').close(), select(record.host, record.petId)) },
                      '查看',
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  } catch (error) {
    body.replaceChildren(h('p.bad', error.message));
  }
}

// ── Loading ──────────────────────────────────────────────────────────────
async function select(hostName, id) {
  current = { host: hostName, id };
  view.artId = null;
  view.action = 0;
  remember();
  data = null;
  host = null;
  renderRecords();
  renderContent();
  try {
    const [state, diagnosis] = await Promise.all([
      get('/api/state' + query()),
      get('/api/native-pets' + query()).catch(error => ({ error: error.message })),
    ]);
    token = state.token;
    data = state;
    host = diagnosis;
  } catch (error) {
    notice(`读取记录失败：${error.message}`, 'bad');
  }
  renderContent();
}
async function load() {
  try {
    const [list, meta, base] = await Promise.all([get('/api/records'), atlas ?? get('/api/atlas'), get('/api/state')]);
    atlas = meta;
    token = base.token;
    records = list.records;
    $('env').textContent = list.base;
    const [hashHost, hashId, hashTab] = location.hash.slice(1).split('|');
    if (hashTab && !current) view.tab = hashTab;
    const wanted = current ?? (hashId ? { host: hashHost, id: decodeURIComponent(hashId) } : null);
    const found =
      records.find(record => wanted && record.host === wanted.host && record.id === wanted.id) ??
      records.find(record => record.active && record.host === list.host) ??
      records[0];
    if (found) return select(found.host, found.id);
    current = null;
    renderRecords();
    renderContent();
  } catch (error) {
    notice(`读取失败：${error.message}`, 'bad');
  }
}

function storedTheme(theme) {
  try {
    if (theme) localStorage.setItem('genpet-debugger-theme', theme);
    return localStorage.getItem('genpet-debugger-theme');
  } catch {
    return theme ?? null;
  }
}
const applyTheme = theme => theme && (document.documentElement.dataset.theme = theme);
applyTheme(storedTheme());
$('theme').addEventListener('click', () => {
  const now = document.documentElement.dataset.theme;
  const dark = now ? now === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(storedTheme(dark ? 'light' : 'dark'));
});
$('reload').addEventListener('click', () => ((data = null), load()));
$('all-pets').addEventListener('click', showAllPets);
$('all-close').addEventListener('click', () => $('all-dialog').close());
$('stop').addEventListener('click', async () => {
  try {
    await action({ action: 'stop' });
    $('stop').disabled = true;
    notice('调试器已关闭，可以关掉这个页面。', 'info');
  } catch (error) {
    notice(error.message, 'bad');
  }
});
load();

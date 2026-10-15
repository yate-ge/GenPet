let token;
const el = id => document.getElementById(id);
const show = (id, value) => {
  el(id).textContent = JSON.stringify(value, null, 2);
};
async function get(url) {
  const response = await fetch(url);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '读取失败，请重新读取。');
  return value;
}
const SOURCES = {
  builtin: '内置',
  local: '本地清单',
  'cloud-cache': '云端缓存',
  'host-list': '宿主列表',
  record: 'GenPet 记录',
};
const category = pet =>
  pet.hostedHere ? '本机宿主 GenPet' : pet.genpet ? 'GenPet' : pet.genpet === null ? '未知' : '非 GenPet';
const cell = text => {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
};
function showInventory(inventory) {
  const list = inventory.hostList
    ? `宿主列表读取于 ${inventory.hostList.savedAt}（${inventory.hostList.pets} 只）`
    : '没有宿主列表：云端宠物名称不在本机缓存里，未知的云端宠物需要 Agent 用 list_pets 结果重新打开调试器';
  el('inventory-note').textContent = `共 ${inventory.pets.length} 只。${list}。`;
  el('inventory').replaceChildren(
    ...inventory.pets.map(pet => {
      const records = cell('');
      for (const record of pet.records) {
        const button = document.createElement('button');
        button.textContent = `${record.host} · ${record.name}${record.error ? ' · 记录异常' : record.archived ? ' · 已归档' : ''}`;
        button.addEventListener('click', () => {
          el('pet').value = `${record.host}|${record.petId}`;
          load();
        });
        records.append(button);
      }
      const row = document.createElement('tr');
      row.append(
        cell(category(pet)),
        cell(pet.name ?? '（本机没有名称）'),
        cell(pet.localId ? `${pet.id}\n${pet.localId}` : pet.id),
        cell(pet.sources.map(source => SOURCES[source] ?? source).join('、')),
        cell(pet.evidence.join('\n')),
        records,
      );
      return row;
    }),
  );
}
async function load() {
  el('error').textContent = '';
  try {
    const selected = el('pet').value;
    const inventory = await get('/api/inventory');
    showInventory(inventory);
    el('pet').replaceChildren(new Option('当前记录', ''));
    for (const pet of inventory.pets)
      for (const record of pet.records)
        el('pet').add(
          new Option(
            `${record.name} · ${record.host} · ${record.petId}${record.error ? ' · 记录异常' : record.archived ? ' · 已归档' : ''}`,
            `${record.host}|${record.petId}`,
          ),
        );
    el('pet').value = selected;
    const [host, pet] = selected.split('|');
    const suffix = selected ? `?host=${encodeURIComponent(host)}&pet=${encodeURIComponent(pet)}` : '';
    const { state, token: secret } = await get('/api/state' + suffix);
    token = secret;
    el('identity').textContent = `${state.host} · ${state.pet?.id || '尚无宠物记录'} · v${state.version}`;
    show('record', state.pet);
    show('pending', state.pending);
    show('stories', state.stories);
    show('raw', state);
    el('art').replaceChildren();
    for (const art of state.art) {
      const detail = document.createElement('details');
      const title = document.createElement('summary');
      title.textContent = `${art.id} · ${art.kind} · ${art.stage}`;
      const info = document.createElement('pre');
      info.textContent = JSON.stringify(art, null, 2);
      detail.append(title, info);
      if (art.kind !== 'artifact') {
        const image = document.createElement('img');
        image.src = '/art/' + encodeURIComponent(art.id) + suffix;
        image.alt = art.description;
        image.loading = 'lazy';
        detail.append(image);
      }
      el('art').append(detail);
    }
    show('host', await get('/api/native-pets' + suffix));
  } catch (error) {
    el('error').textContent = `读取记录失败：${error.message}`;
  }
}
el('reload').addEventListener('click', load);
el('pet').addEventListener('change', load);
el('stop').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/action', {
      method: 'POST',
      headers: { 'X-GenPet-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    if (!response.ok) throw new Error('请关闭此页面后重试。');
    el('stop').disabled = true;
    el('identity').textContent = '调试器已关闭。';
  } catch (error) {
    el('error').textContent = error.message;
  }
});
load();

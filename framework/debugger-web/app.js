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
async function load() {
  el('error').textContent = '';
  try {
    const selected = el('pet').value;
    const pets = await get('/api/pets');
    el('pet').replaceChildren(new Option('当前记录', ''));
    for (const pet of pets)
      el('pet').add(
        new Option(
          `${pet.name || pet.id} · ${pet.id}${pet.error ? ' · 记录异常' : pet.archived ? ' · 已归档' : ''}`,
          pet.id,
        ),
      );
    el('pet').value = selected;
    const suffix = selected ? '?pet=' + encodeURIComponent(selected) : '';
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

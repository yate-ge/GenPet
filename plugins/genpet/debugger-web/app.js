const $ = s => document.querySelector(s);
let mode = new URLSearchParams(location.search).get('demo') === '1' ? 'demo' : 'live', data, action = 'idle', spriteImage, frame = 0, frameAt = 0, lastAsset = '', toastTimer;
const stageLabels = { egg: '还在蛋里，悄悄期待', hatchling: '初见世界 · 幼体', juvenile: '正在探索 · 少年', adult: '自在生长 · 成熟' };
const stageNames = { egg: '一颗蛋', hatchling: '初生', juvenile: '探索', adult: '自在' };
const sceneNames = { nest: 'THE NEST / 小小的窝', library: 'THE LIBRARY / 阅读角', workshop: 'THE WORKSHOP / 小工坊', studio: 'THE STUDIO / 创作间', garden: 'THE GARDEN / 探索花园', meadow: 'THE MEADOW / 休息草地' };
const kinds = { build: '构建', research: '研究', create: '创作', learn: '学习', rest: '休息' };
const actionNames = { idle: '陪伴', running: '专注', waiting: '等你', review: '看看', waving: '招手', jumping: '开心', failed: '遇到困难', 'running-right': '向右', 'running-left': '向左' };
const text = (selector, value) => { $(selector).textContent = value; };
function toast(message) { text('#toast', message); $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4800); }
async function api(input) { try {
    const response = await fetch(`/api/action?demo=${mode === 'demo' ? 1 : 0}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GenPet-Token': data.token }, body: JSON.stringify(input) });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.error);
    await refresh();
    return result.result;
}
catch (e) {
    toast(e.message);
    throw e;
} }
async function refresh() { try {
    const response = await fetch(`/api/state?demo=${mode === 'demo' ? 1 : 0}`);
    if (!response.ok)
        throw new Error('连接暂时中断');
    data = await response.json();
    render();
}
catch (e) {
    toast('暂时无法连接 GenPet。请确认本地服务正在运行。');
} }
function setMode(value) { mode = value; history.replaceState(null, '', mode === 'demo' ? '/?demo=1' : '/'); action = 'idle'; lastAsset = ''; refresh(); }
function approvedArt() { const pet = data.state.pet; if (!pet)
    return null; return [...data.state.art].reverse().find(a => a.stage === pet.stage && a.kind === 'atlas') || [...data.state.art].reverse().find(a => a.stage === pet.stage && a.kind === 'portrait'); }
function artwork() {
    const p = data.state.pet;
    const approved = approvedArt();
    if (approved)
        return { src: `/art/${approved.id}-${approved.kind}?demo=${mode === 'demo' ? 1 : 0}&v=${approved.createdAt}`, kind: approved.kind, example: false };
    const stage = p?.stage || 'egg';
    const catalog = data.assets;
    // Bundled art is explicitly an exemplar, never represented as personal generation.
    const atlas = catalog.atlases?.[stage] || (stage === 'hatchling' ? catalog.atlas : null);
    if (atlas)
        return { src: atlas, kind: 'atlas', example: true };
    const portrait = catalog.portraits?.[stage];
    return portrait ? { src: portrait, kind: 'portrait', example: true } : null;
}
function render() {
    const { state: s } = data, p = s.pet, isDemo = mode === 'demo';
    $('#live-tab').classList.toggle('active', !isDemo);
    $('#demo-tab').classList.toggle('active', isDemo);
    $('#demo-notice').hidden = !isDemo;
    $('#demo-controls').hidden = !isDemo;
    $('#adopt-button').hidden = !!p;
    $('#pet-controls').hidden = !p;
    $('#export-button').disabled = !p;
    $('#auto-context').checked = s.settings.autoContext;
    $('#auto-context').disabled = isDemo;
    $('#freeze-outfit').checked = s.settings.freezeOutfit;
    text('#pet-name', p ? p.profile.name : 'Hello, little one.');
    text('#stage-label', p ? stageLabels[p.stage] : '等待领养');
    text('#age-label', `DAY ${String(p?.growth.days || 0).padStart(2, '0')}`);
    text('#pet-description', p ? (p.stage === 'egg' ? '只留下一点淡淡的线索。轻轻摇晃，还不知道里面会是谁。' : '身份在孵化时揭晓。此后长大一点，也保留最初的自己。') : '无需填写问卷。让最近的日常为你的第一颗蛋留下一点印记。');
    const scene = s.settings.freezeOutfit ? s.settings.lockedOutfit?.scene || 'nest' : p?.state.scene || 'nest';
    $('.habitat').dataset.scene = scene;
    text('#scene-name', sceneNames[scene] || sceneNames.nest);
    text('#context-title', p?.state.kind ? `这一段，陪你${kinds[p.state.kind]}` : s.scanInfo.messages ? `感知到 ${s.scanInfo.messages} 条近期任务线索` : '安静的日常，也很好');
    text('#context-description', p?.state.kind ? `已根据上一段 5 小时的活动更新情境。道具设计：${{ none: '无', tool: '小工具', book: '书本', brush: '画笔', star: '探索徽记', pillow: '靠枕' }[p.state.prop]}。新图像需生成并通过检查后才会替换。` : isDemo ? '选择一种日常，推进 5 小时，看看下一段情境如何变化。' : s.settings.autoContext ? '从本机 Codex 自动提取活动标签。每 5 小时形成一次情境，不存储对话原文。' : '自动读取已关闭。伙伴依然按时间成长。');
    $('#scan-button').disabled = isDemo || !s.settings.autoContext;
    $('#pet-touch').classList.toggle('egg', p?.stage === 'egg' || !p);
    const art = artwork();
    text('#art-label', !art ? 'IMAGEGEN / 等待生成' : art.example ? (isDemo ? 'IMAGEGEN / 预生成演示形象' : 'IMAGEGEN / 示例 · 专属形象待生成') : 'IMAGEGEN / 你的专属形象');
    if (art && art.src !== lastAsset) {
        lastAsset = art.src;
        $('#art-loading').hidden = true;
        $('#portrait').hidden = art.kind !== 'portrait';
        $('#sprite').hidden = art.kind !== 'atlas';
        if (art.kind === 'portrait') {
            $('#portrait').src = art.src;
            spriteImage = null;
        }
        else {
            const img = new Image();
            img.addEventListener("load", () => { spriteImage = img; frame = 0; frameAt = 0; });
            img.src = art.src;
        }
    }
    if (!art) {
        $('#art-loading').hidden = false;
        $('#portrait').hidden = true;
        $('#sprite').hidden = true;
        spriteImage = null;
    }
    const actionContainer = $('#actions');
    if (!actionContainer.children.length) {
        for (const name of ['idle', 'running', 'waiting', 'review', 'waving', 'jumping', 'failed']) {
            const b = document.createElement('button');
            b.textContent = actionNames[name];
            b.dataset.action = name;
            b.addEventListener("click", () => { action = name; frame = 0; frameAt = 0; render(); });
            actionContainer.append(b);
        }
    }
    for (const b of actionContainer.children)
        b.classList.toggle('active', b.dataset.action === action);
    const stages = [['egg', '0—5 小时', '一点独特，从出生开始。'], ['hatchling', '5 小时后', '小小的身体，初见世界。'], ['juvenile', '第 7 天起', '体态与表达，慢慢展开。'], ['adult', '第 21 天起', '保留身份，继续积累故事。']];
    $('#stages').replaceChildren();
    for (const [index, [key, when, note]] of stages.entries()) {
        const card = document.createElement('div');
        card.className = 'stage-card' + (p?.stage === key ? ' current' : '');
        const copy = document.createElement('div');
        const number = document.createElement('span');
        number.className = 'stage-number';
        number.textContent = `0${index + 1} / ${when}`;
        const h = document.createElement('h4');
        h.textContent = stageNames[key];
        const desc = document.createElement('p');
        desc.textContent = note;
        copy.append(number, h, desc);
        card.append(copy);
        if (data.assets.portraits?.[key]) {
            const img = document.createElement('img');
            img.src = data.assets.portraits[key];
            img.alt = `${stageNames[key]} · 预生成示例`;
            card.append(img);
        }
        else {
            const placeholder = document.createElement('span');
            placeholder.className = 'stage-art-placeholder';
            placeholder.textContent = '尚未生成';
            card.append(placeholder);
        }
        $('#stages').append(card);
    }
    const events = (p?.events || []).slice(-8).reverse();
    $('#events').replaceChildren();
    text('#journal-count', events.length ? `${p.events.length} LITTLE MOMENTS` : 'FIRST CHAPTER');
    if (!events.length) {
        const el = document.createElement('p');
        el.textContent = '第一次相遇，会写在这里。';
        $('#events').append(el);
    }
    for (const e of events) {
        const row = document.createElement('div');
        row.className = 'event';
        const time = document.createElement('time');
        time.textContent = new Date(e.at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        const paragraph = document.createElement('p');
        paragraph.textContent = eventText(e, p);
        row.append(time, paragraph);
        $('#events').append(row);
    }
    $('#explanation').replaceChildren();
    for (const [heading, description] of [['共同的家族', '柔软圆润的身体、相同的动作语义；差异来自图像生成。'], ['稳定的身份', p ? `${p.profile.palette} 色系 · ${p.dna.pattern} 纹样 · 独立种子 ${p.seed.slice(0, 12)}` : '领养时自动建立配色与纹样方案。'], ['这次情境依据', p?.state.reason || '领养后开始建立时间线。'], ['自动读取', `${s.scanInfo.files} 个本地任务文件，${s.scanInfo.messages} 条近期用户消息。只保留活动标签；分类结果可能不准确，可以关闭或清除。`], ['图像生成状态', data.artRequest?.status === 'ready' ? '当前设计已有通过检查的动画素材。' : '待 Codex 的 imagegen 执行设计任务。预生成示例不代表专属形象已经生成。']]) {
        const item = document.createElement('div');
        item.className = 'explain-item';
        const a = document.createElement('strong');
        a.textContent = heading;
        const b = document.createElement('span');
        b.textContent = description;
        item.append(a, b);
        $('#explanation').append(item);
    }
    const native = $('#native-switch');
    native.hidden = isDemo;
    if (!isDemo) {
        const selection = data.nativeSelection;
        text('#native-selection', selection?.genpetSelected === true
            ? 'Codex 当前已选中 GenPet。'
            : selection?.genpetSelected === false
                ? 'Codex 当前未选中 GenPet。请先在 Pets 设置中选择 GenPet；IPC 无法切换选中项。'
                : '无法确认 Codex 当前选中的 Pet；请在 Pets 设置中确认已选中 GenPet。');
    }
    const spriteBox = $('#native-sprites');
    spriteBox.replaceChildren();
    const sprites = data.nativeSprites?.sprites || [];
    if (!isDemo && !sprites.length) {
        const empty = document.createElement('p');
        empty.className = 'native-note';
        empty.textContent = '还没有可切换的原生图集。';
        spriteBox.append(empty);
    }
    for (const name of sprites) {
        const row = document.createElement('div');
        const current = name === data.nativeSprites.current;
        row.className = 'sprite-row' + (current ? ' current' : '');
        const label = document.createElement('span');
        label.textContent = name.slice('spritesheet-'.length).replace(/\.(webp|png)$/, '');
        const button = document.createElement('button');
        button.className = 'text-button';
        button.textContent = current ? '重新显示' : '切换到这一版';
        button.addEventListener("click", async () => { button.disabled = true; try {
            const result = await api({ action: 'switch-native', spritesheet: name, refreshMethod: $('#refresh-method').value });
            showIpcResult(result);
            toast(result.refresh?.selection?.genpetSelected === false
                ? '图集已更新，但 Codex 未选中 GenPet；请先在 Pets 设置中选择。'
                : result.refresh?.displayStatus === 'confirmed' ? '悬浮宠物已换成这一版。' : '文件已切换，请观察悬浮宠物；执行结果见下方。');
        }
        finally {
            button.disabled = false;
        } });
        row.append(label, button);
        spriteBox.append(row);
    }
    updateCountdown();
}
function eventText(event, pet) { switch (event.type) {
    case 'adopted': return '领养成功。故事从一颗独一无二的蛋开始。';
    case 'hatched': return '第一次见面！从蛋里探出了小小的自己。';
    case 'growth': return '又长大了一点，最初的身份印记依然在。';
    case 'stage': return event.message.includes('adult') ? '进入成熟期。继续积累自己的故事。' : '进入少年期，开始探索更大的世界。';
    case 'context': return '一段新的日常，成为下一次装扮的线索。';
    case 'milestone': return '记住了一个值得纪念的小时刻。';
    default: return event.message;
} }
function updateCountdown() { if (!data)
    return; const p = data.state.pet; const now = Date.now() + (mode === 'demo' ? data.state.clockOffset : 0); let duration = 5 * 3600000, remaining = duration; if (p) {
    const hatch = p.adoptedAt + p.policy.hatchHours * 3600000;
    if (p.stage === 'egg') {
        duration = p.policy.hatchHours * 3600000;
        remaining = Math.max(0, hatch - now);
        text('#next-label', '距离第一次见面');
    }
    else {
        duration = p.policy.growthHours * 3600000;
        remaining = Math.max(0, hatch + (p.growth.days + 1) * duration - now);
        text('#next-label', '距离下一次成长');
    }
}
else
    text('#next-label', '第一次见面'); const seconds = Math.floor(remaining / 1000); text('#countdown', [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(v => String(v).padStart(2, '0')).join(':')); $('#progress-bar').style.width = `${Math.max(0, Math.min(100, (1 - remaining / duration) * 100))}%`; text('#time-note', p?.stage === 'egg' ? '无需喂养或打卡。你离线时，它也在慢慢成长。' : '每天长大一点，成熟后用新的细节继续记录日常。'); }
function animate(timestamp) {
    if (stopped)
        return;
    if (spriteImage && data) {
        const selected = data.actions.find(a => a.name === action) || data.actions[0], idle = data.actions[0];
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const firstIdle = selected.name === 'idle' ? 0 : selected.count * 3;
        const inIdle = selected.name === 'idle' || frame >= firstIdle;
        const row = inIdle ? idle : selected;
        const column = reduced ? 0 : inIdle ? (frame - firstIdle) % idle.count : frame % selected.count;
        const duration = row.durations[column] * (inIdle ? 6 : 1);
        if (!frameAt)
            frameAt = timestamp;
        const ctx = $('#sprite').getContext('2d');
        ctx.clearRect(0, 0, 192, 208);
        ctx.drawImage(spriteImage, (reduced ? 0 : column) * 192, (reduced ? selected.row : row.row) * 208, 192, 208, 0, 0, 192, 208);
        if (!reduced && timestamp - frameAt >= duration) {
            frame++;
            if (frame >= firstIdle + idle.count)
                frame = firstIdle;
            frameAt = timestamp;
        }
    }
    requestAnimationFrame(animate);
}
$('#live-tab').addEventListener("click", () => setMode('live'));
$('#demo-tab').addEventListener("click", () => setMode('demo'));
$('#adopt-button').addEventListener("click", async () => { await api({ action: 'adopt' }); toast('领养成功。已根据近期日常建立专属设计方案。'); });
$('#pet-touch').addEventListener("click", () => { action = data?.state.pet?.stage === 'egg' ? 'idle' : 'waving'; frame = 0; frameAt = 0; $('#pet-touch').classList.add('greet'); text('#pet-reaction', data?.state.pet?.stage === 'egg' ? '轻轻地，回应你一下。' : '嗨，我在。'); setTimeout(() => { $('#pet-touch').classList.remove('greet'); text('#pet-reaction', ''); }, 1600); });
for (const button of document.querySelectorAll('[data-hours]'))
    button.addEventListener("click", async () => { await api({ action: 'advance', hours: Number(button.dataset.hours) }); toast('演示时间已推进，真实伙伴不受影响。'); });
$('#reset-demo').addEventListener("click", () => api({ action: 'reset-demo' }));
$('#demo-context-add').addEventListener("click", async () => { await api({ action: 'context', kind: $('#demo-kind').value, summary: '演示活动', milestone: true }); toast('已留下线索，推进到下一个 5 小时窗口查看变化。'); });
$('#scan-button').addEventListener("click", async () => { const r = await api({ action: 'scan' }); toast(`已查看最近日常：${r.messages} 条任务线索。`); });
$('#auto-context').addEventListener("change", () => api({ action: 'settings', autoContext: $('#auto-context').checked }));
$('#freeze-outfit').addEventListener("change", () => api({ action: 'settings', freezeOutfit: $('#freeze-outfit').checked }));
$('#clear-context').addEventListener("click", async () => { await api({ action: 'clear-context' }); toast('活动记录已清除。成长时间与身份印记保留。'); });
$('#show-customize').addEventListener("click", () => { const p = data.state.pet; if (!p)
    return toast('先领养你的伙伴。'); $('#name-input').value = p.profile.name; $('#temperament-input').value = p.profile.temperament; $('#interest-input').value = p.profile.interest; $('#customize-dialog').showModal(); });
$('#customize-form').addEventListener("submit", async (e) => { e.preventDefault(); await api({ action: 'profile', profile: { name: $('#name-input').value, temperament: $('#temperament-input').value, interest: $('#interest-input').value } }); $('#customize-dialog').close(); toast('已保存陪伴偏好。'); });
for (const b of document.querySelectorAll('.dialog-close'))
    b.addEventListener("click", () => b.closest('dialog').close());
$('#info-button').addEventListener("click", () => $('#info-dialog').showModal());
$('#copy-request').addEventListener("click", async () => { if (!data.artRequest)
    return toast('先领养你的伙伴。'); try {
    await navigator.clipboard.writeText(JSON.stringify(data.artRequest, null, 2));
    toast('生成任务已复制。');
}
catch {
    toast('复制不可用，请在插件目录运行 node dist/cli.js art-request。');
} });
$('#export-button').addEventListener("click", async () => { const result = await api({ action: 'export' }); showIpcResult(result); toast(data.nativeSelection?.genpetSelected === false ? (data.state.pet?.stage === 'egg' ? '蛋已安装。打开 Codex 的 Pets，选择 GenPet，就能看到你的蛋。' : '形象已安装。打开 Codex 的 Pets，选择 GenPet，就能看到你的伙伴。') : '原生安装结果见下方；刷新请求与可见显示分别确认。'); });
function showIpcResult(result) { text('#ipc-result', new Date().toLocaleTimeString() + '\n' + JSON.stringify(result, null, 2)); }
for (const [id, action] of [['ipc-refresh', 'ipc-refresh']])
    $('#' + id).addEventListener("click", async () => {
        const buttons = [$('#ipc-refresh')];
        buttons.forEach(b => b.disabled = true);
        text('#ipc-result', '执行中…');
        try {
            const result = await api({ action });
            showIpcResult(result);
            toast(result.selection?.genpetSelected === false
                ? '刷新请求已发送，但 Codex 未选中 GenPet；请先在 Pets 设置中选择。'
                : '刷新请求已发送；请观察 Codex 悬浮宠物。');
        }
        catch (error) {
            showIpcResult({ error: error.message });
        }
        finally {
            buttons.forEach(b => b.disabled = false);
        }
    });
let stopped = false;
$('#stop-debugger').addEventListener("click", async () => { const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GenPet-Token': data.token }, body: JSON.stringify({ action: 'stop' }) }); if (response.ok) {
    stopped = true;
    document.body.replaceChildren(Object.assign(document.createElement('p'), { textContent: '调试器已停止，可以关闭此页面。' }));
} });
await refresh();
setInterval(() => { if (!stopped)
    void refresh(); }, 15000);
setInterval(() => { if (!stopped)
    updateCountdown(); }, 1000);
requestAnimationFrame(animate);

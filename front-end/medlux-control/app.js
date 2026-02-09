import {
  openDB,
  ensureAdminUser,
  normalizeUserId,
  hashPin,
  readAll,
} from '../shared/db.js';
import { clearSession, requireAuth } from '../shared/session.js';

const session = requireAuth('../index.html');

const sessionInfo = document.getElementById('sessionInfo');
const btnLogout = document.getElementById('btnLogout');
const toast = document.getElementById('toast');
const tabs = document.querySelectorAll('.tab');
const tabSections = {
  equipamentos: document.getElementById('tab-equipamentos'),
  usuarios: document.getElementById('tab-usuarios'),
  vinculos: document.getElementById('tab-vinculos'),
};

const equipmentForm = document.getElementById('equipmentForm');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const equipList = document.getElementById('equipList');

const userForm = document.getElementById('userForm');
const userList = document.getElementById('userList');

const vinculoForm = document.getElementById('vinculoForm');
const vinculoList = document.getElementById('vinculoList');

let db;
let editingEquipmentId = null;

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.classList.toggle('show', true);
  toast.dataset.type = type;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function setActiveTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  Object.entries(tabSections).forEach(([key, section]) => {
    section.hidden = key !== tabName;
  });
}

function clearForm(form) {
  form.reset();
}

function createTextRow(label, value) {
  const row = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = label;
  const span = document.createElement('span');
  span.textContent = value || '—';
  row.append(strong, document.createTextNode(' '), span);
  return row;
}

async function loadEquipamentos() {
  const tx = db.transaction('equipamentos', 'readonly');
  const store = tx.objectStore('equipamentos');
  const items = await readAll(store);
  equipList.textContent = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum equipamento cadastrado.';
    equipList.appendChild(empty);
    return;
  }

  items.sort((a, b) => a.id.localeCompare(b.id));
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'list-item';

    const title = document.createElement('h3');
    title.textContent = `${item.id} • ${item.modelo || 'Sem modelo'}`;

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `${item.tipo || 'Tipo não informado'} • ${item.fabricante || 'Fabricante não informado'}`;

    const details = document.createElement('div');
    details.append(
      createTextRow('Número de série:', item.numeroSerie),
      createTextRow('Responsável:', item.responsavelAtual),
      createTextRow('Última calibração:', item.dataUltimaCalibracao)
    );

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn ghost';
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => startEditEquipment(item));

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn ghost';
    btnDelete.textContent = 'Excluir';
    btnDelete.addEventListener('click', () => deleteEquipment(item.id));

    actions.append(btnEdit, btnDelete);
    card.append(title, meta, details, actions);
    equipList.appendChild(card);
  });
}

function startEditEquipment(item) {
  editingEquipmentId = item.id;
  equipmentForm.id.value = item.id;
  equipmentForm.tipo.value = item.tipo || '';
  equipmentForm.modelo.value = item.modelo || '';
  equipmentForm.numeroSerie.value = item.numeroSerie || '';
  equipmentForm.fabricante.value = item.fabricante || '';
  equipmentForm.responsavelAtual.value = item.responsavelAtual || '';
  equipmentForm.dataUltimaCalibracao.value = item.dataUltimaCalibracao || '';
  equipmentForm.observacoes.value = item.observacoes || '';
  btnCancelEdit.hidden = false;
  equipmentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveEquipment(event) {
  event.preventDefault();
  const id = equipmentForm.id.value.trim().toUpperCase();
  if (!id) {
    showToast('Informe o ID do equipamento.', 'error');
    return;
  }

  const data = {
    id,
    tipo: equipmentForm.tipo.value.trim(),
    modelo: equipmentForm.modelo.value.trim(),
    numeroSerie: equipmentForm.numeroSerie.value.trim(),
    fabricante: equipmentForm.fabricante.value.trim(),
    responsavelAtual: equipmentForm.responsavelAtual.value.trim(),
    dataUltimaCalibracao: equipmentForm.dataUltimaCalibracao.value,
    observacoes: equipmentForm.observacoes.value.trim(),
    updated_at: new Date().toISOString(),
  };

  const tx = db.transaction('equipamentos', 'readwrite');
  const store = tx.objectStore('equipamentos');

  try {
    const existing = await requestAsPromise(store.get(id));
    if (!editingEquipmentId && existing) {
      showToast('Já existe um equipamento com este ID.', 'error');
      return;
    }

    if (editingEquipmentId && editingEquipmentId !== id) {
      if (existing) {
        showToast('ID já em uso. Escolha outro.', 'error');
        return;
      }
      const shouldRename = window.confirm('Você alterou o ID. Deseja renomear o equipamento?');
      if (!shouldRename) {
        showToast('Renomeio cancelado.', 'info');
        return;
      }
      await requestAsPromise(store.delete(editingEquipmentId));
    }

    await requestAsPromise(store.put(data));
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    showToast('Salvo com sucesso.', 'success');
    clearForm(equipmentForm);
    editingEquipmentId = null;
    btnCancelEdit.hidden = true;
    await loadEquipamentos();
    await refreshVinculoSelections();
  } catch (error) {
    showToast('Erro ao salvar equipamento.', 'error');
  }
}

async function deleteEquipment(id) {
  if (!window.confirm(`Excluir equipamento ${id}?`)) {
    return;
  }
  const tx = db.transaction('equipamentos', 'readwrite');
  await requestAsPromise(tx.objectStore('equipamentos').delete(id));
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  showToast('Equipamento excluído.', 'success');
  await loadEquipamentos();
  await refreshVinculoSelections();
}

async function loadUsers() {
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const users = await readAll(store);
  users.sort((a, b) => a.user_id.localeCompare(b.user_id));
  userList.textContent = '';

  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum usuário cadastrado.';
    userList.appendChild(empty);
    return;
  }

  users.forEach((user) => {
    const card = document.createElement('div');
    card.className = 'list-item';

    const title = document.createElement('h3');
    title.textContent = `${user.user_id} • ${user.nome}`;

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = user.role === 'admin' ? 'Administrador' : 'Operador';

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    if (session.role === 'admin') {
      const btnReset = document.createElement('button');
      btnReset.type = 'button';
      btnReset.className = 'btn ghost';
      btnReset.textContent = 'Resetar PIN';
      btnReset.addEventListener('click', () => resetPin(user.user_id));
      actions.appendChild(btnReset);
    }

    card.append(title, meta, actions);
    userList.appendChild(card);
  });
}

async function createUser(event) {
  event.preventDefault();
  if (session.role !== 'admin') {
    showToast('Apenas admin pode criar usuários.', 'error');
    return;
  }

  const userId = normalizeUserId(userForm.user_id.value);
  const nome = userForm.nome.value.trim();
  const pin = userForm.pin.value.trim();

  if (!/^\d{4}$/.test(pin)) {
    showToast('PIN inválido. Use 4 dígitos.', 'error');
    return;
  }

  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  const existing = await requestAsPromise(store.get(userId));
  if (existing) {
    showToast('Usuário já existe.', 'error');
    return;
  }

  const pinData = await hashPin(pin);
  store.put({
    user_id: userId,
    nome,
    role: 'operator',
    pin_salt: pinData.salt,
    pin_hash: pinData.hash,
    created_at: new Date().toISOString(),
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  showToast('Usuário criado.', 'success');
  clearForm(userForm);
  await loadUsers();
  await refreshVinculoSelections();
}

async function resetPin(userId) {
  const newPin = window.prompt(`Novo PIN para ${userId} (4 dígitos):`);
  if (!newPin || !/^\d{4}$/.test(newPin)) {
    showToast('PIN inválido ou cancelado.', 'error');
    return;
  }

  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  const user = await requestAsPromise(store.get(userId));
  if (!user) {
    showToast('Usuário não encontrado.', 'error');
    return;
  }

  const pinData = await hashPin(newPin);
  user.pin_salt = pinData.salt;
  user.pin_hash = pinData.hash;
  store.put(user);

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  showToast('PIN atualizado.', 'success');
}

async function refreshVinculoSelections() {
  const usersTx = db.transaction('users', 'readonly');
  const users = await readAll(usersTx.objectStore('users'));
  const operators = users.filter((user) => user.role === 'operator');

  const equipTx = db.transaction('equipamentos', 'readonly');
  const equipamentos = await readAll(equipTx.objectStore('equipamentos'));

  const userSelect = vinculoForm.user_id;
  const equipSelect = vinculoForm.equip_id;
  userSelect.textContent = '';
  equipSelect.textContent = '';

  const userPlaceholder = document.createElement('option');
  userPlaceholder.value = '';
  userPlaceholder.textContent = 'Selecione';
  userSelect.appendChild(userPlaceholder);

  operators.forEach((user) => {
    const option = document.createElement('option');
    option.value = user.user_id;
    option.textContent = `${user.user_id} • ${user.nome}`;
    userSelect.appendChild(option);
  });

  const equipPlaceholder = document.createElement('option');
  equipPlaceholder.value = '';
  equipPlaceholder.textContent = 'Selecione';
  equipSelect.appendChild(equipPlaceholder);

  equipamentos.sort((a, b) => a.id.localeCompare(b.id)).forEach((equip) => {
    const option = document.createElement('option');
    option.value = equip.id;
    option.textContent = `${equip.id} • ${equip.modelo || 'Sem modelo'}`;
    equipSelect.appendChild(option);
  });
}

async function loadVinculos() {
  const vinculoTx = db.transaction('vinculos', 'readonly');
  const vinculos = await readAll(vinculoTx.objectStore('vinculos'));

  const userTx = db.transaction('users', 'readonly');
  const users = await readAll(userTx.objectStore('users'));
  const userMap = new Map(users.map((user) => [user.user_id, user]));

  const equipTx = db.transaction('equipamentos', 'readonly');
  const equipamentos = await readAll(equipTx.objectStore('equipamentos'));
  const equipMap = new Map(equipamentos.map((equip) => [equip.id, equip]));

  vinculoList.textContent = '';

  if (!vinculos.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum vínculo registrado.';
    vinculoList.appendChild(empty);
    return;
  }

  vinculos.sort((a, b) => a.id.localeCompare(b.id));

  vinculos.forEach((vinculo) => {
    const card = document.createElement('div');
    card.className = 'list-item';

    const user = userMap.get(vinculo.user_id);
    const equip = equipMap.get(vinculo.equip_id);

    const title = document.createElement('h3');
    title.textContent = `${vinculo.user_id} → ${vinculo.equip_id}`;

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `${user?.nome || 'Usuário'} • ${equip?.modelo || 'Equipamento'} • ${vinculo.ativo ? 'Ativo' : 'Encerrado'}`;

    const details = document.createElement('div');
    details.append(
      createTextRow('Início:', vinculo.data_inicio),
      createTextRow('Fim:', vinculo.data_fim),
      createTextRow('Observação:', vinculo.observacao)
    );

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    if (vinculo.ativo && session.role === 'admin') {
      const btnEnd = document.createElement('button');
      btnEnd.type = 'button';
      btnEnd.className = 'btn ghost';
      btnEnd.textContent = 'Encerrar vínculo';
      btnEnd.addEventListener('click', () => endVinculo(vinculo.id));
      actions.appendChild(btnEnd);
    }

    card.append(title, meta, details, actions);
    vinculoList.appendChild(card);
  });
}

async function createVinculo(event) {
  event.preventDefault();
  if (session.role !== 'admin') {
    showToast('Apenas admin pode criar vínculos.', 'error');
    return;
  }

  const userId = vinculoForm.user_id.value;
  const equipId = vinculoForm.equip_id.value;
  const observacao = vinculoForm.observacao.value.trim();

  if (!userId || !equipId) {
    showToast('Selecione usuário e equipamento.', 'error');
    return;
  }

  const id = `${userId}|${equipId}`;
  const tx = db.transaction('vinculos', 'readwrite');
  const store = tx.objectStore('vinculos');
  const existing = await requestAsPromise(store.get(id));
  const now = new Date().toISOString();

  if (existing && existing.ativo) {
    showToast('Vínculo já está ativo.', 'error');
    return;
  }

  store.put({
    id,
    user_id: userId,
    equip_id: equipId,
    ativo: true,
    data_inicio: now,
    data_fim: null,
    observacao,
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  showToast('Vínculo criado.', 'success');
  clearForm(vinculoForm);
  await loadVinculos();
}

async function endVinculo(vinculoId) {
  const tx = db.transaction('vinculos', 'readwrite');
  const store = tx.objectStore('vinculos');
  const vinculo = await requestAsPromise(store.get(vinculoId));
  if (!vinculo) {
    showToast('Vínculo não encontrado.', 'error');
    return;
  }
  vinculo.ativo = false;
  vinculo.data_fim = new Date().toISOString();
  store.put(vinculo);

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  showToast('Vínculo encerrado.', 'success');
  await loadVinculos();
}

btnLogout.addEventListener('click', () => {
  clearSession();
  window.location.href = '../index.html';
});

btnCancelEdit.addEventListener('click', () => {
  editingEquipmentId = null;
  btnCancelEdit.hidden = true;
  clearForm(equipmentForm);
});

equipmentForm.addEventListener('submit', saveEquipment);
userForm.addEventListener('submit', createUser);
vinculoForm.addEventListener('submit', createVinculo);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

async function init() {
  db = await openDB();
  await ensureAdminUser(db);
  sessionInfo.textContent = `Usuário: ${session.user_id} • Perfil: ${session.role === 'admin' ? 'Admin' : 'Operador'}`;

  if (session.role !== 'admin') {
    document.querySelector('[data-tab="usuarios"]').hidden = true;
    document.querySelector('[data-tab="vinculos"]').hidden = true;
    tabSections.usuarios.hidden = true;
    tabSections.vinculos.hidden = true;
  }

  await loadEquipamentos();
  await loadUsers();
  await refreshVinculoSelections();
  await loadVinculos();
}

init();

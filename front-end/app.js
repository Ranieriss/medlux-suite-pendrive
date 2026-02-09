import { openDB, ensureAdminUser, normalizeUserId, verifyPin } from './shared/db.js';
import { clearSession, getSession, setSession } from './shared/session.js';

const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const btnLogout = document.getElementById('btnLogout');

let db;

function setStatus(message, type) {
  loginStatus.textContent = message;
  loginStatus.classList.remove('success', 'error');
  if (type) {
    loginStatus.classList.add(type);
  }
}

async function init() {
  db = await openDB();
  await ensureAdminUser(db);
  const session = getSession();
  if (session) {
    btnLogout.hidden = false;
    setStatus(`Sessão ativa para ${session.user_id}.`, 'success');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Validando credenciais...', null);

  const userId = normalizeUserId(loginForm.userId.value);
  const pin = loginForm.userPin.value.trim();

  if (!/^\d{4}$/.test(pin)) {
    setStatus('PIN inválido. Use 4 dígitos.', 'error');
    return;
  }

  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const request = store.get(userId);

  request.onsuccess = async () => {
    const user = request.result;
    if (!user) {
      setStatus('Usuário não encontrado.', 'error');
      return;
    }

    const ok = await verifyPin(pin, user.pin_salt, user.pin_hash);
    if (!ok) {
      setStatus('PIN incorreto.', 'error');
      return;
    }

    setSession(user);
    btnLogout.hidden = false;
    setStatus('Login efetuado. Você já pode acessar os módulos.', 'success');
  };

  request.onerror = () => {
    setStatus('Erro ao acessar usuários.', 'error');
  };
});

btnLogout.addEventListener('click', () => {
  clearSession();
  btnLogout.hidden = true;
  setStatus('Sessão encerrada.', 'success');
});

init();

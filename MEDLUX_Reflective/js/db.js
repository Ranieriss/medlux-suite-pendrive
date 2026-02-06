const DB_NAME = 'medlux_reflective';
const DB_VERSION = 2;

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('criteria')) {
      const store = db.createObjectStore('criteria', { keyPath: 'id' });
      store.createIndex('by_norm', 'norm', { unique: false });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (storeName, mode, callback) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const getAllCriteria = async () => withStore('criteria', 'readonly', (store) => new Promise((resolve, reject) => {
  const request = store.getAll();
  request.onsuccess = () => resolve(request.result || []);
  request.onerror = () => reject(request.error);
}));

const saveCriteria = async (criteria) => withStore('criteria', 'readwrite', (store) => new Promise((resolve, reject) => {
  const requests = criteria.map((item) => store.put(item));
  let completed = 0;
  const finish = () => {
    completed += 1;
    if (completed === requests.length) resolve();
  };
  if (!requests.length) resolve();
  requests.forEach((request) => {
    request.onsuccess = finish;
    request.onerror = () => reject(request.error);
  });
}));

window.openDatabase = openDatabase;
window.getAllCriteria = getAllCriteria;
window.saveCriteria = saveCriteria;
window.DB_VERSION = DB_VERSION;

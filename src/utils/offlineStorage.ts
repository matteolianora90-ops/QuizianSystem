import { Quiz, StudyMaterial } from '../types';

const DB_NAME = 'quizian-offline-db';
const DB_VERSION = 1;
const STORE_MATERIALS = 'study_materials';
const STORE_QUIZZES = 'quizzes';
const LS_MATERIALS_KEY = 'quizian_study_materials';

function openOfflineDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_MATERIALS)) {
          db.createObjectStore(STORE_MATERIALS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUIZZES)) {
          db.createObjectStore(STORE_QUIZZES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function stripOversizedBlobForLocalStorage(material: StudyMaterial): StudyMaterial {
  if (material.fileDataUrl && material.fileDataUrl.length > 150000) {
    const { fileDataUrl: _omitted, ...rest } = material;
    return rest;
  }
  return material;
}

export function getStudyMaterialsFromLocalStorage(): StudyMaterial[] | null {
  try {
    const raw = localStorage.getItem(LS_MATERIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStudyMaterialsToLocalStorage(materials: StudyMaterial[]): void {
  try {
    const compact = materials.map(stripOversizedBlobForLocalStorage);
    localStorage.setItem(LS_MATERIALS_KEY, JSON.stringify(compact));
  } catch {
    // Ignore localStorage quota error; IndexedDB stores full materials
  }
}

export async function getAllStudyMaterialsFromDB(): Promise<StudyMaterial[] | null> {
  const db = await openOfflineDB();
  if (!db) return getStudyMaterialsFromLocalStorage();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MATERIALS, 'readonly');
      const store = tx.objectStore(STORE_MATERIALS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as StudyMaterial[]) || [];
        items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        resolve(items);
      };
      req.onerror = () => resolve(getStudyMaterialsFromLocalStorage());
    } catch {
      resolve(getStudyMaterialsFromLocalStorage());
    }
  });
}

export async function saveStudyMaterialToDB(material: StudyMaterial): Promise<void> {
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MATERIALS, 'readwrite');
      const store = tx.objectStore(STORE_MATERIALS);
      store.put(material);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveAllStudyMaterialsToDB(materials: StudyMaterial[]): Promise<void> {
  saveStudyMaterialsToLocalStorage(materials);
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MATERIALS, 'readwrite');
      const store = tx.objectStore(STORE_MATERIALS);
      store.clear();
      for (const item of materials) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function deleteStudyMaterialFromDB(id: string): Promise<void> {
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MATERIALS, 'readwrite');
      tx.objectStore(STORE_MATERIALS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveQuizzesToDB(quizzes: Quiz[]): Promise<void> {
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUIZZES, 'readwrite');
      const store = tx.objectStore(STORE_QUIZZES);
      store.clear();
      for (const quiz of quizzes) {
        store.put(quiz);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getQuizzesFromDB(): Promise<Quiz[] | null> {
  const db = await openOfflineDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUIZZES, 'readonly');
      const store = tx.objectStore(STORE_QUIZZES);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as Quiz[]) || [];
        resolve(items.length > 0 ? items : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

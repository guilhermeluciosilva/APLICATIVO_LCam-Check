/**
 * LCam & Check - IndexedDB Wrapper (db.js)
 * Substitui localStorage para garantir persistência robusta offline.
 */
class LocalDB {
  constructor() {
    this.dbName = 'LCamCheckDB';
    this.version = 1;
    this.db = null;
    this.ready = this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = (e) => reject(e.target.error);
      
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs', { keyPath: 'id' });
        }
      };
    });
  }

  async getPhotos() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const request = store.getAll();
      request.onsuccess = () => {
        // Ordena pela data reversa (mais novas primeiro) assumindo id em formato timestamp
        const results = request.result || [];
        results.sort((a, b) => b.id.localeCompare(a.id));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async savePhoto(photo) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const request = store.put(photo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removePhoto(id) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async clearPhotos() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

window.db = new LocalDB();

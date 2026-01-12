/**
 * @fileoverview IndexedDB Storage Abstraction
 * 
 * Provides a type-safe, Promise-based wrapper around IndexedDB for
 * persistent storage that scales better than localStorage.
 * 
 * Benefits over localStorage:
 * - No 5-10MB size limit (can store hundreds of MB)
 * - Async operations don't block the main thread
 * - Supports complex queries with indexes
 * - Better suited for storing large datasets
 * 
 * @example
 * ```ts
 * const db = new IndexedDBStorage<MyData>('my-db', 'my-store');
 * await db.init();
 * await db.set('key1', { foo: 'bar' });
 * const data = await db.get('key1');
 * ```
 */

/** Database version - increment when schema changes */
const DB_VERSION = 1;

/**
 * Generic IndexedDB storage class with type safety.
 * @template T - The type of data being stored
 */
export class IndexedDBStorage<T> {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Create a new IndexedDB storage instance.
     * @param dbName - Name of the IndexedDB database
     * @param storeName - Name of the object store within the database
     */
    constructor(
        private readonly dbName: string,
        private readonly storeName: string
    ) {}

    /**
     * Initialize the database connection.
     * Safe to call multiple times - subsequent calls return the same promise.
     * @returns Promise that resolves when the database is ready
     * @throws Error if IndexedDB is not available or initialization fails
     */
    async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB is not available'));
                return;
            }

            const request = indexedDB.open(this.dbName, DB_VERSION);

            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error?.message}`));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Ensure the database is initialized before operations.
     * @throws Error if database is not initialized
     */
    private ensureDB(): IDBDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    /**
     * Get a value from the store.
     * @param key - The key to retrieve
     * @returns Promise resolving to the value, or undefined if not found
     */
    async get(key: string): Promise<T | undefined> {
        const db = this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as T | undefined);
        });
    }

    /**
     * Set a value in the store.
     * @param key - The key to store under
     * @param value - The value to store
     * @returns Promise resolving when the operation completes
     */
    async set(key: string, value: T): Promise<void> {
        const db = this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(value, key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Delete a value from the store.
     * @param key - The key to delete
     * @returns Promise resolving when the operation completes
     */
    async delete(key: string): Promise<void> {
        const db = this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Get all keys in the store.
     * @returns Promise resolving to an array of all keys
     */
    async keys(): Promise<string[]> {
        const db = this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as string[]);
        });
    }

    /**
     * Get all values in the store.
     * @returns Promise resolving to an array of all values
     */
    async getAll(): Promise<T[]> {
        const db = this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as T[]);
        });
    }

    /**
     * Clear all data from the store.
     * @returns Promise resolving when the operation completes
     */
    async clear(): Promise<void> {
        const db = this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Close the database connection.
     * Call this when you're done using the storage.
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }
}

/**
 * Create a simple key-value store with automatic initialization.
 * Convenience wrapper for single-store use cases.
 * 
 * @param dbName - Name of the database
 * @param storeName - Name of the object store
 * @returns Object with get/set/delete/clear methods
 * 
 * @example
 * ```ts
 * const store = createSimpleStore<UserSettings>('app-settings', 'settings');
 * await store.set('theme', { dark: true });
 * const theme = await store.get('theme');
 * ```
 */
export function createSimpleStore<T>(dbName: string, storeName: string) {
    const storage = new IndexedDBStorage<T>(dbName, storeName);
    let initialized = false;

    async function ensureInit() {
        if (!initialized) {
            await storage.init();
            initialized = true;
        }
    }

    return {
        async get(key: string): Promise<T | undefined> {
            await ensureInit();
            return storage.get(key);
        },
        async set(key: string, value: T): Promise<void> {
            await ensureInit();
            return storage.set(key, value);
        },
        async delete(key: string): Promise<void> {
            await ensureInit();
            return storage.delete(key);
        },
        async keys(): Promise<string[]> {
            await ensureInit();
            return storage.keys();
        },
        async getAll(): Promise<T[]> {
            await ensureInit();
            return storage.getAll();
        },
        async clear(): Promise<void> {
            await ensureInit();
            return storage.clear();
        },
        close() {
            storage.close();
            initialized = false;
        },
    };
}

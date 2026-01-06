import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('ImageCacheService');

interface CachedImage {
  url: string;
  dataUrl: string;
  timestamp: number;
}

export class ImageCacheService {
  private dbName = 'RecycleMeImageCache';
  private dbVersion = 1;
  private storeName = 'images';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  private memoryCache = new Map<string, string>();
  private failedUrls = new Set<string>();

  constructor() {
    this.initPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.initPromise) {
      this.initPromise = this.initDB();
    }
    await this.initPromise;
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  async getImageUrl(imageUrl: string | null): Promise<string | null> {
    if (!imageUrl) return null;

    // 1. Check memory cache (L1)
    if (this.memoryCache.has(imageUrl)) {
      return this.memoryCache.get(imageUrl)!;
    }

    // 2. Check failed URLs cache
    if (this.failedUrls.has(imageUrl)) {
      return null;
    }

    try {
      const db = await this.ensureDB();
      
      // 2. Try to get from IndexedDB (L2)
      const cached = await this.getFromCache(db, imageUrl);
      if (cached) {
        this.memoryCache.set(imageUrl, cached.dataUrl);
        return cached.dataUrl;
      }

      // 3. If not cached, fetch and cache
      const dataUrl = await this.fetchAndCache(db, imageUrl);
      if (dataUrl) {
        this.memoryCache.set(imageUrl, dataUrl);
        return dataUrl;
      }
      
      // 4. Fallback logic
      // If it failed to load (and was added to failedUrls), return null to hide it
      if (this.failedUrls.has(imageUrl)) {
        return null;
      }
      
      // Otherwise it might be a CORS issue (loaded but couldn't cache), so return original URL
      return imageUrl;
    } catch (error) {
      logger.error('Error getting image:', error);
      // Return original URL on error so image still shows (unless it's known to be broken)
      return this.failedUrls.has(imageUrl) ? null : imageUrl;
    }
  }

  private async getFromCache(db: IDBDatabase, url: string): Promise<CachedImage | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);

      request.onsuccess = () => {
        const cached = request.result as CachedImage | undefined;
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
          resolve(cached);
        } else {
          // Expired, delete it
          if (cached) {
            this.deleteFromCache(db, url);
          }
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async fetchAndCache(db: IDBDatabase, url: string): Promise<string | null> {
    return new Promise((resolve) => {
      // Use Image element instead of fetch to avoid CORS issues
      const img = new Image();
      
      // Try with crossOrigin first, but fallback if it fails
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          // Create a canvas to convert the image to data URL
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          // Draw the image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/png');
          
          // Cache it
          await this.saveToCache(db, url, dataUrl);
          
          resolve(dataUrl);
        } catch (error) {
          logger.warn('Error converting image to data URL (likely CORS), returning original:', error);
          // Return null to indicate caching failed, caller will use original URL
          resolve(null);
        }
      };
      
      img.onerror = (error) => {
        // If crossOrigin fails, try without it (but we can't cache it)
        if (img.crossOrigin === 'anonymous') {
          img.crossOrigin = null;
          img.src = url;
        } else {
          // Don't log error to console to avoid spamming for 404s
          // console.warn('[ImageCache] Error loading image:', error);
          this.failedUrls.add(url);
          resolve(null);
        }
      };
      
      // Start loading the image
      img.src = url;
    });
  }

  private async saveToCache(db: IDBDatabase, url: string, dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const cachedImage: CachedImage = {
        url,
        dataUrl,
        timestamp: Date.now()
      };
      const request = store.put(cachedImage);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromCache(db: IDBDatabase, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Preload images for items (call on app startup)
  async preloadImages(imageUrls: (string | null)[]): Promise<void> {
    const validUrls = imageUrls.filter((url): url is string => url !== null);
    const uniqueUrls = [...new Set(validUrls)];
    
    logger.log(`[ImageCache] Preloading ${uniqueUrls.length} images...`);
    
    // Load in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      // Use Promise.all with catch to handle errors gracefully (similar to allSettled)
      await Promise.all(batch.map(url => this.getImageUrl(url).catch(() => null)));
      logger.log(`[ImageCache] Preloaded ${Math.min(i + batchSize, uniqueUrls.length)}/${uniqueUrls.length} images`);
    }
    
    logger.log('[ImageCache] Preloading complete');
  }

  // Clear old cache entries
  async clearExpiredCache(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(Date.now() - this.cacheExpiry);
      
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      logger.error('Error clearing expired cache:', error);
    }
  }
}

// Singleton instance
export const imageCacheService = new ImageCacheService();


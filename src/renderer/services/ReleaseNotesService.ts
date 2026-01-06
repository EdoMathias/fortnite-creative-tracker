import { createLogger } from '../../shared/services/Logger';

export interface ReleaseNoteEntry {
  important: boolean;
  version: string;
  html: string;
  timestamp: number;
}

interface ReleaseNotesApiResponse {
  versions?: ReleaseNoteEntry[];
  meta?: {
    perPage?: number;
  };
}

export const RELEASE_NOTES_STORAGE_KEY = 'recycleme_release_notes_viewed';

const RELEASE_NOTES_BASE_URL = 'https://console-api.overwolf.com/v1/apps';
const RELEASE_NOTES_APP_ID = 'flicmkjhlmjkhfjngkcggjhmddjneknbadaelkbh';
const MAX_RELEASE_NOTES_PAGES = 4;

interface ViewedReleaseNotePayload {
  version: string;
  timestamp: number;
  viewedAt: number;
}

class ReleaseNotesService {
  private readonly logger = createLogger('ReleaseNotesService');

  async getReleaseNoteForVersion(version: string): Promise<ReleaseNoteEntry | null> {
    if (!version) {
      return null;
    }

    for (let page = 0; page <= MAX_RELEASE_NOTES_PAGES; page += 1) {
      const entries = await this.fetchReleaseNotes(version, page);
      const match = entries.find(entry => entry.version === version);

      if (match) {
        return match;
      }

      if (entries.length === 0) {
        break;
      }
    }

    return null;
  }

  hasViewedReleaseNote(entry: ReleaseNoteEntry | null): boolean {
    if (!entry) {
      return false;
    }

    const payload = this.getViewedPayload();
    if (!payload) {
      return false;
    }

    return payload.version === entry.version && payload.timestamp === entry.timestamp;
  }

  markReleaseNotesViewed(entry: ReleaseNoteEntry): void {
    try {
      const payload: ViewedReleaseNotePayload = {
        version: entry.version,
        timestamp: entry.timestamp,
        viewedAt: Date.now()
      };

      localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new Event('localStorageChange'));
    } catch (error) {
      this.logger.error('Failed to persist release notes viewed state', error);
    }
  }

  private async fetchReleaseNotes(version: string, page: number): Promise<ReleaseNoteEntry[]> {
    const encodedVersion = encodeURIComponent(version);
    const url = `${RELEASE_NOTES_BASE_URL}/${RELEASE_NOTES_APP_ID}/versions/${encodedVersion}/release-notes/${page}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Release notes request failed with status ${response.status}`);
      }

      const data: ReleaseNotesApiResponse = await response.json();
      if (!Array.isArray(data.versions)) {
        return [];
      }

      return data.versions.filter(entry => Boolean(entry.html));
    } catch (error) {
      this.logger.error('Failed to fetch release notes', { url, error });
      return [];
    }
  }

  private getViewedPayload(): ViewedReleaseNotePayload | null {
    try {
      const rawValue = localStorage.getItem(RELEASE_NOTES_STORAGE_KEY);
      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as ViewedReleaseNotePayload;
    } catch (error) {
      this.logger.warn('Failed to parse stored release notes viewed payload', error);
      return null;
    }
  }
}

export const releaseNotesService = new ReleaseNotesService();


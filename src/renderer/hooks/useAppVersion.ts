import { useEffect, useState } from "react";
import { createLogger } from "../../shared/services/Logger";

const logger = createLogger('useAppVersion');

export const useAppVersion = (): string | null => {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // Get manifest information for displaying the app version
  useEffect(() => {
    try {
      overwolf.extensions.current.getManifest((manifest: overwolf.extensions.Manifest | undefined) => {
        const version = manifest?.meta?.version;
        if (version) {
          setAppVersion(version);
        } else {
          logger.warn('Manifest did not include a version value');
        }
      });
    } catch (error) {
      logger.error('Failed to load manifest version', error);
    }
  }, []);

  return appVersion;
};
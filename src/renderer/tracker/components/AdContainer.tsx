import React, { useEffect, useRef } from 'react';
import { createLogger } from '../../../shared/services/Logger';
import { useFTUE } from '../../contexts/FTUEContext';

const logger = createLogger('AdContainer');

interface AdContainerProps {
  width: number;
  height: number;
  className?: string;
}

// Helper function to wait for OwAd to be available
const waitForOwAd = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if OwAd is already available
    if (typeof (window as any).OwAd !== 'undefined') {
      resolve((window as any).OwAd);
      return;
    }

    // Wait for it to become available (check every 100ms)
    const checkInterval = setInterval(() => {
      if (typeof (window as any).OwAd !== 'undefined') {
        clearInterval(checkInterval);
        resolve((window as any).OwAd);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('OwAd SDK failed to load'));
    }, 10000);
  });
};

export const AdContainer: React.FC<AdContainerProps> = ({ width, height, className = '' }) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const hiddenElementsRef = useRef<HTMLElement[]>([]);
  const { isFTUEComplete } = useFTUE();

  useEffect(() => {
    if (!isFTUEComplete) {
      logger.debug('Delaying ad initialization until FTUE is complete', { width, height });
      return;
    }

    let owAdInstance: any = null;
    let isMounted = true;
    const eventHandlers: Array<{ event: string; handler: (eventData: any) => void }> = [];
    let handleHighImpactAdLoaded: (() => void) | null = null;
    let handleHighImpactAdRemoved: (() => void) | null = null;
    let enableHighImpactForInstance = false;

    const initializeAd = async () => {
      try {
        // Wait for OwAd to be available
        const OwAd = await waitForOwAd();
        
        if (!isMounted || !adContainerRef.current) {
          return;
        }

        // Enable high impact ads only for 400x600 ad container
        const enableHighImpact = width === 400 && height === 600;
        enableHighImpactForInstance = enableHighImpact;

        const owAdOptions = {
          size: {
            width: width,
            height: height,
          },
          containerId: `${width}x${height}-ad`,
          enableHighImpact: enableHighImpact,
        };

        // @ts-ignore
        owAdInstance = new OwAd(
          adContainerRef.current,
          owAdOptions
        );
        logger.log('OwAd instance initialized', { width, height, enableHighImpact });

        // Handle high impact ad events
        handleHighImpactAdLoaded = () => {
          if (!enableHighImpact || !adContainerRef.current) return;
          logger.log('High impact ad loaded', { width, height });

            // Set ad container to 100% width and height for high impact ad
            adContainerRef.current.style.width = '100%';
            adContainerRef.current.style.height = '100%';

          // Find the parent ad zone (tracker-ad-sidebar)
          const parentAdZone = adContainerRef.current.parentElement;
          if (!parentAdZone) return;

          // Store and hide all sibling containers except the current one
          hiddenElementsRef.current = [];
          Array.from(parentAdZone.children).forEach((child) => {
            if (child !== adContainerRef.current && child instanceof HTMLElement) {
              hiddenElementsRef.current.push(child);
              child.style.display = 'none';
            }
          });
        };

        handleHighImpactAdRemoved = () => {
          if (!enableHighImpact || !adContainerRef.current) return;
          logger.log('High impact ad removed', { width, height });

          // Restore ad container to original size
          adContainerRef.current.style.width = `${width}px`;
          adContainerRef.current.style.height = `${height}px`;

          // Remove 100% width and height styles from inner div to allow regular ads to play
          adContainerRef.current.style.width = '';
          adContainerRef.current.style.height = '';

          // Restore all previously hidden elements
          hiddenElementsRef.current.forEach((element) => {
            element.style.display = '';
          });
          hiddenElementsRef.current = [];
        };

        // Add event listeners for high impact ad events
        if (enableHighImpact) {
          owAdInstance.addEventListener('high-impact-ad-loaded', handleHighImpactAdLoaded);
          owAdInstance.addEventListener('high-impact-ad-removed', handleHighImpactAdRemoved);
        }

        const interestingEvents = [
          'player_loaded',
          'display_ad_loaded',
          'play',
          'impression',
          'complete',
          'error',
          'display_ad_play',
          'player_inventory',
          'video_ad_skipped',
          'house_ad_action',
          'overwolf_ad_iframe_loaded',
        ];

        interestingEvents.forEach(event => {
          const handler = (eventData: any) => {
            logger.debug(`Ad event: ${event}`, eventData);
          };
          eventHandlers.push({ event, handler });
          owAdInstance.addEventListener(event, handler);
        });
      } catch (error) {
        logger.error('Failed to initialize OwAd:', error);
        // Don't crash the app if ads fail to load
      }
    };

    initializeAd();

    return () => {
      isMounted = false;
      
      // Restore hidden elements on cleanup
      if (hiddenElementsRef.current.length > 0 && adContainerRef.current) {
        hiddenElementsRef.current.forEach((element) => {
          element.style.display = '';
        });
        hiddenElementsRef.current = [];
      }

      if (owAdInstance) {
        try {
          if (enableHighImpactForInstance && handleHighImpactAdLoaded && handleHighImpactAdRemoved) {
            owAdInstance.removeEventListener('high-impact-ad-loaded', handleHighImpactAdLoaded);
            owAdInstance.removeEventListener('high-impact-ad-removed', handleHighImpactAdRemoved);
            logger.debug('Removed high impact ad listeners');
          }

          eventHandlers.forEach(({ event, handler }) => {
            owAdInstance.removeEventListener(event, handler);
          });
          logger.log('OwAd instance cleaned up', { width, height });
        } catch (error) {
          logger.error('Error cleaning up ad instance:', error);
        }
      }
    };
  }, [width, height, isFTUEComplete]);

  return (
    <div
      ref={adContainerRef}
      className={`tracker-ad-container-base ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};


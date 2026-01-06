import { useState, useEffect, useRef } from 'react';
import { imageCacheService } from '../services/ImageCacheService';
import { createLogger } from '../services/Logger';

const logger = createLogger('useItemImage');

export const useItemImage = (imageUrl: string | null, lazy = true) => {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(!lazy);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' } // Start loading slightly before it comes into view
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!imageUrl) {
      setCachedUrl(null);
      setIsLoading(false);
      return;
    }

    if (!isVisible) {
      return;
    }

    setIsLoading(true);
    imageCacheService.getImageUrl(imageUrl)
      .then(url => {
        setCachedUrl(url);
        setIsLoading(false);
      })
      .catch(error => {
        logger.error('Error loading image:', error);
        // Don't display image on error
        setCachedUrl(null);
        setIsLoading(false);
      });
  }, [imageUrl, isVisible]);

  return { imageUrl: cachedUrl, isLoading, elementRef };
};


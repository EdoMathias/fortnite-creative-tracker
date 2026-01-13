import React, { useState, useEffect } from 'react';
import { HotkeyData, kHotkeys } from '../../../../../shared/consts';
import { createLogger } from '../../../../../shared/services/Logger';
import { HotkeysAPI } from '../../../../../shared/services/hotkeys';

const logger = createLogger('HotkeysWidget');

/**
 * Format hotkey binding for display
 * The binding from Overwolf API is already formatted (e.g., "Ctrl+F3")
 * We just need to replace '+' with ' + ' for better readability
 */
const formatHotkeyBinding = (hotkey: HotkeyData): string => {
  if (hotkey.binding) {
    // Replace '+' with ' + ' for better spacing
    return hotkey.binding.replace(/\+/g, ' + ');
  }
  return 'Not set';
};

const HotkeysWidget: React.FC = () => {
  const [hotkeys, setHotkeys] = useState<HotkeyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        setLoading(true);
        const hotkeysMap = await HotkeysAPI.fetchAll();
        const appHotkeys = Array.from(hotkeysMap.values())
          .filter(h => Object.values(kHotkeys).includes(h.name))
          .map(h => {
            // IHotkey has a binding property that's a human-readable string like "Ctrl+F3"
            // Use it directly - Overwolf API provides this formatted string
            const binding = h.binding || '';
            
            // Convert IHotkey to HotkeyData format
            const hotkeyData: HotkeyData = {
              name: h.name,
              title: h.title || h.name,
              binding: binding,
              modifiers: {
                alt: false,
                control: false,
                shift: false
              } as any,
              virtualKeycode: h.virtualKeycode || 0
            };
            return hotkeyData;
          });
        
        setHotkeys(appHotkeys);
        logger.debug('Loaded hotkeys for widget', { count: appHotkeys.length });
      } catch (error) {
        logger.error('Error loading hotkeys:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHotkeys();

    // Listen for hotkey changes
    const handleHotkeyChange = () => {
      loadHotkeys();
    };
    
    overwolf.settings.hotkeys.onChanged.addListener(handleHotkeyChange);

    return () => {
      overwolf.settings.hotkeys.onChanged.removeListener(handleHotkeyChange);
    };
  }, []);

  return (
    <div className="widget hotkeys-widget">
      <div className="widget-header">
        <h3>Hotkeys</h3>
      </div>
      <div className="widget-content">
        {loading ? (
          <div className="widget-empty-state">Loading hotkeys...</div>
        ) : hotkeys.length === 0 ? (
          <div className="widget-empty-state">No hotkeys configured</div>
        ) : (
          <div className="hotkeys-list">
            {hotkeys.map((hotkey) => (
              <div key={hotkey.name} className="hotkey-item">
                <div className="hotkey-label">{hotkey.title}</div>
                <div className="hotkey-binding">{formatHotkeyBinding(hotkey)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotkeysWidget;

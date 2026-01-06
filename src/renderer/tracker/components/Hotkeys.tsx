import React, { useEffect, useState } from 'react';
import AnyTypeInput from '../../components/AnyTypeInput';
import { HotkeysService } from '../../../main/services/HotkeysService';
import { HotkeyData, kHotkeys } from '../../../shared/consts';
import { createLogger } from '../../../shared/services/Logger';

const logger = createLogger('HotkeysSettings');

// DOM spec constant for KeyboardEvent.DOM_KEY_LOCATION_NUMPAD.
const NUMPAD_LOCATION = 3;

const SHIFTED_DIGIT_MAP: Record<string, string> = {
  '!': 'Digit1',
  '@': 'Digit2',
  '#': 'Digit3',
  '$': 'Digit4',
  '%': 'Digit5',
  '^': 'Digit6',
  '&': 'Digit7',
  '*': 'Digit8',
  '(': 'Digit9',
  ')': 'Digit0',
};

const SYMBOL_CODE_MAP: Record<string, string> = {
  '-': 'Minus',
  '_': 'Minus',
  '=': 'Equal',
  '+': 'Equal',
  '[': 'BracketLeft',
  '{': 'BracketLeft',
  ']': 'BracketRight',
  '}': 'BracketRight',
  '\\': 'Backslash',
  '|': 'Backslash',
  ';': 'Semicolon',
  ':': 'Semicolon',
  "'": 'Quote',
  '"': 'Quote',
  ',': 'Comma',
  '<': 'Comma',
  '.': 'Period',
  '>': 'Period',
  '/': 'Slash',
  '?': 'Slash',
  '`': 'Backquote',
  '~': 'Backquote',
  ' ': 'Space',
};

const NAMED_KEY_MAP: Record<string, string> = {
  Escape: 'Escape',
  Esc: 'Escape',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Enter: 'Enter',
  Return: 'Enter',
  Space: 'Space',
  Spacebar: 'Space',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  CapsLock: 'CapsLock',
  ScrollLock: 'ScrollLock',
  Pause: 'Pause',
  Break: 'Pause',
};

const NUMPAD_SYMBOL_MAP: Record<string, string> = {
  '+': 'NumpadAdd',
  '-': 'NumpadSubtract',
  '*': 'NumpadMultiply',
  '/': 'NumpadDivide',
  Enter: 'NumpadEnter',
  Decimal: 'NumpadDecimal',
  '.': 'NumpadDecimal',
};

const fallbackCodeFromKeyEvent = (event: React.KeyboardEvent<HTMLInputElement>): string | null => {
  const key = event.key;
  if (!key) {
    return null;
  }

  if (/^F\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }

  const location = event.nativeEvent?.location ?? 0;

  if (location === NUMPAD_LOCATION) {
    if (/^\d$/.test(key)) {
      return `Numpad${key}`;
    }
    if (NUMPAD_SYMBOL_MAP[key]) {
      return NUMPAD_SYMBOL_MAP[key];
    }
  }

  if (SHIFTED_DIGIT_MAP[key]) {
    return SHIFTED_DIGIT_MAP[key];
  }

  if (/^\d$/.test(key)) {
    return `Digit${key}`;
  }

  if (/^[a-z]$/i.test(key)) {
    return `Key${key.toUpperCase()}`;
  }

  if (SYMBOL_CODE_MAP[key]) {
    return SYMBOL_CODE_MAP[key];
  }

  if (NAMED_KEY_MAP[key]) {
    return NAMED_KEY_MAP[key];
  }

  return null;
};

/**
 * HotKeysSettings component allows users to configure hotkeys for various actions.
 * It provides an input field where users can set a hotkey by pressing the desired key combination.
 */
const HotKeysSettings = () => {
  const [hotkeys, setHotkeys] = useState<overwolf.settings.hotkeys.IHotkey[]>([]);
  const [error, setError] = useState<{ hotkeyName: string; message: string } | null>(null);
  const [originalMap, setOriginalMap] = useState<Record<string, string>>({});

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, hotkeyName: string) => {
    e.preventDefault();
    e.stopPropagation();

    const mods: string[] = [];

    if (e.ctrlKey && !mods.includes('Ctrl')) mods.push('Ctrl');
    if (e.altKey && !mods.includes('Alt')) mods.push('Alt');
    if (e.shiftKey && !mods.includes('Shift')) mods.push('Shift');
    if (e.metaKey && !mods.includes('Meta')) mods.push('Meta');

    const hotkeyString = mods.join('+');
    e.currentTarget.value = hotkeyString;

    const hasModifier = e.altKey || e.ctrlKey || e.shiftKey || e.metaKey;

    // Prefer e.code, but when the browser cannot provide it (in-game overlay focus issues)
    // derive the value from e.key for modifier combinations.
    let keyCode = e.code;
    if ((!keyCode || keyCode === 'Unidentified') && hasModifier) {
      keyCode = fallbackCodeFromKeyEvent(e);
    }

    const ignoredCodes = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'];

    if (!keyCode) {
      logger.warn('Unable to resolve key code for hotkey assignment', {
        hotkeyName,
        key: e.key,
        mods,
      });
      return;
    }

    if (!ignoredCodes.includes(keyCode)) {
      const normalizedKey = normalizeKeyFromCode(keyCode);
      if (normalizedKey) {
        mods.push(normalizedKey);

        logger.log('Hotkey pressed:', { hotkeyName, keyCode, normalizedKey, mods });

        const hotkeyAsString = mods.join('+');
        e.currentTarget.value = hotkeyAsString;

        hotkeyBuilder(hotkeyName, hotkeyAsString, keyCode);

        // Close editing
        e.currentTarget.blur();
      }
    }
  };

  const hotkeyBuilder = (hotkeyName: string, hotkeyCombination: string, keyCode: string) => {
    // Check if already taken
    if (isHotkeyTaken(hotkeyCombination, hotkeyName)) {
      const takenBy = hotkeys.find(h => h.binding === hotkeyCombination && h.name !== hotkeyName);
      const errorMessage = takenBy
        ? `This hotkey is already assigned to "${takenBy.title}".`
        : 'This hotkey is already assigned to another action.';

      setError({ hotkeyName, message: errorMessage });

      // Restore original value in the UI
      const input = document.getElementById(hotkeyName) as HTMLInputElement;
      const original = originalMap[hotkeyName] || hotkeys.find(h => h.name === hotkeyName)?.binding || '';
      if (input) input.value = original;

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);

      return;
    }

    // Clear previous errors
    setError(null);

    const parts = hotkeyCombination.split('+');
    // Get virtual keycode from the key code (e.code), not from the display string
    const keyCodeNum = getVirtualKeycode(keyCode);

    // Safety check: if we can't map the key code, don't assign the hotkey
    if (keyCodeNum === 0) {
      logger.error('Unknown key code, cannot assign hotkey:', keyCode);
      setError({ hotkeyName, message: `Unsupported key: ${keyCode}. Please try a different key.` });
      
      // Restore original value in the UI
      const input = document.getElementById(hotkeyName) as HTMLInputElement;
      const original = originalMap[hotkeyName] || hotkeys.find(h => h.name === hotkeyName)?.binding || '';
      if (input) input.value = original;

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }

    const modifiers: overwolf.settings.hotkeys.HotkeyModifiers = {
      alt: parts.includes('Alt'),
      ctrl: parts.includes('Ctrl'),
      shift: parts.includes('Shift'),
    };

    const hotkeyObject: HotkeyData = {
      name: hotkeyName,
      title: hotkeyName,
      binding: hotkeyCombination,
      modifiers: modifiers,
      virtualKeycode: keyCodeNum,
    };

    HotkeysService.instance().updateHotkey(hotkeyObject)
      .then(() => {
        logger.log('Hotkey updated', { hotkeyName, binding: hotkeyCombination });
        // Success - refresh hotkeys
        HotkeysService.instance().fetchAllHotkeys().then(hotkeysMap => {
          const appHotkeys = Array.from(hotkeysMap.values()).filter(h =>
            Object.values(kHotkeys).includes(h.name)
          );
          setHotkeys(appHotkeys);
          logger.log('Hotkeys reloaded after update', { count: appHotkeys.length });
        });
      })
      .catch((err) => {
        logger.error('Error updating hotkey:', err);
        setError({ hotkeyName, message: err || 'Failed to assign hotkey' });
        
        // Restore original value in the UI
        const input = document.getElementById(hotkeyName) as HTMLInputElement;
        const original = originalMap[hotkeyName] || hotkeys.find(h => h.name === hotkeyName)?.binding || '';
        if (input) input.value = original;

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setError(null);
        }, 5000);
      });
  };

  /**
   * Normalize key code (e.code) to display name
   * e.g., "Digit2" -> "2", "KeyA" -> "A"
   */
  const normalizeKeyFromCode = (code: string): string | null => {
    // Handle digit keys (Digit0-Digit9)
    if (code.startsWith('Digit')) {
      return code.replace('Digit', '');
    }

    // Handle letter keys (KeyA-KeyZ)
    if (code.startsWith('Key')) {
      return code.replace('Key', '').toUpperCase();
    }

    // Handle special keys
    const specials: Record<string, string> = {
      'Space': 'Space',
      'Escape': 'Esc',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Insert': 'Insert',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'Numpad0': 'Numpad0',
      'Numpad1': 'Numpad1',
      'Numpad2': 'Numpad2',
      'Numpad3': 'Numpad3',
      'Numpad4': 'Numpad4',
      'Numpad5': 'Numpad5',
      'Numpad6': 'Numpad6',
      'Numpad7': 'Numpad7',
      'Numpad8': 'Numpad8',
      'Numpad9': 'Numpad9',
      'NumpadAdd': 'Numpad+',
      'NumpadSubtract': 'Numpad-',
      'NumpadMultiply': 'Numpad*',
      'NumpadDivide': 'Numpad/',
      'NumpadEnter': 'NumpadEnter',
      'NumpadDecimal': 'Numpad.',
      'F1': 'F1',
      'F2': 'F2',
      'F3': 'F3',
      'F4': 'F4',
      'F5': 'F5',
      'F6': 'F6',
      'F7': 'F7',
      'F8': 'F8',
      'F9': 'F9',
      'F10': 'F10',
      'F11': 'F11',
      'F12': 'F12',
      'BracketLeft': '[',
      'BracketRight': ']',
      'Backslash': '\\',
      'Semicolon': ';',
      'Quote': "'",
      'Comma': ',',
      'Period': '.',
      'Slash': '/',
      'Backquote': '`',
      'Minus': '-',
      'Equal': '=',
    };

    return specials[code] || null;
  };

  /**
   * Convert key code (e.code) to Windows virtual keycode
   * Maps physical keys to VK codes used by Overwolf
   */
  const getVirtualKeycode = (code: string): number => {
    // Digits: Digit0-Digit9 -> VK_0 (0x30) to VK_9 (0x39) = 48-57
    if (code.startsWith('Digit')) {
      const digit = parseInt(code.replace('Digit', ''));
      return 48 + digit; // '0' = 48, '1' = 49, etc.
    }

    // Letters: KeyA-KeyZ -> VK_A (0x41) to VK_Z (0x5A) = 65-90
    if (code.startsWith('Key')) {
      const letter = code.replace('Key', '').toUpperCase();
      return letter.charCodeAt(0); // 'A' = 65, 'B' = 66, etc.
    }

    // Special keys mapping
    const vkMap: Record<string, number> = {
      'Space': 32,        // VK_SPACE
      'Escape': 27,       // VK_ESCAPE
      'Enter': 13,        // VK_RETURN
      'Tab': 9,           // VK_TAB
      'Backspace': 8,     // VK_BACK
      'Delete': 46,       // VK_DELETE
      'Insert': 45,       // VK_INSERT
      'Home': 36,         // VK_HOME
      'End': 35,          // VK_END
      'PageUp': 33,       // VK_PRIOR
      'PageDown': 34,     // VK_NEXT
      'ArrowUp': 38,      // VK_UP
      'ArrowDown': 40,    // VK_DOWN
      'ArrowLeft': 37,    // VK_LEFT
      'ArrowRight': 39,   // VK_RIGHT
      'Numpad0': 96,      // VK_NUMPAD0
      'Numpad1': 97,      // VK_NUMPAD1
      'Numpad2': 98,      // VK_NUMPAD2
      'Numpad3': 99,      // VK_NUMPAD3
      'Numpad4': 100,     // VK_NUMPAD4
      'Numpad5': 101,     // VK_NUMPAD5
      'Numpad6': 102,     // VK_NUMPAD6
      'Numpad7': 103,     // VK_NUMPAD7
      'Numpad8': 104,     // VK_NUMPAD8
      'Numpad9': 105,     // VK_NUMPAD9
      'NumpadAdd': 107,   // VK_ADD
      'NumpadSubtract': 109, // VK_SUBTRACT
      'NumpadMultiply': 106, // VK_MULTIPLY
      'NumpadDivide': 111,   // VK_DIVIDE
      'NumpadEnter': 13,     // VK_RETURN (same as Enter)
      'NumpadDecimal': 110,   // VK_DECIMAL
      'F1': 112,          // VK_F1
      'F2': 113,          // VK_F2
      'F3': 114,          // VK_F3
      'F4': 115,          // VK_F4
      'F5': 116,          // VK_F5
      'F6': 117,          // VK_F6
      'F7': 118,          // VK_F7
      'F8': 119,          // VK_F8
      'F9': 120,          // VK_F9
      'F10': 121,         // VK_F10
      'F11': 122,         // VK_F11
      'F12': 123,         // VK_F12
      'BracketLeft': 219,  // VK_OEM_4 (usually [)
      'BracketRight': 221, // VK_OEM_6 (usually ])
      'Backslash': 220,    // VK_OEM_5 (usually \)
      'Semicolon': 186,    // VK_OEM_1 (usually ;)
      'Quote': 222,        // VK_OEM_7 (usually ')
      'Comma': 188,        // VK_OEM_COMMA
      'Period': 190,       // VK_OEM_PERIOD
      'Slash': 191,        // VK_OEM_2 (usually /)
      'Backquote': 192,    // VK_OEM_3 (usually `)
      'Minus': 189,        // VK_OEM_MINUS (usually -)
      'Equal': 187,        // VK_OEM_PLUS (usually =)
    };

    return vkMap[code] || 0;
  };

  const isHotkeyTaken = (combination: string, exceptName?: string): boolean => {
    return hotkeys.some(h => h.name !== exceptName && h.binding === combination);
  };

  useEffect(() => {
    const loadHotkeys = async () => {
      const hotkeysMap = await HotkeysService.instance().fetchAllHotkeys();
      logger.log('Hotkeys map:', hotkeysMap);
      const appHotkeys = Array.from(hotkeysMap.values()).filter(h =>
        Object.values(kHotkeys).includes(h.name)
      );
      setHotkeys(appHotkeys);
      logger.log('Loaded tracker hotkeys', { count: appHotkeys.length });
    };

    loadHotkeys();
  }, []);

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Hotkeys</h3>

      <div className="hotkeys-list">
        {hotkeys.map((hotkey) => (
          <div key={hotkey.name} className="hotkey-item">
            <AnyTypeInput
              id={hotkey.name}
              className="hotkey-input"
              labelText={hotkey.title}
              defaultValue={hotkey.binding || ''}

              onFocus={(e) => {
                // Save original value
                const original = hotkeys.find(h => h.name === hotkey.name)?.binding || '';
                setOriginalMap(prev => ({ ...prev, [hotkey.name]: original }));

                e.currentTarget.value = '';

                // Clear error for this hotkey
                if (error?.hotkeyName === hotkey.name) {
                  setError(null);
                }
              }}

              onBlur={(e) => {
                const current = e.currentTarget.value.trim();
                if (!current) {
                  // Restore the original binding
                  const original = originalMap[hotkey.name] || hotkeys.find(h => h.name === hotkey.name)?.binding || '';
                  e.currentTarget.value = original;
                }

                // Clean editing state
                setOriginalMap(prev => {
                  const updated = { ...prev };
                  delete updated[hotkey.name];
                  return updated;
                });
              }}

              onKeyDown={(evt) => handleKeyDown(evt, hotkey.name)}
            />

            {error?.hotkeyName === hotkey.name && (
              <div className="hotkey-error">
                {error.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotKeysSettings;

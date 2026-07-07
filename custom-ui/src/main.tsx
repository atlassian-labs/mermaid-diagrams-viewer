import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import { AdminPanel } from './admin.tsx';
import { DiagramConfig } from './config.tsx';
import { view, invoke } from '@forge/bridge';
import { useThemeObserver } from '@atlaskit/tokens';
import mermaid from 'mermaid';
import { IconifyJSON } from '@iconify/types';
import elkLayouts from '@mermaid-js/layout-elk';
import '@atlaskit/css-reset';

function unwrapInvoke<T>(res: T | { body: T }): T {
  if (res !== null && typeof res === 'object' && 'body' in res) {
    return res.body;
  }
  return res;
}

// Enable Atlaskit theme and register mermaid layout loaders once at startup.
// mermaid.initialize() with base config runs here so detectType() in
// code-blocks/index.ts works before any React component mounts.
void view.theme.enable();
mermaid.registerLayoutLoaders(elkLayouts);

// Dynamically register icon packs from the Forge Object Store.
// Returns an empty array if no packs have been seeded yet (diagrams still
// render, just without custom icons).
await invoke<string[]>('listIconPacks')
  .then((res) => {
    const packNames = unwrapInvoke(res);
    if (!Array.isArray(packNames) || packNames.length === 0) return;

    mermaid.registerIconPacks(
      packNames.map((name: string) => ({
        name,
        loader: async () => {
          const urlRes = await invoke<string>('getIconPackUrl', { pack: name });
          const resp = await fetch(unwrapInvoke(urlRes));
          if (!resp.ok) {
            throw new Error(
              `Failed to fetch icon pack "${name}": ${String(resp.status)} ${resp.statusText}`,
            );
          }
          return resp.json() as Promise<IconifyJSON>;
        },
      })),
    );
  })
  .catch(() => {
    // Ignore icon pack errors; diagrams can still render without custom icons.
  });
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'antiscript',
});

type AppMode = 'viewer' | 'config' | 'admin' | 'loading';
type ColorMode = 'light' | 'dark';

function initMermaidTheme(colorMode: ColorMode) {
  const theme = colorMode === 'dark' ? 'dark' : 'default';
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'antiscript',
    theme,
    darkMode: colorMode === 'dark',
    themeVariables: { darkMode: colorMode === 'dark' },
  });
}

function Root() {
  const [mode, setMode] = useState<AppMode>('loading');
  const { colorMode } = useThemeObserver();
  useEffect(() => {
    view
      .getContext()
      .then((context) => {
        if (context.extension.type === 'confluence:globalSettings') {
          setMode('admin');
          return;
        }
        // Forge sets extension.macro.isConfiguring = true when the macro
        // config dialog is open (both on insert and on edit of existing macro).
        const ext = context.extension as {
          macro?: { isConfiguring?: boolean };
        };
        const isConfig = ext.macro?.isConfiguring === true;
        setMode(isConfig ? 'config' : 'viewer');
      })
      .catch(() => {
        setMode('viewer');
      });
  }, []);

  // Re-initialize mermaid theme whenever colorMode changes so the next
  // diagram render always picks up the correct theme without a blink.
  useEffect(() => {
    if (!colorMode) {
      return;
    }
    initMermaidTheme(colorMode);
  }, [colorMode]);

  if (mode === 'loading') {
    return null;
  }

  if (!colorMode) {
    return null;
  }

  if (mode === 'admin') {
    return <AdminPanel />;
  }

  if (mode === 'config') {
    return <DiagramConfig />;
  }

  return <App colorMode={colorMode} />;
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

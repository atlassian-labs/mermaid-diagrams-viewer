import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import { DiagramConfig } from './config.tsx';
import { view } from '@forge/bridge';
import '@atlaskit/css-reset';

type AppMode = 'viewer' | 'config' | 'loading';

function Root() {
  const [mode, setMode] = useState<AppMode>('loading');

  useEffect(() => {
    view
      .getContext()
      .then((context) => {
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

  if (mode === 'loading') {
    return null;
  }

  if (mode === 'config') {
    return <DiagramConfig />;
  }

  return <App />;
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

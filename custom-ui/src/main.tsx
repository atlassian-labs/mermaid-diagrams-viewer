import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import '@atlaskit/css-reset';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import mermaid from 'mermaid';
import SVG from 'react-inlinesvg';

mermaid.mermaidAPI.initialize({ startOnLoad: false });

async function fetchSVG() {
  const file = await invoke<string>('getFile', {});
  const svg = await mermaid.mermaidAPI.renderAsync('test', file);
  return svg;
}

function App() {
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSVG().then(setData).catch(setError);
  }, []);

  const loadingMessage = !data && !error ? 'Loading...' : null;
  const errorComponent = error;
  const dataComponent = data ? <SVG src={data} /> : null;

  return (
    <div>
      {loadingMessage}
      {errorComponent}
      {dataComponent}
    </div>
  );
}

export default App;

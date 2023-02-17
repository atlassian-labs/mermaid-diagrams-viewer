import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import mermaid from 'mermaid';
import SVG from 'react-inlinesvg';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Banner from '@atlaskit/banner';
import WarningIcon from '@atlaskit/icon/glyph/warning';

mermaid.mermaidAPI.initialize({ startOnLoad: false });

async function fetchSVG() {
  const response = await invoke<ErrorResponse | SuccessResponse<string>>(
    'getFile',
    {}
  );
  const file = processResponse(response);
  const svg = await mermaid.mermaidAPI.renderAsync('test', file);
  return svg;
}

function renderDiagram(svg: string) {
  return (
    <TransformWrapper>
      <TransformComponent
        wrapperStyle={{ width: 'auto' }}
        contentStyle={{ width: 'auto' }}
      >
        <SVG src={svg} />
      </TransformComponent>
    </TransformWrapper>
  );
}

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

type SuccessResponse<T = any> = {
  data: T;
};

class ServerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

function processResponse<T>(response: ErrorResponse | SuccessResponse<T>) {
  if ('error' in response) {
    throw new ServerError(response.error.message, response.error.code);
  }
  return response.data;
}

const ErrorMessage: React.FunctionComponent<{ error?: Error }> = (props) => {
  if (!props.error) {
    return null;
  }

  return (
    <Banner
      appearance="warning"
      icon={<WarningIcon label="" secondaryColor="inherit" />}
    >
      {props.error.message}
    </Banner>
  );
};

function App() {
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<ServerError | undefined>(undefined);

  useEffect(() => {
    fetchSVG()
      .then(setData)
      .catch((error) => {
        if (error instanceof ServerError) {
          return setError(error);
        }
        throw error;
      });
  }, []);

  const loadingMessage = !data && !error ? 'Loading...' : null;
  const dataComponent = data ? renderDiagram(data) : null;

  return (
    <div>
      {loadingMessage}
      {dataComponent}
      <ErrorMessage error={error} />
    </div>
  );
}

export default App;

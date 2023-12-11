import React, { useEffect, useState } from 'react';
import Banner from '@atlaskit/banner';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Spinner from '@atlaskit/spinner';
import { getCode, ServerError } from './api';
import { Diagram } from './diagram';

const ErrorMessage: React.FunctionComponent<{ error?: Error }> = (props) => {
  if (!props.error) {
    return null;
  }
  const msg = `Error while loading diagram: ${props.error.message}`;

  return (
    <Banner
      appearance="warning"
      icon={<WarningIcon label="" secondaryColor="inherit" />}
    >
      {msg}
    </Banner>
  );
};

const Loading: React.FunctionComponent<{ loading?: boolean }> = (props) => {
  if (!props.loading) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Spinner size="large" />
    </div>
  );
};

function App() {
  const [code, setCode] = useState<string | undefined>();

  useEffect(() => {
    getCode()
      .then(setCode)
      .catch((error) => {
        if (error instanceof ServerError) {
          setError(error);
          return;
        }
        throw error;
      });
  }, []);

  const [error, setError] = useState<ServerError | undefined>();

  const onError = (error: ServerError) => {
    setError(error);
  };

  return (
    <div style={{ minHeight: '150px' }}>
      <Loading loading={!code && !error} />
      <Diagram code={code} onError={onError} />
      <ErrorMessage error={error} />
    </div>
  );
}

export default App;

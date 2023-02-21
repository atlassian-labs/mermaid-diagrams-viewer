import React, { useEffect, useState } from 'react';
import Banner from '@atlaskit/banner';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Spinner from '@atlaskit/spinner';
import { getFile, ServerError } from './api';
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
  const [file, setFile] = useState<string | undefined>();

  useEffect(() => {
    getFile()
      .then(setFile)
      .catch((error) => {
        if (error instanceof ServerError) {
          return setError(error);
        }
        throw error;
      });
  }, []);

  const [error, setError] = useState<ServerError | undefined>();

  return (
    <div style={{ minHeight: '150px' }}>
      <Loading loading={!file && !error} />
      <Diagram file={file} />
      <ErrorMessage error={error} />
    </div>
  );
}

export default App;

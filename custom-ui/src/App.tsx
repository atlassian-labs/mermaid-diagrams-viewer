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

  return (
    <Banner
      appearance="warning"
      icon={<WarningIcon label="" secondaryColor="inherit" />}
    >
      Error while loading diagram:
      {props.error.message}
    </Banner>
  );
};

const Loading: React.FunctionComponent<{ loading?: boolean }> = (props) => {
  if (!props.loading) {
    return null;
  }

  return (
    <div>
      Loading diagram <Spinner interactionName="load" />
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
    <div>
      <Loading loading={!file && !error} />
      <Diagram file={file} />
      <ErrorMessage error={error} />
    </div>
  );
}

export default App;

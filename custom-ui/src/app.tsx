import React, { useEffect, useState } from 'react';
import Banner from '@atlaskit/banner';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Spinner from '@atlaskit/spinner';
import { Diagram } from './diagram';
import { token, useThemeObserver } from '@atlaskit/tokens';
import { view } from '@forge/bridge';
import { Context } from 'shared/src/context';
import { AppError } from 'shared/src/app-error';
import { getCodeFromCorrespondingBlock } from 'shared/src/confluence/code-blocks';
import { getPageContent } from 'shared/src/confluence/api-client/browser';

void view.theme.enable();

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

const Loading: React.FunctionComponent<{ loading?: boolean }> = () => {
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
  const [code, setCode] = useState<string>();
  const [error, setError] = useState<AppError | Error | undefined>();
  const { colorMode } = useThemeObserver();

  useEffect(() => {
    void view
      .getContext()
      .then((context) =>
        getCodeFromCorrespondingBlock(
          context as unknown as Context,
          getPageContent,
        ),
      ) // TODO
      .then(setCode)
      .catch((error: unknown) => {
        if (error instanceof AppError) {
          setError(error);
          return;
        }

        // eslint-disable-next-line no-console
        console.error(error);

        setError(
          new AppError(
            'Oops! Something went wrong! Please refresh the page.',
            'UNKNOWN_ERROR',
          ),
        );
        throw error;
      });
  }, []);

  const onError = (error: Error) => {
    setError(error);
  };

  return (
    <div
      style={{
        minHeight: '150px',
        backgroundColor: token('elevation.surface'),
        borderRadius: '3px',
      }}
    >
      {code === undefined && error === undefined ? <Loading /> : null}
      {code !== undefined && colorMode ? (
        <Diagram code={code} colorMode={colorMode} onError={onError} />
      ) : null}
      <ErrorMessage error={error} />
    </div>
  );
}

export default App;

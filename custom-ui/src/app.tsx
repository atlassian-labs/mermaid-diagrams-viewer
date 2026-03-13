import React, { useEffect, useState } from 'react';
import Banner from '@atlaskit/banner';
import Spinner from '@atlaskit/spinner';
import { Diagram } from './diagram';
import { token } from '@atlaskit/tokens';
import { view } from '@forge/bridge';
import { Context } from './context';
import { AppError } from './app-error';
import { getCodeFromCorrespondingBlock } from './confluence/code-blocks';
import { getPageContent } from './confluence/api-client/browser';

const ErrorMessage: React.FunctionComponent<{ error?: Error }> = (props) => {
  if (!props.error) {
    return null;
  }
  return (
    <div
      role="alert"
      style={{
        borderStyle: 'solid',
        borderRadius: 'var(--ds-radius-small, 3px)',
        borderWidth: 'var(--ds-border-width, 1px)',
        borderColor: 'var(--ds-border-disabled, #091E4224)',
        overflow: 'hidden',
      }}
    >
      <Banner appearance="warning" icon={<span>{'\u26A0'}</span>}>
        Error while loading diagram
      </Banner>
      <p
        style={{
          margin: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
          fontSize: '14px',
          color: token('color.text.subtle', '#44546F'),
        }}
      >
        {props.error.message}
      </p>
    </div>
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

function App({ colorMode }: { colorMode: 'light' | 'dark' }) {
  const [code, setCode] = useState<string>();
  const [error, setError] = useState<AppError | Error | undefined>();

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
      {code !== undefined ? (
        <Diagram code={code} colorMode={colorMode} onError={onError} />
      ) : null}
      <ErrorMessage error={error} />
    </div>
  );
}

export default App;

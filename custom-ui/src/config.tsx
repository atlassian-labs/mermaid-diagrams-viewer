import React, { useState, useEffect } from 'react';
import { view } from '@forge/bridge';
import { Config, CONFIG_FIELD } from './config-data';
import { getPageContent } from './confluence/api-client/browser';
import { findCodeBlocks, looksLikeMermaid } from './confluence/code-blocks';
import Button from '@atlaskit/button/new';
import Select, { type ValueType } from '@atlaskit/select';
import { token } from '@atlaskit/tokens';

interface SelectOption {
  label: string;
  value: number | undefined;
}

export const useSubmit = () => {
  const [error, setError] = useState<boolean>();

  const submit = async (fields: Config) => {
    const payload = { config: fields };

    try {
      await view.submit(payload);
      setError(false);
    } catch {
      setError(true);
    }
  };

  return {
    error,
    submit,
  };
};

export const DiagramConfig = () => {
  const { submit, error } = useSubmit();

  const [config, setConfig] = useState<Config>({});
  const [contentId, setContentId] = useState<string | undefined>(undefined);
  const [codeBlocks, setCodeBlocks] = useState<string[]>([]);

  useEffect(() => {
    const fetchConfig = async () => {
      const context = await view.getContext();

      const extension = context.extension as {
        config: Config | undefined;
        content: { id: string };
      };

      const fetchedConfig = extension.config ?? {};
      const fetchedContentId = extension.content.id;

      setConfig(fetchedConfig);
      setContentId(fetchedContentId);
    };
    void fetchConfig();
  }, []);

  useEffect(() => {
    const fetchCodeBlocks = async () => {
      if (!contentId) {
        return;
      }

      const isEditing = true;
      const adf = await getPageContent(contentId, isEditing);
      setCodeBlocks(findCodeBlocks(adf));
    };
    void fetchCodeBlocks();
  }, [contentId]);

  const options: SelectOption[] = [
    { label: 'Auto detect', value: undefined },
    ...codeBlocks.map((codeBlock, index) => {
      const trimmedCode =
        codeBlock.length > 35 ? `${codeBlock.substring(0, 35)}...` : codeBlock;
      const indicator = looksLikeMermaid(codeBlock) ? '✓ ' : '⛌';
      return {
        label: `${String(index + 1)}. ${indicator} ${trimmedCode}`,
        value: index,
      };
    }),
  ];

  const defaultValue =
    config.index === undefined ? options[0] : options[config.index + 1];

  const containerStyle: React.CSSProperties = {
    padding: token('space.200', '16px'),
    display: 'flex',
    flexDirection: 'column',
    gap: token('space.200', '16px'),
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: token('color.text.subtle', '#626F86'),
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: token('color.text.subtlest', '#8590A2'),
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: token('color.text.danger', '#AE2A19'),
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: token('space.100', '8px'),
  };

  return (
    <div style={containerStyle}>
      <div>
        <label htmlFor="diagram" style={labelStyle}>
          Select codeblock with mermaid diagram to render
        </label>
        <Select<SelectOption>
          inputId="diagram"
          value={defaultValue}
          options={options}
          isClearable={false}
          isMulti={false}
          isRequired={true}
          onChange={(option: ValueType<SelectOption>) => {
            if (option && !Array.isArray(option)) {
              setConfig({
                [CONFIG_FIELD]: option.value,
              });
            }
          }}
        />
      </div>
      <div style={helperStyle}>
        <p>Nearest diagram is picked by default (Auto detect option)</p>
        <p>✓ - recognized as mermaid diagram</p>
        <p>⛌ - not recognized as mermaid diagram</p>
      </div>
      {error === true && (
        <p style={errorStyle}>
          Failed to save configuration. Please try again.
        </p>
      )}
      <div style={buttonRowStyle}>
        <Button appearance="primary" onClick={() => void submit(config)}>
          Submit
        </Button>
        <Button appearance="subtle" onClick={() => void view.close()}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import ForgeReconciler, {
  Button,
  HelperMessage,
  Label,
  Select,
  Stack,
} from '@forge/react';
import { view } from '@forge/bridge';
import { Config, CONFIG_FIELD } from 'shared/src/config';
import { getPageContent } from 'shared/src/confluence/api-client/browser';
import { findCodeBlocks } from 'shared/src/confluence/code-blocks';

const useSubmit = () => {
  const [error, setError] = useState<boolean>();

  const submit = async (fields: Config | undefined) => {
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

const DiagramConfig = () => {
  const { submit } = useSubmit();

  const [config, setConfig] = useState<Config | undefined>(undefined);
  const [contentId, setContentId] = useState<string | undefined>(undefined);

  const [codeBlocks, setCodeBlocks] = useState<string[]>([]);

  useEffect(() => {
    const fetchConfig = async () => {
      const context = await view.getContext();

      const extension = context.extension as {
        config: Config;
        content: { id: string };
      };

      const config = extension.config;
      const contentId = extension.content.id;

      setConfig(config);
      setContentId(contentId);
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

  const options = [
    { label: 'Auto detect', value: undefined },
    ...codeBlocks.map((codeBlock, index) => {
      const trimmedCode =
        codeBlock.length > 35 ? `${codeBlock.substring(0, 35)}...` : codeBlock;
      return {
        label: `${String(index + 1)}. ${trimmedCode}`,
        value: index,
      };
    }),
  ];

  const defaultValue =
    config?.index === undefined ? options[0] : options[config.index + 1];

  return (
    <Stack space="space.200">
      <Label labelFor="diagram">
        Select codeblock with mermaid diagram to render
      </Label>
      <Select
        inputId="diagram"
        value={defaultValue}
        options={options}
        isClearable={false}
        isMulti={false}
        isRequired={true}
        onChange={({ value }: { value: number | undefined }) => {
          setConfig({
            [CONFIG_FIELD]: value,
          });
        }}
      />
      <HelperMessage>
        Nearest diagram is picked by default (Auto detect option)
      </HelperMessage>

      <Button appearance="primary" onClick={() => void submit(config)}>
        Submit
      </Button>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <DiagramConfig />
  </React.StrictMode>,
);

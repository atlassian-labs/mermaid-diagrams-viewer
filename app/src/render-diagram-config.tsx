import ForgeUI, {
  MacroConfig,
  render,
  Select,
  useEffect,
  useProductContext,
  useState,
  Option,
  useConfig,
} from '@forge/ui';
import { findCodeBlocks } from 'shared/src/confluence';
import { Config, CONFIG_FIELD } from 'shared/src/config';
import { getPageContent } from './api';

const DiagramConfig = () => {
  const [codeBlocks, setCodeBlocks] = useState<string[]>([]);

  const { contentId } = useProductContext();
  const config = useConfig() as Config | undefined;

  if (!contentId) {
    throw new Error('Content ID is not defined');
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(async () => {
    const isEditing = true;

    const adf = await getPageContent(contentId, isEditing);
    setCodeBlocks(findCodeBlocks(adf));
  }, [contentId]);

  return (
    <MacroConfig>
      <Select
        label="Select codeblock with mermaid diagram to render"
        name={CONFIG_FIELD}
      >
        <Option
          label={`Auto detect`}
          value={undefined}
          defaultSelected={config?.index === undefined}
        />
        {codeBlocks.map((codeBlock, i) => {
          const trimmedCode =
            codeBlock.length > 35
              ? `${codeBlock.substring(0, 35)}...`
              : codeBlock;

          return (
            <Option
              label={`${i + 1} - ${trimmedCode}`}
              value={i}
              defaultSelected={config?.index === i}
            />
          );
        })}
      </Select>
    </MacroConfig>
  );
};

export const run = render(<DiagramConfig />);

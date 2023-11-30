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
import { findCodeBlocks, getPageContent } from './lib/confluence';
import { Config, CONFIG_FIELD } from './lib/config';

const DiagramConfig = () => {
  const [codeBlocks, setCodeBlocks] = useState<string[]>([]);

  const context = useProductContext();
  const config = useConfig() as Config | undefined;

  useEffect(async () => {
    const isEditing = true;

    const adf = await getPageContent(context.contentId!, isEditing);
    setCodeBlocks(findCodeBlocks(adf));
  }, []);

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

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
import { traverse } from '@atlaskit/adf-utils/traverse';
import { getPageContent } from './lib/confluence';
import { Config } from './lib/config';

const DiagramConfig = () => {
  const [diagrams, setDiagrams] = useState<string[]>([]);

  const context = useProductContext();
  const config = useConfig() as Config | undefined;

  useEffect(async () => {
    const isEditing = true;

    const adf = await getPageContent(context.contentId!, isEditing);

    const diagrams: string[] = [];
    const titleRegexp = /title\s+(.+)\n/i;

    traverse(adf, {
      codeBlock: (node) => {
        console.log(node);
        const text = node.content?.[0]?.text?.trim();
        if (!text) {
          return;
        }

        const title = text.match(titleRegexp)?.[1];
        if (!title) {
          return;
        }
        diagrams.push(title);
      },
    });
    console.log({ diagrams });
    setDiagrams(diagrams);
  }, []);

  return (
    <MacroConfig>
      <Select
        label="Select codeblock with mermaid diagram to render"
        name="diagram"
      >
        {diagrams.map((diagram) => {
          return (
            <Option
              label={diagram}
              value={diagram}
              defaultSelected={config?.diagram === diagram}
            />
          );
        })}
      </Select>
    </MacroConfig>
  );
};

export const run = render(<DiagramConfig />);

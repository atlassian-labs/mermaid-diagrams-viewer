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
import api, { route } from '@forge/api';
import { findCodeBlocks } from 'shared/src/confluence';
import { Config, CONFIG_FIELD } from 'shared/src/config';

async function getPageContent(pageId: string, isEditing: boolean) {
  const pageResponse = await api
    .asUser()
    .requestConfluence(
      route`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=${isEditing.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

  const pageResponseBody = await pageResponse.json();
  return JSON.parse(pageResponseBody.body.atlas_doc_format.value);
}

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

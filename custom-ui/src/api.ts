import { view } from '@forge/bridge';
import { Config } from 'shared/src/config';
import {
  autoMapMacroToCodeBlock,
  findCodeBlocks,
  getPageContent,
} from 'shared/src/confluence';
export class ServerError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

interface Extension {
  isEditing: boolean;
  config: Config | undefined;
  content: { id: string };
}

export async function getCode() {
  const context = await view.getContext();
  const extension = context.extension as Extension;

  const run = async (_retryCount = 0): Promise<string> => {
    const index = getIndexFromConfig(extension.config);
    const adf = await getPageContent(extension.content.id, extension.isEditing);
    if (index === undefined) {
      const macroToCodeBlockMap = autoMapMacroToCodeBlock(
        adf,
        context.moduleKey,
      );

      if (!macroToCodeBlockMap.has(context.localId) && _retryCount < 10) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return run(_retryCount + 1);
      }

      const code = macroToCodeBlockMap.get(context.localId);
      if (code) {
        return code;
      }

      if (code === undefined) {
        throw new ServerError(
          `Can't find codeblock to render automatically; Please select one in the macro settings`,
          'DIAGRAM_IS_NOT_SELECTED',
        );
      }

      return code;
    }

    const codeBlocks = findCodeBlocks(adf);
    const codeBlock = codeBlocks[index];
    if (!codeBlock) {
      throw new ServerError(
        `Code block under with position ${String(index + 1)} not found`,
        'DIAGRAM_IS_NOT_SELECTED',
      );
    }

    return codeBlock;
  };

  return run();
}

function getIndexFromConfig(config: Config | undefined): number | undefined {
  if (Number.isSafeInteger(config?.index)) {
    return config?.index;
  }
  return undefined;
}

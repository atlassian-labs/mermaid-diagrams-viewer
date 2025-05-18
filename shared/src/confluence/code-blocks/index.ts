import { ADFEntity } from '@atlaskit/adf-utils/types';
import { traverse } from '@atlaskit/adf-utils/traverse';
import { GetPageContent } from '../api-client/types';
import { Context } from '../../context';
import { getIndexFromConfig } from '../../config';
import { AppError } from '../../app-error';

function getTextFromCodeBlock(node: ADFEntity) {
  return node.content?.[0]?.text?.trim() || '';
}

function autoMapMacroToCodeBlock(adf: ADFEntity, moduleKey: string) {
  const extensions: string[] = [];
  const codeBlocks: string[] = [];

  traverse(adf, {
    extension: (node: { attrs?: Attrs }) => {
      const extensionKey = node.attrs?.extensionKey;
      if (!extensionKey?.endsWith(moduleKey)) {
        return;
      }

      const localId = node.attrs?.parameters?.localId;
      if (!localId) {
        throw new Error(
          `No localId found for extension with key ${extensionKey}`,
        );
      }
      extensions.push(localId);
    },
    codeBlock: (node) => {
      codeBlocks.push(getTextFromCodeBlock(node));
    },
  });

  const map = new Map<string, string>();

  while (extensions.length > 0) {
    const extension = extensions.shift();
    const codeBlock = codeBlocks.shift();
    if (extension && codeBlock) {
      map.set(extension, codeBlock);
    }
  }

  return map;
}

export function findCodeBlocks(adf: ADFEntity) {
  const codeBlocks: string[] = [];

  traverse(adf, {
    codeBlock: (node) => {
      codeBlocks.push(getTextFromCodeBlock(node));
    },
  });

  return codeBlocks;
}

type Attrs = {
  extensionKey?: string;
  parameters?: {
    localId?: string;
  };
};

export async function getCodeFromCorrespondingBlock(
  context: Context,
  getPageContent: GetPageContent,
) {
  const extension = context.extension;

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
        throw new AppError(
          `Can't find codeblock to render automatically; Please select one in the macro settings`,
          'DIAGRAM_IS_NOT_SELECTED',
        );
      }

      return code;
    }

    const codeBlocks = findCodeBlocks(adf);
    const codeBlock = codeBlocks[index];
    if (!codeBlock) {
      throw new AppError(
        `Code block under with position ${String(index + 1)} not found`,
        'DIAGRAM_IS_NOT_SELECTED',
      );
    }

    return codeBlock;
  };

  return run();
}

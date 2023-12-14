import { ADFEntity } from '@atlaskit/adf-utils/types';
import { traverse } from '@atlaskit/adf-utils/traverse';

export type { ADFEntity } from '@atlaskit/adf-utils/types';

export interface PageResponseBody {
  body: { atlas_doc_format: { value: string } };
}

function getTextFromCodeBlock(node: ADFEntity) {
  return node.content?.[0]?.text?.trim() || '';
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

export function autoMapMacroToCodeBlock(adf: ADFEntity, moduleKey: string) {
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
        // TODO: throw error?
        return;
      }
      extensions.push(localId);
    },
    codeBlock: (node) => {
      codeBlocks.push(getTextFromCodeBlock(node));
    },
  });

  const map = new Map<string, string>();

  while (extensions.length > 0) {
    const extension = extensions.shift()!;
    const codeBlock = codeBlocks.shift()!;
    map.set(extension, codeBlock);
  }

  return map;
}

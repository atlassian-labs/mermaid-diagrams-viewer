import { ADFEntity } from '@atlaskit/adf-utils/types';
import { traverse } from '@atlaskit/adf-utils/traverse';

export type { ADFEntity } from '@atlaskit/adf-utils/types';

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

export function findClosestCodeBlock(
  adf: ADFEntity,
  localId: string,
  moduleKey: string,
) {
  const extensions: string[] = [];
  const codeBlocks: string[] = [];

  traverse(adf, {
    extension: (node) => {
      if (!node?.attrs?.extensionKey.endsWith(moduleKey)) {
        return;
      }

      extensions.push(node?.attrs?.parameters.localId);
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

  return map.get(localId);
}

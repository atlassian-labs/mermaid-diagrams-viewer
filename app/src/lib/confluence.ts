import { ADFEntity } from '@atlaskit/adf-utils/types';
import { traverse } from '@atlaskit/adf-utils/traverse';
import api, { route } from '@forge/api';

export async function getPageContent(pageId: string, isEditing: boolean) {
  const pageResponse = await api
    .asUser()
    .requestConfluence(
      route`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=${isEditing.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

  const pageResponseBody = await pageResponse.json();
  const adf = JSON.parse(pageResponseBody.body.atlas_doc_format.value);

  return adf;
}

function getTextFromCodeBlock(node: ADFEntity) {
  return node.content?.[0]?.text?.trim() || '';
}

export function findCodeBlocks(adf: any) {
  const codeBlocks: string[] = [];

  traverse(adf, {
    codeBlock: (node) => {
      codeBlocks.push(getTextFromCodeBlock(node));
    },
  });

  return codeBlocks;
}

export function findClosestCodeBlock(
  adf: any,
  localId: string,
  moduleKey: string
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

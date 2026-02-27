import { ADFEntity } from '@atlaskit/adf-utils/types';
import { traverse } from '@atlaskit/adf-utils/traverse';
import { GetPageContent } from '../api-client/types';
import { Context } from '../../context';
import { getIndexFromConfig } from '../../config';
import { AppError } from '../../app-error';

export const MERMAID_DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram-v2',
  'stateDiagram',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'gitGraph',
  'mindmap',
  'timeline',
  'xychart-beta',
  'block-beta',
  'quadrantChart',
  'requirementDiagram',
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
  'sankey-beta',
  'zenuml',
  'packet-beta',
  'architecture-beta',
  'kanban',
] as const;

const MERMAID_DIAGRAM_PATTERN = new RegExp(
  `^(${MERMAID_DIAGRAM_TYPES.join('|')})(\\s|$|;)`,
  'i',
);

function isMermaidCodeBlock(node: ADFEntity): boolean {
  if ((node.attrs?.language as string | undefined)?.toLowerCase() === 'mermaid') {
    return true;
  }
  const text = node.content?.[0]?.text?.trim() ?? '';
  const lines = text.split('\n');

  // Find the first non-empty, non-directive/comment line to detect the diagram type.
  // Mermaid diagrams may start with directives (%%{init: ...}%%) or comments (%% ...)
  // before the actual diagram keyword, so those lines are skipped.
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith('%%')) {
      continue;
    }
    return MERMAID_DIAGRAM_PATTERN.test(line);
  }

  return false;
}

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
    codeBlock: (node: ADFEntity) => {
      if (isMermaidCodeBlock(node)) {
        codeBlocks.push(getTextFromCodeBlock(node));
      }
    },
  });

  const map = new Map<string, string>();

  while (extensions.length > 0) {
    const extension = extensions.shift();
    const codeBlock = codeBlocks.shift();
    // Code block can be empty string
    if (extension && codeBlock !== undefined) {
      map.set(extension, codeBlock);
    }
  }

  return map;
}

// NOTE: this function now returns only Mermaid code blocks, so the returned
// array's indices are consistent with the config UI (which also uses this
// function to populate the dropdown). Previously-saved config.index values
// that were based on the unfiltered block list may point to a different block
// after this change; affected macros will need to be reconfigured once.
export function findCodeBlocks(adf: ADFEntity) {
  const codeBlocks: string[] = [];

  traverse(adf, {
    codeBlock: (node: ADFEntity) => {
      if (isMermaidCodeBlock(node)) {
        codeBlocks.push(getTextFromCodeBlock(node));
      }
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
  retryDelay = 3000, // Added parameter for retry delay to be used in tests
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
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
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

import { isForgePlatformError } from '@forge/api';
import Resolver from '@forge/resolver';
import { addErrorFormatter, formatError, isInternalError } from './lib/error';
import {
  findClosestCodeBlock,
  findCodeBlocks,
  getPageContent,
} from './lib/confluence';
import { Config } from './lib/config';

const resolver = new Resolver();

class MissingDiagram extends Error {}

addErrorFormatter(MissingDiagram, {
  code: 'DIAGRAM_IS_NOT_SELECTED',
});

function getIndexFromConfig(config: Config | undefined): number | undefined {
  if (Number.isSafeInteger(config?.index)) {
    return config?.index;
  }
  return undefined;
}

resolver.define('getCode', async (req) => {
  try {
    const index = getIndexFromConfig(
      req.context.extension.config as Config | undefined
    );
    const isEditing = req.context.extension.isEditing as boolean;

    const adf = await getPageContent(
      req.context.extension.content.id,
      isEditing
    );

    if (index === undefined) {
      const code = findClosestCodeBlock(
        adf,
        req.context.localId,
        req.context.moduleKey
      );

      if (code === undefined) {
        throw new MissingDiagram(
          `Can't find codeblock to render automatically; Please select one in the macro settings`
        );
      }

      return {
        data: code,
      };
    }

    const codeBlocks = findCodeBlocks(adf);
    const codeBlock = codeBlocks[index];
    if (!codeBlock) {
      throw new MissingDiagram(
        `Code block under with position ${index + 1} not found`
      );
    }

    return {
      data: codeBlock,
    };
  } catch (error: any) {
    if (isForgePlatformError(error)) {
      console.warn(error);
      throw error;
    }

    if (isInternalError(error)) {
      console.error(error);
    } else {
      console.warn(error);
    }

    return {
      error: formatError(error),
    };
  }
});

export const run = resolver.getDefinitions();

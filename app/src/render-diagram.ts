import { traverse } from '@atlaskit/adf-utils/traverse';
import { isForgePlatformError } from '@forge/api';
import Resolver from '@forge/resolver';
import { addErrorFormatter, formatError, isInternalError } from './lib/error';
import { getPageContent } from './lib/confluence';
import { Config } from './lib/config';

const resolver = new Resolver();

class MissingDiagram extends Error {}

addErrorFormatter(MissingDiagram, {
  code: 'DIAGRAM_IS_NOT_SELECTED',
});

resolver.define('getFile', async (req) => {
  try {
    const config = req.context.extension.config as Config | undefined;

    if (!config?.diagram) {
      throw new MissingDiagram('No diagram selected');
    }

    const isEditing = req.context.extension.isEditing as boolean;

    const adf = await getPageContent(
      req.context.extension.content.id,
      isEditing
    );

    let data = '';

    traverse(adf, {
      codeBlock: (node) => {
        console.log(node);
        const text = node.content?.[0]?.text || '';
        if (text.includes(config.diagram!)) {
          data = text;
        }
      },
    });

    if (!data) {
      throw new MissingDiagram(`Diagram ${config.diagram} not found`);
    }

    return {
      data,
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

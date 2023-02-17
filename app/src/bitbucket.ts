import Resolver from '@forge/resolver';
import api from '@forge/api';
import {
  convertFileUrl,
  InvalidUrlError,
  InvalidUrlOrigin,
  validateFileUrl,
} from './lib/file-url';
import { addErrorFormatter, formatError, isInternalError } from './lib/error';

type Config = { url?: string } | undefined;

const resolver = new Resolver();

class MissingFileUrl extends Error {}
class BitbucketApiError extends Error {
  constructor(message: string, public httpCode: number) {
    super(message);
  }
}

addErrorFormatter(MissingFileUrl, {
  code: 'FILE_URL_IS_REQUIRED',
});

addErrorFormatter(InvalidUrlError, {
  code: 'FILE_URL_INVALID',
});

addErrorFormatter(InvalidUrlOrigin, {
  code: 'FILE_URL_HOST_NOT_SUPPORTED',
});

addErrorFormatter(BitbucketApiError, {
  code: 'BITBUCKET_API_RETURNED_ERROR',
});

resolver.define('getFile', async (req) => {
  try {
    const config = req.context.extension.config as Config;

    const fileUrl = config?.url;

    if (!fileUrl) {
      throw new MissingFileUrl('No file URL specified');
    }

    validateFileUrl(fileUrl);

    const bitbucket = api.asUser().withProvider('bitbucket', 'bitbucket-api');

    if (!(await bitbucket.hasCredentials())) {
      await bitbucket.requestCredentials();
    }

    const response = await bitbucket.fetch(convertFileUrl(fileUrl));

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new BitbucketApiError(errorResponse, response.status);
    }

    const diagram = await response.text();
    return {
      data: diagram,
    };
  } catch (error: any) {
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

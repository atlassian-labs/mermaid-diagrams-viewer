import { FutureError } from './error';

export class InvalidUrlError extends FutureError {}
export class InvalidUrlOrigin extends FutureError {}

export function validateFileUrl(input: string) {
  let url: URL;

  try {
    url = new URL(input);
  } catch (error: any) {
    throw new InvalidUrlError('Failed to parse file URL', { cause: error });
  }

  if (url.origin !== 'https://bitbucket.org') {
    throw new InvalidUrlOrigin('Only Bitbucket hosting is supported');
  }
}

/**
 * Takes URL of this format:
 *   https://api.bitbucket.org/2.0/repositories/atlassian/diagrams/src/master/src/AccessNarrowing/ECORFC-131/filter-extensions.mmd
 *
 * Returns URL of that format:
 *   https://bitbucket.org/atlassian/diagrams/src/master/src/AccessNarrowing/ECORFC-131/filter-extensions.mmd
 */
export function convertFileUrl(input: string) {
  const apiUrl = input.replace(
    'https://bitbucket.org',
    'https://api.bitbucket.org/2.0/repositories'
  );

  return apiUrl;
}

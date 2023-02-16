import Resolver from '@forge/resolver';
import api from '@forge/api';

type Config = { url?: string } | undefined;

const resolver = new Resolver();

resolver.define('getFile', async (req) => {
  const config = req.context.extension.config as Config;
  console.log({ config });

  const fileUrl = config?.url?.replace('https://bitbucket.org', 'https://api.bitbucket.org/2.0/repositories');

  // const url = 'https://api.bitbucket.org/2.0/repositories/atlassian/diagrams/src/master/src/AccessNarrowing/ECORFC-131/filter-extensions.mmd';
  // https://bitbucket.org/atlassian/diagrams/src/master/src/AccessNarrowing/ECORFC-131/filter-extensions.mmd

  const bitbucket = api.asUser().withProvider('bitbucket', 'bitbucket-api')
  if (!await bitbucket.hasCredentials()) {
    await bitbucket.requestCredentials()
  }

  if (!fileUrl) {
    throw new Error('No file URL specified')
  }
  const response = await bitbucket.fetch(fileUrl);

  if (!response.ok) {
    const errorResponse = await response.text();
    throw new Error(`Error fetching diagram: ${errorResponse}`);
  }

  const diagram = await response.text();
  return diagram;
});

export const run = resolver.getDefinitions();
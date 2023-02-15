import Resolver from '@forge/resolver';
import api from '@forge/api';

const resolver = new Resolver();

resolver.define('getFile', async (req) => {

  const bitbucket = api.asUser().withProvider('bitbucket', 'bitbucket-api')
  console.log('------- 1')
  if (!await bitbucket.hasCredentials()) {
    console.log('------- 2')
    await bitbucket.requestCredentials()
    console.log('------- 3')
  }
  console.log('------- 4')
  const response = await bitbucket.fetch('https://api.bitbucket.org/2.0/repositories/atlassian/diagrams/src/master/src/AccessNarrowing/ECORFC-131/filter-extensions.mmd');
  const diagram = await response.text();
  return diagram;
});

export const run = resolver.getDefinitions();
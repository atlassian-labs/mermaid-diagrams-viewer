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

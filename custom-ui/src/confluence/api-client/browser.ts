import { requestConfluence } from '@forge/bridge';
import { ADFEntity, GetPageContent, PageResponseBody } from './types';

export const getPageContent: GetPageContent = async (pageId, isEditing) => {
  let pageResponse = await requestConfluence(
    `/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=${isEditing.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (pageResponse.status === 404) {
    pageResponse = await requestConfluence(
      `/wiki/api/v2/blogposts/${pageId}?body-format=atlas_doc_format&get-draft=${isEditing.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
  }

  const pageResponseBody = (await pageResponse.json()) as PageResponseBody;
  const adf = JSON.parse(
    pageResponseBody.body.atlas_doc_format.value,
  ) as ADFEntity;

  return adf;
};

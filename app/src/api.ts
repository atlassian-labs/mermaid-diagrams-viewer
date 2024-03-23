import api, { route } from '@forge/api';
import { ADFEntity, PageResponseBody } from 'shared/src/confluence';

export async function getPageContent(
  pageId: string,
  isEditing: boolean,
): Promise<ADFEntity> {
  let pageResponse = await api
    .asUser()
    .requestConfluence(
      route`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=${isEditing.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

  if (pageResponse.status === 404) {
    pageResponse = await api
      .asUser()
      .requestConfluence(
        route`/wiki/api/v2/blogposts/${pageId}?body-format=atlas_doc_format&get-draft=${isEditing.toString()}`,
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
}

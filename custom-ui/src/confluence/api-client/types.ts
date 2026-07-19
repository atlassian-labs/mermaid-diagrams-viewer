import { ADFEntity } from '@atlaskit/adf-utils/types';

export interface PageResponseBody {
  body: { atlas_doc_format: { value: string } };
}

export type { ADFEntity } from '@atlaskit/adf-utils/types';

export type GetPageContent = (
  pageId: string,
  isEditing: boolean,
  cacheBust?: string,
) => Promise<ADFEntity>;

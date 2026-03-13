import { getPageContent } from '../confluence/api-client/browser';
import { requestConfluence } from '@forge/bridge';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  type MockedFunction,
} from 'vitest';

// Define a mock response interface that matches our needs
interface MockResponse {
  status: number;
  json: () => Promise<unknown>;
}

// Mock @forge/bridge
vi.mock('@forge/bridge', () => ({
  requestConfluence: vi.fn(),
}));

const mockRequestConfluence = requestConfluence as MockedFunction<
  typeof requestConfluence
>;

describe('api-client/browser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPageContent', () => {
    const pageId = 'test-page-id';
    const mockAdfValue = '{"type":"doc","content":[]}';
    const mockPageResponse = {
      body: {
        atlas_doc_format: {
          value: mockAdfValue,
        },
      },
    };

    it('should fetch page content successfully', async () => {
      const mockResponse: MockResponse = {
        status: 200,
        json: vi.fn().mockResolvedValue(mockPageResponse),
      };
      mockRequestConfluence.mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof requestConfluence>
        >,
      );

      const result = await getPageContent(pageId, false);

      expect(mockRequestConfluence).toHaveBeenCalledWith(
        `/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=false`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      expect(result).toEqual(JSON.parse(mockAdfValue));
    });

    it('should fetch page content with draft when isEditing is true', async () => {
      const mockResponse: MockResponse = {
        status: 200,
        json: vi.fn().mockResolvedValue(mockPageResponse),
      };
      mockRequestConfluence.mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof requestConfluence>
        >,
      );

      await getPageContent(pageId, true);

      expect(mockRequestConfluence).toHaveBeenCalledWith(
        `/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=true`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );
    });

    it('should fallback to blogpost API when page returns 404', async () => {
      const mockNotFoundResponse: MockResponse = {
        status: 404,
        json: vi.fn(),
      };
      const mockSuccessResponse: MockResponse = {
        status: 200,
        json: vi.fn().mockResolvedValue(mockPageResponse),
      };

      mockRequestConfluence
        .mockResolvedValueOnce(
          mockNotFoundResponse as unknown as Awaited<
            ReturnType<typeof requestConfluence>
          >,
        )
        .mockResolvedValueOnce(
          mockSuccessResponse as unknown as Awaited<
            ReturnType<typeof requestConfluence>
          >,
        );

      const result = await getPageContent(pageId, false);

      expect(mockRequestConfluence).toHaveBeenCalledTimes(2);
      expect(mockRequestConfluence).toHaveBeenNthCalledWith(
        1,
        `/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&get-draft=false`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );
      expect(mockRequestConfluence).toHaveBeenNthCalledWith(
        2,
        `/wiki/api/v2/blogposts/${pageId}?body-format=atlas_doc_format&get-draft=false`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      expect(result).toEqual(JSON.parse(mockAdfValue));
    });

    it('should parse ADF correctly', async () => {
      const complexAdf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello world',
              },
            ],
          },
        ],
      };

      const mockComplexResponse: MockResponse = {
        status: 200,
        json: vi.fn().mockResolvedValue({
          body: {
            atlas_doc_format: {
              value: JSON.stringify(complexAdf),
            },
          },
        }),
      };
      mockRequestConfluence.mockResolvedValue(
        mockComplexResponse as unknown as Awaited<
          ReturnType<typeof requestConfluence>
        >,
      );

      const result = await getPageContent(pageId, false);
      expect(result).toEqual(complexAdf);
    });

    it('should handle errors from requestConfluence', async () => {
      const error = new Error('Network error');
      mockRequestConfluence.mockRejectedValue(error);

      await expect(getPageContent(pageId, false)).rejects.toThrow(
        'Network error',
      );
    });
  });
});

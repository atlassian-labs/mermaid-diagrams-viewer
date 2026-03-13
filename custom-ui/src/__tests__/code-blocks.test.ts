import { traverse } from '@atlaskit/adf-utils/traverse';
import {
  findCodeBlocks,
  getCodeFromCorrespondingBlock,
  looksLikeMermaid,
} from '../confluence/code-blocks/index';
import { Context } from '../context';
import { AppError } from '../app-error';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@atlaskit/adf-utils/traverse');
const mockTraverse = vi.mocked(traverse);

const MERMAID_KEYWORDS = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram-v2',
  'stateDiagram',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'gitGraph',
  'mindmap',
  'timeline',
];

vi.mock('mermaid', () => ({
  default: {
    initialize: () => {},
    detectType: (code: string) => {
      const firstLine = code
        .trim()
        .split('\n')
        .find((l) => l.trim() && !l.trim().startsWith('%%'))
        ?.trim();
      const match = MERMAID_KEYWORDS.find(
        (kw) =>
          firstLine === kw ||
          firstLine?.startsWith(kw + ' ') ||
          firstLine?.startsWith(kw + ';'),
      );
      if (match) return match;
      const err = new Error('No diagram type detected');
      err.name = 'UnknownDiagramError';
      throw err;
    },
  },
}));

describe('code-blocks', () => {
  describe('looksLikeMermaid', () => {
    it('should recognise all supported diagram types', () => {
      for (const type of MERMAID_KEYWORDS) {
        expect(looksLikeMermaid(`${type}\n  A --> B`)).toBe(true);
      }
      expect(MERMAID_KEYWORDS.length).toBeGreaterThan(0);
    });

    it('should return true for diagrams preceded by %% directives/comments', () => {
      expect(
        looksLikeMermaid('%%{init: {"theme": "dark"}}%%\ngraph TD\n  A --> B'),
      ).toBe(true);
      expect(looksLikeMermaid('%% a comment\nflowchart LR\n  A --> B')).toBe(
        true,
      );
    });

    it('should return true for semicolon-delimited single-line diagrams', () => {
      expect(looksLikeMermaid('sequenceDiagram; Alice->>Bob: Hello')).toBe(
        true,
      );
    });

    it('should return false for non-mermaid code', () => {
      expect(looksLikeMermaid('const x = 1;')).toBe(false);
      expect(looksLikeMermaid('SELECT * FROM table')).toBe(false);
    });

    it('should skip empty lines between directives and the diagram keyword', () => {
      expect(looksLikeMermaid('%% comment\n\ngraph TD\n  A --> B')).toBe(true);
    });

    it('should return false when all lines are directives with no diagram keyword', () => {
      expect(
        looksLikeMermaid('%%{init: {"theme": "dark"}}%%\n%% comment only'),
      ).toBe(false);
    });

    it('should rethrow errors that are not UnknownDiagramError', async () => {
      const mermaidMock = (await import('mermaid')).default;
      const unexpectedError = new Error('Internal mermaid failure');
      vi.spyOn(mermaidMock, 'detectType').mockImplementationOnce(() => {
        throw unexpectedError;
      });
      expect(() => looksLikeMermaid('graph TD')).toThrow(unexpectedError);
    });

    it('should return true for real-world diagram examples including classDiagram, flowchart, graph, and sequenceDiagram', () => {
      // classDiagram
      expect(
        looksLikeMermaid(
          'classDiagram\n    Animal <|-- Duck\n    Animal : +int age',
        ),
      ).toBe(true);

      // flowchart TD
      expect(
        looksLikeMermaid(
          'flowchart TD\n    A[Christmas] -->|Get money| B(Go shopping)',
        ),
      ).toBe(true);

      // sequenceDiagram
      expect(
        looksLikeMermaid(
          'sequenceDiagram\n    actor User\n    User->>+FE: loadPage(pageAri)',
        ),
      ).toBe(true);

      // graph TB (alias for flowchart)
      expect(
        looksLikeMermaid(
          'graph TB\n    node_1["Question...??"]\n    node_1 -->|Yes| node_1_end_a',
        ),
      ).toBe(true);

      // flowchart with no direction keyword
      expect(
        looksLikeMermaid(
          'flowchart\n\n    user["User fa:fa-user"]\n    user -->|accesses| system',
        ),
      ).toBe(true);
    });
  });

  describe('findCodeBlocks', () => {
    it('should return empty array when no code blocks found', () => {
      mockTraverse.mockReturnValue({ type: 'doc', content: [] });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual([]);
    });

    it('should extract text from all code blocks regardless of content', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'graph TD\n  A --> B' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual(['graph TD\n  A --> B']);
    });

    it('should return all code blocks including non-mermaid content', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 1;' }],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'SELECT * FROM table' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual(['const x = 1;', 'SELECT * FROM table']);
    });

    it('should include code blocks with mermaid language attribute regardless of content', () => {
      // Use non-mermaid body so only the language attribute would trigger inclusion
      // in the old filtering path; now all blocks are returned regardless.
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'const x = 1;' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual(['const x = 1;']);
    });

    it('should include code blocks with empty content as empty string', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock({ type: 'codeBlock', content: [] }, {}, 0, 0);
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual(['']);
    });

    it('should return all blocks when mixed mermaid and non-mermaid blocks', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 1;' }],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'flowchart LR\n  A --> B' }],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'not mermaid content' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual([
        'const x = 1;',
        'flowchart LR\n  A --> B',
        'not mermaid content',
      ]);
    });
  });

  describe('getCodeFromCorrespondingBlock', () => {
    const mockGetPageContent = vi.fn();

    const mockContext: Context = {
      extension: {
        isEditing: false,
        config: undefined,
        content: { id: 'page-123' },
      },
      moduleKey: 'mermaid-diagrams-for-confluence',
      localId: 'local-123',
    };

    beforeEach(() => {
      mockGetPageContent.mockClear();
      mockTraverse.mockClear();
    });

    it('should skip non-mermaid code blocks when auto-mapping extensions to code blocks', async () => {
      // Extension is followed first by a non-mermaid block (JS), then a mermaid block.
      // The non-mermaid block should be filtered out, so the extension maps to the
      // mermaid block.
      const expectedCode = 'graph TD\n  A --> B';

      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionKey: 'some-app-mermaid-diagrams-for-confluence',
              parameters: { localId: 'local-123' },
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 1;' }],
          },
          {},
          0,
          0,
        );
        // Block with no text property — exercises the undefined-text branch in isMermaidCodeBlock
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text' }],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: expectedCode }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = await getCodeFromCorrespondingBlock(
        mockContext,
        mockGetPageContent,
      );
      expect(result).toBe(expectedCode);
    });

    it('should return code from auto-mapped macro when no index configured', async () => {
      const expectedCode = 'graph TD\n  A --> B';

      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionKey: 'some-app-mermaid-diagrams-for-confluence',
              parameters: { localId: 'local-123' },
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: expectedCode }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = await getCodeFromCorrespondingBlock(
        mockContext,
        mockGetPageContent,
      );
      expect(result).toBe(expectedCode);
    });

    it('should return code from specific index when configured', async () => {
      const contextWithIndex = {
        ...mockContext,
        extension: {
          ...mockContext.extension,
          config: { index: 1 },
        },
      };

      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'graph TD\n  A --> B' }],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'flowchart LR\n  C --> D' }],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'sequenceDiagram\n  A->>B: msg' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = await getCodeFromCorrespondingBlock(
        contextWithIndex,
        mockGetPageContent,
      );
      expect(result).toBe('flowchart LR\n  C --> D');
    });

    it('should return empty string when configured index points to an empty code block', async () => {
      // findCodeBlocks now returns ALL blocks; an empty block returns '' rather than
      // being excluded, so indexing into it should return '' without throwing.
      const contextWithIndex = {
        ...mockContext,
        extension: {
          ...mockContext.extension,
          config: { index: 1 },
        },
      };

      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'graph TD\n  A --> B' }],
          },
          {},
          0,
          0,
        );
        // Plain empty block — included in all-blocks list, returns ''
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'sequenceDiagram\n  A->>B: msg' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = await getCodeFromCorrespondingBlock(
        contextWithIndex,
        mockGetPageContent,
      );
      expect(result).toBe('');
    });

    it('should throw AppError when code block index not found', async () => {
      const contextWithIndex = {
        ...mockContext,
        extension: {
          ...mockContext.extension,
          config: { index: 5 },
        },
      };

      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'graph TD\n  A --> B' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      await expect(
        getCodeFromCorrespondingBlock(contextWithIndex, mockGetPageContent),
      ).rejects.toThrow(AppError);
    });

    it('should skip irrelevant extensions that do not match module key', async () => {
      const expectedCode = 'graph TD\n  A --> B';

      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        // Add an irrelevant extension that should be skipped
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionKey: 'some-other-app-different-module',
              parameters: { localId: 'other-123' },
            },
          },
          {},
          0,
          0,
        );
        // Add the relevant extension that should match
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionKey: 'some-app-mermaid-diagrams-for-confluence',
              parameters: { localId: 'local-123' },
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: expectedCode }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = await getCodeFromCorrespondingBlock(
        mockContext,
        mockGetPageContent,
      );
      expect(result).toBe(expectedCode);
    });

    it('should throw error when extension is missing localId parameter', async () => {
      mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });

      mockTraverse.mockImplementation((adf, visitor) => {
        // Extension matches module key but has no localId parameter
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionKey: 'some-app-mermaid-diagrams-for-confluence',
              parameters: {}, // No localId
            },
          },
          {},
          0,
          0,
        );
        return adf;
      });

      await expect(
        getCodeFromCorrespondingBlock(mockContext, mockGetPageContent),
      ).rejects.toThrow(
        'No localId found for extension with key some-app-mermaid-diagrams-for-confluence',
      );
    });

    it('should retry when auto-mapping initially fails to find localId', async () => {
      vi.useFakeTimers();

      const expectedCode = 'graph TD\n  A --> B';
      let callCount = 0;

      mockGetPageContent.mockImplementation(() => {
        callCount++;
        return Promise.resolve({ type: 'doc', content: [] });
      });

      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionKey: 'some-app-mermaid-diagrams-for-confluence',
              parameters: {
                localId: callCount > 1 ? 'local-123' : 'different-id',
              }, // Fail first, succeed on retry
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: expectedCode }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const resultPromise = getCodeFromCorrespondingBlock(
        mockContext,
        mockGetPageContent,
      );

      // Advance timers to trigger retry
      await vi.runOnlyPendingTimersAsync();

      const result = await resultPromise;
      expect(result).toBe(expectedCode);
      expect(callCount).toBe(2); // Should have retried once

      vi.useRealTimers();
    });

    it('should return code when auto-detect finds matching code block', async () => {
      const context: Context = {
        extension: {
          isEditing: false,
          config: undefined,
          content: { id: 'test-page' },
        },
        moduleKey: 'test-module',
        localId: 'test-local',
      };

      // Mock traverse to simulate finding a matching extension in the ADF
      mockTraverse.mockImplementation((adf, visitor) => {
        // Simulate finding a forge extension that matches our localId
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionType: 'com.atlassian.forge',
              extensionKey: 'test-module',
              parameters: { localId: 'test-local' },
            },
          },
          {},
          0,
          0,
        );
        // Then simulate finding the code block within that extension
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'graph TD\n  A --> B' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const mockGetPageContent = vi.fn().mockResolvedValue({
        body: {
          atlas_doc_format: {
            value: JSON.stringify({
              type: 'doc',
              content: [
                {
                  type: 'extension',
                  attrs: {
                    extensionType: 'com.atlassian.forge',
                    extensionKey: 'test-module',
                    parameters: { localId: 'test-local' },
                  },
                },
              ],
            }),
          },
        },
      });

      const result = await getCodeFromCorrespondingBlock(
        context,
        mockGetPageContent,
      );

      expect(result).toBe('graph TD\n  A --> B');
    });

    it('should explicitly return code value from auto-detect path', async () => {
      const context: Context = {
        extension: {
          isEditing: false,
          config: undefined,
          content: { id: 'test-page' },
        },
        moduleKey: 'test-module',
        localId: 'test-local',
      };

      // Mock traverse to simulate finding a matching extension and code block
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionType: 'com.atlassian.forge',
              extensionKey: 'test-module',
              parameters: { localId: 'test-local' },
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'flowchart LR\n  Start --> End' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const mockGetPageContent = vi.fn().mockResolvedValue({
        body: {
          atlas_doc_format: {
            value: JSON.stringify({
              type: 'doc',
              content: [],
            }),
          },
        },
      });

      const code = await getCodeFromCorrespondingBlock(
        context,
        mockGetPageContent,
      );

      // Explicitly test that the return statement is executed and returns the correct value
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code).toBe('flowchart LR\n  Start --> End');

      // Additional validation that this specific code path was taken
      expect(code.length).toBeGreaterThan(0);
    });

    it('should return code and exit auto-detect path successfully', async () => {
      const context: Context = {
        extension: {
          isEditing: false,
          config: undefined,
          content: { id: 'test-page' },
        },
        moduleKey: 'test-module',
        localId: 'test-local',
      };

      // Mock traverse to return valid code block that matches our localId
      mockTraverse.mockImplementation((adf, visitor) => {
        // Call visitor with matching extension
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionType: 'mermaid',
              extensionKey: 'test-module',
              parameters: {
                localId: 'test-local',
              },
            },
          },
          {},
          0,
          0,
        );
        // Also add a code block nearby
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'flowchart LR\n  Start --> End' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const mockGetPageContent = vi.fn().mockResolvedValue({
        body: {
          atlas_doc_format: {
            value: JSON.stringify({
              type: 'doc',
              content: [],
            }),
          },
        },
      });

      const code = await getCodeFromCorrespondingBlock(
        context,
        mockGetPageContent,
      );

      expect(code).toBe('flowchart LR\n  Start --> End');

      // This test specifically covers lines 100-101: the successful return in auto-detect
      expect(code).toEqual(expect.any(String));
      expect(code.trim()).toBeTruthy();
    });

    it('should return empty string when auto-detect maps to empty code block', async () => {
      const context: Context = {
        extension: {
          isEditing: false,
          config: undefined,
          content: { id: 'test-page' },
        },
        moduleKey: 'test-module',
        localId: 'test-local',
      };

      // Mock traverse to simulate finding a matching extension with empty code block
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionType: 'com.atlassian.forge',
              extensionKey: 'test-module',
              parameters: { localId: 'test-local' },
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [], // Empty content results in empty string
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const mockGetPageContent = vi.fn().mockResolvedValue({
        body: {
          atlas_doc_format: {
            value: JSON.stringify({
              type: 'doc',
              content: [],
            }),
          },
        },
      });

      const code = await getCodeFromCorrespondingBlock(
        context,
        mockGetPageContent,
      );

      // This test specifically covers the return code; line when code is empty string
      expect(code).toBe('');
      expect(typeof code).toBe('string');
      expect(code).not.toBeUndefined();
    });

    it('should throw error when code is undefined for auto-detect', async () => {
      const context: Context = {
        extension: {
          isEditing: false,
          config: undefined,
          content: { id: 'test-page' },
        },
        moduleKey: 'test-module',
        localId: 'test-local',
      };

      // Mock traverse to never find the expected localId
      mockTraverse.mockImplementation((adf, visitor) => {
        // Call visitor with a different localId that won't match
        visitor.extension(
          {
            type: 'extension',
            attrs: {
              extensionType: 'mermaid',
              extensionKey: 'test-module',
              parameters: {
                localId: 'different-local-id', // Different from context.localId
              },
            },
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'some code' }],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const mockGetPageContent = vi.fn().mockResolvedValue({
        body: {
          atlas_doc_format: {
            value: JSON.stringify({ type: 'doc', content: [] }),
          },
        },
      });

      // Test the error case with a very short retry delay (1ms instead of 3000ms)
      try {
        await getCodeFromCorrespondingBlock(
          context,
          mockGetPageContent,
          1, // 1ms retry delay instead of default 3000ms
        );

        // If we reach here, the test should fail because we expected an error
        expect.fail('Expected function to throw an error');
      } catch (error) {
        // Check that the error has the expected message and code
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        expect(appError.message).toBe(
          `Can't find codeblock to render automatically; Please select one in the macro settings.`,
        );
        expect(appError.code).toBe('DIAGRAM_IS_NOT_SELECTED');
      }
    });
  });
});

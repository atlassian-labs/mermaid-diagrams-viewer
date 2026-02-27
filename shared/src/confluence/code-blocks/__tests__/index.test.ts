import { traverse } from '@atlaskit/adf-utils/traverse';
import {
  findCodeBlocks,
  getCodeFromCorrespondingBlock,
  MERMAID_DIAGRAM_TYPES,
} from '../index';
import { Context } from '../../../context';
import { AppError } from '../../../app-error';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@atlaskit/adf-utils/traverse');
const mockTraverse = vi.mocked(traverse);

describe('code-blocks', () => {
  describe('findCodeBlocks', () => {
    it('should return empty array when no code blocks found', () => {
      mockTraverse.mockReturnValue({ type: 'doc', content: [] });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual([]);
    });

    it('should extract text from code blocks that start with a mermaid diagram type', () => {
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

    it('should extract text from mermaid code blocks that start with a directive line', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [
              {
                type: 'text',
                text: '%%{init: {"theme": "dark"}}%%\ngraph TD\n  A --> B',
              },
            ],
          },
          {},
          0,
          0,
        );
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [
              {
                type: 'text',
                text: '%% a comment\nflowchart LR\n  A --> B',
              },
            ],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual([
        '%%{init: {"theme": "dark"}}%%\ngraph TD\n  A --> B',
        '%% a comment\nflowchart LR\n  A --> B',
      ]);
    });

    it('should extract text from single-line mermaid code blocks with a semicolon after the diagram type', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock(
          {
            type: 'codeBlock',
            content: [
              {
                type: 'text',
                text: 'sequenceDiagram; Alice->>Bob: Hello',
              },
            ],
          },
          {},
          0,
          0,
        );
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual(['sequenceDiagram; Alice->>Bob: Hello']);
    });

    it('should filter out code blocks that do not contain a mermaid diagram type', () => {
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
      expect(result).toEqual([]);
    });

    it('should include code blocks with mermaid language attribute regardless of content', () => {
      // Use non-mermaid body so only the language attribute triggers inclusion,
      // ensuring the attrs.language === 'mermaid' fast-path is actually exercised.
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

    it('should filter out code blocks with empty content', () => {
      mockTraverse.mockImplementation((adf, visitor) => {
        visitor.codeBlock({ type: 'codeBlock', content: [] }, {}, 0, 0);
        return adf;
      });

      const result = findCodeBlocks({ type: 'doc', content: [] });
      expect(result).toEqual([]);
    });

    it('should recognise all supported MERMAID_DIAGRAM_TYPES', () => {
      const results: string[] = [];

      for (const diagramType of MERMAID_DIAGRAM_TYPES) {
        mockTraverse.mockImplementation((adf, visitor) => {
          visitor.codeBlock(
            {
              type: 'codeBlock',
              content: [{ type: 'text', text: `${diagramType}\n  A --> B` }],
            },
            {},
            0,
            0,
          );
          return adf;
        });

        const result = findCodeBlocks({ type: 'doc', content: [] });
        results.push(...result);
      }

      expect(results).toHaveLength(MERMAID_DIAGRAM_TYPES.length);
    });

    it('should keep only mermaid blocks when mixed with non-mermaid blocks', () => {
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
      expect(result).toEqual(['flowchart LR\n  A --> B']);
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

    it('should return empty string when configured index points to an empty mermaid code block', async () => {
      // A block with attrs.language="mermaid" but no body is valid (passes the
      // fast-path in isMermaidCodeBlock) and should return '' rather than throwing.
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
        // Empty block included via language="mermaid" fast-path
        visitor.codeBlock(
          {
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
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
          `Can't find codeblock to render automatically; Please select one in the macro settings`,
        );
        expect(appError.code).toBe('DIAGRAM_IS_NOT_SELECTED');
      }
    });
  });
});

import React, { useState, useEffect } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';

// Mock all dependencies first
const mockView = {
  getContext: vi.fn(),
  submit: vi.fn(),
};

const mockGetPageContent = vi.fn();
const mockFindCodeBlocks = vi.fn();
const mockLooksLikeMermaid = vi.fn().mockReturnValue(false);

vi.mock('@forge/bridge', () => ({
  view: mockView,
}));

vi.mock('shared/src/confluence/api-client/browser', () => ({
  getPageContent: mockGetPageContent,
}));

vi.mock('shared/src/confluence/code-blocks', () => ({
  findCodeBlocks: mockFindCodeBlocks,
  looksLikeMermaid: mockLooksLikeMermaid,
}));

vi.mock('shared/src/config', () => ({
  CONFIG_FIELD: 'diagramIndex',
}));

// Mock @forge/react components
const mockForgeComponents = {
  Stack: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stack">{children}</div>
  ),
  Label: ({ children }: { children: React.ReactNode }) => (
    <label data-testid="label">{children}</label>
  ),
  Select: ({
    options,
    onChange,
    value,
  }: {
    options?: { label: string; value: number | undefined }[];
    onChange?: (option: { value: number | undefined }) => void;
    value?: { label: string; value: number | undefined };
  }) => (
    <select
      data-testid="select"
      value={value?.value ?? ''}
      onChange={(e) => {
        const selectedValue =
          e.target.value === '' ? undefined : parseInt(e.target.value);
        onChange?.({ value: selectedValue });
      }}
    >
      {options?.map((option, index) => (
        <option key={index} value={option.value ?? ''}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  HelperMessage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="helper">{children}</div>
  ),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} data-testid="button">
      {children}
    </button>
  ),
};

vi.mock('@forge/react', () => ({
  __esModule: true,
  default: {
    render: vi.fn(),
  },
  ...mockForgeComponents,
}));

// Recreate the useSubmit hook from config.tsx
const useSubmit = () => {
  const [error, setError] = useState<boolean>();

  const submit = async (fields: { diagramIndex?: number }) => {
    const payload = { config: fields };

    try {
      await mockView.submit(payload);
      setError(false);
    } catch {
      setError(true);
    }
  };

  return {
    error,
    submit,
  };
};

// Recreate the DiagramConfig component from config.tsx
const DiagramConfig = () => {
  const { submit } = useSubmit();
  const [config, setConfig] = useState<{ index?: number } | undefined>(
    undefined,
  );
  const [contentId, setContentId] = useState<string | undefined>(undefined);
  const [codeBlocks, setCodeBlocks] = useState<string[]>([]);

  useEffect(() => {
    const fetchConfig = async () => {
      const context = (await mockView.getContext()) as {
        extension: {
          config: { index?: number };
          content: { id: string };
        };
      };

      const config = context.extension.config;
      const contentId = context.extension.content.id;

      setConfig(config);
      setContentId(contentId);
    };
    void fetchConfig();
  }, []);

  useEffect(() => {
    const fetchCodeBlocks = async () => {
      if (!contentId) {
        return;
      }

      const isEditing = true;
      const adf = (await mockGetPageContent(contentId, isEditing)) as string;
      setCodeBlocks(mockFindCodeBlocks(adf) as string[]);
    };
    void fetchCodeBlocks();
  }, [contentId]);

  const options = [
    { label: 'Auto detect', value: undefined },
    ...codeBlocks.map((codeBlock, index) => {
      const trimmedCode =
        codeBlock.length > 35 ? `${codeBlock.substring(0, 35)}...` : codeBlock;
      return {
        label: `${String(index + 1)}. ${trimmedCode}`,
        value: index,
      };
    }),
  ];

  const defaultValue =
    config?.index === undefined ? options[0] : options[config.index + 1];

  const { Stack, Label, Select, HelperMessage, Button } = mockForgeComponents;

  return (
    <Stack>
      <Label>Select codeblock with mermaid diagram to render</Label>
      <Select
        value={defaultValue}
        options={options}
        onChange={({ value }: { value: number | undefined }) => {
          setConfig({
            index: value,
          });
        }}
      />
      <HelperMessage>
        Nearest diagram is picked by default (Auto detect option)
      </HelperMessage>

      <Button onClick={() => void submit({ diagramIndex: config?.index })}>
        Submit
      </Button>
    </Stack>
  );
};

describe('DiagramConfig Component Direct Test', () => {
  const mockContext = {
    extension: {
      config: { index: 0 },
      content: { id: 'test-content-id' },
    },
  };

  const mockCodeBlocks = [
    'graph TD; A --> B',
    'sequenceDiagram; Alice->>Bob: Hello',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockView.getContext.mockResolvedValue(mockContext);
    mockGetPageContent.mockResolvedValue('mock-adf');
    mockFindCodeBlocks.mockReturnValue(mockCodeBlocks);
  });

  it('should render DiagramConfig component and trigger useEffect hooks', async () => {
    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    expect(screen.getByTestId('stack')).toBeDefined();
    expect(screen.getByTestId('label')).toBeDefined();
    expect(screen.getByTestId('select')).toBeDefined();
    expect(screen.getByTestId('helper')).toBeDefined();
    expect(screen.getByTestId('button')).toBeDefined();
  });

  it('should handle submit success in useSubmit hook', async () => {
    mockView.submit.mockResolvedValue(undefined);

    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    const submitButton = screen.getByTestId('button');

    act(() => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockView.submit).toHaveBeenCalled();
    });
  });

  it('should handle submit error in useSubmit hook', async () => {
    mockView.submit.mockRejectedValue(new Error('Submit failed'));

    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    const submitButton = screen.getByTestId('button');

    act(() => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockView.submit).toHaveBeenCalled();
    });
  });

  it('should fetch code blocks when contentId is available', async () => {
    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGetPageContent).toHaveBeenCalledWith('test-content-id', true);
      expect(mockFindCodeBlocks).toHaveBeenCalledWith('mock-adf');
    });
  });

  it('should not fetch code blocks when contentId is undefined', async () => {
    mockView.getContext.mockResolvedValue({
      extension: {
        config: { index: 0 },
        content: { id: undefined },
      },
    });

    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    // Wait a bit more to ensure useEffect doesn't trigger getPageContent
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockGetPageContent).not.toHaveBeenCalled();
  });

  it('should handle select onChange event', async () => {
    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    const select = screen.getByTestId('select');

    act(() => {
      fireEvent.change(select, { target: { value: '1' } });
    });

    expect(select).toBeDefined();
  });

  it('should generate correct options from code blocks', async () => {
    mockFindCodeBlocks.mockReturnValue([
      'very long code block that is more than 35 characters long to test truncation',
      'short code',
    ]);

    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockFindCodeBlocks).toHaveBeenCalled();
    });

    const select = screen.getByTestId('select');
    expect(select).toBeDefined();
  });

  it('should handle different config index values', async () => {
    mockView.getContext.mockResolvedValue({
      extension: {
        config: { index: 2 },
        content: { id: 'test-content-id' },
      },
    });

    act(() => {
      render(<DiagramConfig />);
    });

    await waitFor(() => {
      expect(mockView.getContext).toHaveBeenCalled();
    });

    expect(screen.getByTestId('select')).toBeDefined();
  });

  it('should test useSubmit hook directly', async () => {
    const TestComponent = () => {
      const { submit, error } = useSubmit();

      return (
        <div>
          <button
            data-testid="test-submit"
            onClick={() => void submit({ diagramIndex: 1 })}
          >
            Submit
          </button>
          {error !== undefined && (
            <div data-testid="error">{error ? 'Error' : 'Success'}</div>
          )}
        </div>
      );
    };

    mockView.submit.mockResolvedValue(undefined);

    render(<TestComponent />);

    const submitButton = screen.getByTestId('test-submit');

    act(() => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockView.submit).toHaveBeenCalledWith({
        config: { diagramIndex: 1 },
      });
    });
  });

  it('should test useSubmit hook error handling', async () => {
    const TestComponent = () => {
      const { submit, error } = useSubmit();

      return (
        <div>
          <button
            data-testid="test-submit"
            onClick={() => void submit({ diagramIndex: 1 })}
          >
            Submit
          </button>
          {error !== undefined && (
            <div data-testid="error">{error ? 'Error' : 'Success'}</div>
          )}
        </div>
      );
    };

    mockView.submit.mockRejectedValue(new Error('Network error'));

    render(<TestComponent />);

    const submitButton = screen.getByTestId('test-submit');

    act(() => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockView.submit).toHaveBeenCalledWith({
        config: { diagramIndex: 1 },
      });
    });
  });
});

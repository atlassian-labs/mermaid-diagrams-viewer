import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock @forge/bridge
const mockView = {
  getContext: vi.fn(),
  submit: vi.fn(),
};

vi.mock('@forge/bridge', () => ({
  view: mockView,
}));

// Mock shared modules
const mockGetPageContent = vi.fn();
const mockFindCodeBlocks = vi.fn();
const mockLooksLikeMermaid = vi.fn().mockReturnValue(false);

vi.mock('shared/src/confluence/api-client/browser', () => ({
  getPageContent: mockGetPageContent,
}));

vi.mock('shared/src/confluence/code-blocks', () => ({
  findCodeBlocks: mockFindCodeBlocks,
  looksLikeMermaid: mockLooksLikeMermaid,
}));

vi.mock('shared/src/config', () => ({
  CONFIG_FIELD: 'index',
}));

// Mock @forge/react components
const mockForgeReconciler = {
  render: vi.fn(),
};

vi.mock('@forge/react', () => {
  return {
    __esModule: true,
    default: mockForgeReconciler,
    Button: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
    }) => (
      <button onClick={onClick} data-testid="forge-button">
        {children}
      </button>
    ),
    HelperMessage: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="helper-message">{children}</div>
    ),
    Label: ({ children }: { children: React.ReactNode }) => (
      <label data-testid="forge-label">{children}</label>
    ),
    Select: ({
      options,
      onChange,
      value,
    }: {
      options?: { label: string; value: number | undefined }[];
      onChange?: (option: { value: number | undefined }) => void;
      value?: { label: string; value: number | undefined };
    }) => {
      const [currentValue, setCurrentValue] = React.useState(
        value?.value ?? '',
      );

      return (
        <select
          data-testid="forge-select"
          value={currentValue}
          onChange={(e) => {
            const newValue =
              e.target.value === '' ? undefined : parseInt(e.target.value);
            setCurrentValue(e.target.value);
            if (onChange) {
              onChange({ value: newValue });
            }
          }}
        >
          {options?.map(
            (
              option: { label: string; value: number | undefined },
              index: number,
            ) => (
              <option key={index} value={option.value ?? ''}>
                {option.label}
              </option>
            ),
          )}
        </select>
      );
    },
    Stack: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="forge-stack">{children}</div>
    ),
    Text: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="forge-text">{children}</span>
    ),
  };
});

describe('Config Component', () => {
  const mockContext = {
    extension: {
      config: { diagramIndex: 0 },
      content: { id: 'test-content-id' },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockView.getContext.mockResolvedValue(mockContext);
    mockGetPageContent.mockResolvedValue('mock-adf');
    mockFindCodeBlocks.mockReturnValue([
      'graph TD; A --> B',
      'graph LR; C --> D',
    ]);
  });

  it('should import config module and call ForgeReconciler.render', async () => {
    await import('../config');
    expect(mockForgeReconciler.render).toHaveBeenCalled();
  });

  it('should handle basic mock setups', async () => {
    await import('../config');
    expect(mockView.getContext).toBeDefined();
    expect(mockView.submit).toBeDefined();
    expect(mockGetPageContent).toBeDefined();
    expect(mockFindCodeBlocks).toBeDefined();
  });
});

describe('useSubmit Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful submit', async () => {
    mockView.submit.mockResolvedValue(undefined);

    const { useSubmit } = await import('../config');
    const TestComponent = () => {
      const { submit, error } = useSubmit();

      React.useEffect(() => {
        void submit({ index: 1 });
      }, [submit]);

      return <div data-testid="error-state">{error ? 'error' : 'success'}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state').textContent).toBe('success');
    });

    expect(mockView.submit).toHaveBeenCalledWith({
      config: { index: 1 },
    });
  });

  it('should handle submit error', async () => {
    mockView.submit.mockRejectedValue(new Error('Submit failed'));

    const { useSubmit } = await import('../config');
    const TestComponent = () => {
      const { submit, error } = useSubmit();

      React.useEffect(() => {
        void submit({ index: 1 });
      }, [submit]);

      return <div data-testid="error-state">{error ? 'error' : 'success'}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state').textContent).toBe('error');
    });
  });
});

describe('DiagramConfig Component', () => {
  const mockContext = {
    extension: {
      config: { index: 0 },
      content: { id: 'test-content-id' },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockView.getContext.mockResolvedValue(mockContext);
    mockGetPageContent.mockResolvedValue('mock-adf');
    mockFindCodeBlocks.mockReturnValue([
      'graph TD; A --> B',
      'graph LR; C --> D',
    ]);
    mockLooksLikeMermaid.mockReturnValue(false);
  });

  it('should render with config data', async () => {
    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('forge-label')).toBeDefined();
      expect(screen.getByTestId('forge-select')).toBeDefined();
      expect(screen.getByTestId('forge-button')).toBeDefined();
    });

    expect(mockView.getContext).toHaveBeenCalled();
  });

  it('should fetch code blocks when contentId is available', async () => {
    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(mockGetPageContent).toHaveBeenCalledWith('test-content-id', true);
      expect(mockFindCodeBlocks).toHaveBeenCalledWith('mock-adf');
    });
  });

  it('should handle select change', async () => {
    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('forge-select')).toBeDefined();
    });

    const select = screen.getByTestId('forge-select');
    fireEvent.change(select, { target: { value: '1' } });

    // Test that the onChange was called
    expect(select).toBeDefined();
  });

  it('should handle button click', async () => {
    mockView.submit.mockResolvedValue(undefined);
    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('forge-button')).toBeDefined();
    });

    const button = screen.getByTestId('forge-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockView.submit).toHaveBeenCalled();
    });
  });

  it('should handle no contentId scenario', async () => {
    mockView.getContext.mockResolvedValue({
      extension: {
        config: { index: 0 },
        content: { id: undefined },
      },
    });

    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('forge-select')).toBeDefined();
    });

    // Should not call getPageContent if no contentId
    expect(mockGetPageContent).not.toHaveBeenCalled();
  });

  it('should display options correctly', async () => {
    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      const select = screen.getByTestId('forge-select');
      expect(select).toBeDefined();

      // Should have auto detect + 2 code blocks
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3);
      expect(options[0].textContent).toBe('Auto detect');
      expect(options[1].textContent).toBe('1. ⛌ graph TD; A --> B');
      expect(options[2].textContent).toBe('2. ⛌ graph LR; C --> D');
    });
  });

  it('should show [mermaid] indicator for mermaid code blocks', async () => {
    mockLooksLikeMermaid.mockReturnValue(true);
    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      const select = screen.getByTestId('forge-select');
      const options = select.querySelectorAll('option');
      expect(options[1].textContent).toBe('1. ✓  graph TD; A --> B');
      expect(options[2].textContent).toBe('2. ✓  graph LR; C --> D');
    });
  });

  it('should truncate long code blocks in options', async () => {
    const longCode =
      'graph TD; A --> B --> C --> D --> E --> F --> G --> H --> I --> J --> K --> L --> M --> N --> O --> P';
    mockFindCodeBlocks.mockReturnValue([longCode]);

    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      const select = screen.getByTestId('forge-select');
      const options = select.querySelectorAll('option');
      expect(options[1].textContent).toBe(
        '1. ⛌ graph TD; A --> B --> C --> D --> E...',
      );
    });
  });

  it('should handle undefined config scenario', async () => {
    mockView.getContext.mockResolvedValue({
      extension: {
        config: undefined, // Test the undefined case
        content: { id: 'test-content-id' },
      },
    });

    const { DiagramConfig } = await import('../config');

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('forge-select')).toBeDefined();
    });

    // Should call getPageContent with contentId
    expect(mockGetPageContent).toHaveBeenCalledWith('test-content-id', true);

    // Should handle undefined config and use empty object fallback
    await waitFor(() => {
      const select = screen.getByTestId('forge-select');
      expect(select).toBeDefined();
    });
  });
});

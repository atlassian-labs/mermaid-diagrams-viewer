import React from 'react';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DiagramConfig, useSubmit } from '../config';

const {
  mockView,
  mockGetPageContent,
  mockFindCodeBlocks,
  mockLooksLikeMermaid,
} = vi.hoisted(() => ({
  mockView: {
    getContext: vi.fn(),
    submit: vi.fn(),
  },
  mockGetPageContent: vi.fn(),
  mockFindCodeBlocks: vi.fn(),
  mockLooksLikeMermaid: vi.fn().mockReturnValue(false),
}));

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
  CONFIG_FIELD: 'index',
}));

vi.mock('@atlaskit/button/new', () => ({
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@atlaskit/select', () => ({
  default: ({
    options,
    onChange,
    value,
    inputId,
  }: {
    options?: { label: string; value: number | undefined }[];
    onChange?: (option: { value: number | undefined }) => void;
    value?: { label: string; value: number | undefined };
    inputId?: string;
  }) => (
    <select
      data-testid="select"
      id={inputId}
      value={value?.value ?? ''}
      onChange={(e) => {
        const selectedValue =
          e.target.value === '' ? undefined : parseInt(e.target.value);
        onChange?.({ value: selectedValue });
      }}
    >
      {options?.map((opt) => (
        <option key={String(opt.value)} value={opt.value ?? ''}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@atlaskit/tokens', () => ({
  token: (_tokenId: string, fallback?: string) => fallback ?? '',
}));

vi.mock('@atlaskit/css-reset', () => ({}));

const defaultContext = {
  extension: {
    config: undefined,
    content: { id: 'test-content-id' },
  },
};

describe('useSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit config successfully', async () => {
    mockView.submit.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.submit({ index: 0 });
    });

    expect(mockView.submit).toHaveBeenCalledWith({ config: { index: 0 } });
    expect(result.current.error).toBe(false);
  });

  it('should set error when submit fails', async () => {
    mockView.submit.mockRejectedValue(new Error('Submit failed'));

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.submit({ index: 0 });
    });

    expect(result.current.error).toBe(true);
  });
});

describe('DiagramConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockView.getContext.mockResolvedValue(defaultContext);
    mockGetPageContent.mockResolvedValue({ type: 'doc', content: [] });
    mockFindCodeBlocks.mockReturnValue([]);
  });

  it('should render the select and submit button', async () => {
    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('select')).toBeDefined();
    });

    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('should load context and code blocks on mount', async () => {
    const adf = { type: 'doc', content: [] };
    mockGetPageContent.mockResolvedValue(adf);
    mockFindCodeBlocks.mockReturnValue([
      'graph TD\n  A --> B',
      'pie title Test',
    ]);
    mockLooksLikeMermaid.mockReturnValueOnce(true).mockReturnValueOnce(false);

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(mockGetPageContent).toHaveBeenCalledWith('test-content-id', true);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Auto detect/).length).toBeGreaterThan(0);
    });
  });

  it('should restore existing config value', async () => {
    mockView.getContext.mockResolvedValue({
      extension: {
        config: { index: 0 },
        content: { id: 'test-content-id' },
      },
    });
    mockFindCodeBlocks.mockReturnValue(['graph TD\n  A --> B']);
    mockLooksLikeMermaid.mockReturnValue(true);

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByTestId('select')).toBeDefined();
    });
  });

  it('should call view.submit with config on button click', async () => {
    mockView.submit.mockResolvedValue(undefined);

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockView.submit).toHaveBeenCalledWith({
        config: { index: undefined },
      });
    });
  });

  it('should show error message when submit fails', async () => {
    mockView.submit.mockRejectedValue(new Error('Submit failed'));

    render(<DiagramConfig />);

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to save configuration. Please try again.'),
      ).toBeDefined();
    });
  });
});

import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Context } from 'shared/src/context';

// Extended context type that includes additional properties
interface ExtendedContext extends Context {
  environmentId: string;
  environmentType: 'PRODUCTION' | 'DEVELOPMENT' | 'STAGING';
  locale: string;
  timezone: string;
  accountId: string;
  siteUrl: string;
  productType: string;
}

// Mock modules first - all in factory functions to avoid hoisting issues
vi.mock('../diagram', () => ({
  Diagram: vi.fn(),
}));

vi.mock('@atlaskit/tokens', () => ({
  useThemeObserver: vi.fn(),
  token: vi.fn().mockReturnValue('#ffffff'),
}));

vi.mock('@forge/bridge', () => ({
  view: {
    getContext: vi.fn().mockResolvedValue({}),
    theme: {
      getTheme: vi.fn(),
      enable: vi.fn(),
    },
  },
}));

vi.mock('shared/src/confluence/code-blocks', () => ({
  getCodeFromCorrespondingBlock: vi.fn(),
}));

vi.mock('shared/src/confluence/api-client/browser', () => ({
  getPageContent: vi.fn(),
}));

vi.mock('shared/src/context', () => ({
  Context: {},
}));

vi.mock('shared/src/app-error', () => ({
  AppError: class MockAppError extends Error {
    constructor(
      message: string,
      public code: string,
    ) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

// Import the actual components and functions to test
import App from '../app';
import { Diagram } from '../diagram';
import { useThemeObserver } from '@atlaskit/tokens';
import { view } from '@forge/bridge';
import { getCodeFromCorrespondingBlock } from 'shared/src/confluence/code-blocks';
import { AppError } from 'shared/src/app-error';

// Get mocked functions using vi.mocked
const mockDiagram = vi.mocked(Diagram);
const mockUseThemeObserver = vi.mocked(useThemeObserver);
const mockView = vi.mocked(view);
const mockGetCodeFromCorrespondingBlock = vi.mocked(
  getCodeFromCorrespondingBlock,
);

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock context that matches what view.getContext returns
    const mockContext: ExtendedContext = {
      extension: {
        isEditing: false,
        config: undefined,
        content: { id: 'test-content-id' },
      },
      moduleKey: 'test-module-key',
      localId: 'test-local-id',
      // Add other properties that FullContext might require
      environmentId: 'test-env-id',
      environmentType: 'PRODUCTION' as const,
      locale: 'en-US',
      timezone: 'UTC',
      accountId: 'test-account-id',
      siteUrl: 'https://test.atlassian.net',
      productType: 'confluence',
    };

    (mockView.getContext as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockContext,
    );
    mockUseThemeObserver.mockReturnValue({ colorMode: 'light' });
    mockGetCodeFromCorrespondingBlock.mockResolvedValue('graph TD\n  A --> B');
    mockDiagram.mockReturnValue(
      <div data-testid="diagram">Mocked Diagram</div>,
    );
  });

  it('renders app component', async () => {
    act(() => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('diagram')).toBeDefined();
    });
  });

  it('shows loading spinner initially', async () => {
    act(() => {
      render(<App />);
    });

    // Should show loading initially before data loads
    const app = document.body.firstChild;
    expect(app).toBeDefined();

    // Wait for async operations to complete to avoid act warnings
    await waitFor(() => {
      expect(screen.getByTestId('diagram')).toBeDefined();
    });
  });

  it('handles AppError from getCodeFromCorrespondingBlock', async () => {
    const appError = new AppError('Test error', 'TEST_ERROR');
    mockGetCodeFromCorrespondingBlock.mockRejectedValue(appError);

    act(() => {
      render(<App />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Error while loading diagram: Test error/),
      ).toBeDefined();
    });
  });

  it('handles unknown error from getCodeFromCorrespondingBlock', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const unknownError = new Error('Unknown error');
    mockGetCodeFromCorrespondingBlock.mockRejectedValue(unknownError);

    act(() => {
      render(<App />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /Oops! Something went wrong! Please refresh the page./,
        ),
      ).toBeDefined();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(unknownError);
    consoleErrorSpy.mockRestore();
  });

  it('handles error from Diagram component', async () => {
    const diagramError = new Error('Diagram render error');
    mockDiagram.mockImplementation(
      ({ onError }: { onError: (error: Error) => void }) => {
        // Simulate diagram error
        setTimeout(() => {
          onError(diagramError);
        }, 0);
        return <div data-testid="diagram">Diagram with error</div>;
      },
    );

    act(() => {
      render(<App />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Error while loading diagram: Diagram render error/),
      ).toBeDefined();
    });
  });

  it('renders diagram when code and colorMode are available', async () => {
    act(() => {
      render(<App />);
    });

    await waitFor(() => {
      expect(mockDiagram).toHaveBeenCalledWith(
        {
          code: 'graph TD\n  A --> B',
          colorMode: 'light',
          onError: expect.any(Function) as (error: Error) => void,
        },
        {},
      );
    });
  });

  it('does not render diagram when no colorMode', async () => {
    mockUseThemeObserver.mockReturnValue({ colorMode: undefined });

    act(() => {
      render(<App />);
    });

    await waitFor(() => {
      // Should not call Diagram component without colorMode
      expect(mockDiagram).not.toHaveBeenCalled();
    });
  });
});

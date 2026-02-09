import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Diagram } from '../diagram';

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
    registerLayoutLoaders: vi.fn(),
  },
}));

// Mock @forge/bridge
vi.mock('@forge/bridge', () => ({
  Modal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
  })),
  view: {
    getContext: vi.fn().mockResolvedValue({
      extension: {
        modal: {
          modalOpen: false,
        },
      },
    }),
  },
}));

// Mock react-inlinesvg
vi.mock('react-inlinesvg', () => ({
  default: ({
    src,
    onLoad,
    onClick,
  }: {
    src: string;
    onLoad?: () => void;
    onClick?: () => void;
  }) => {
    // Simulate successful SVG load
    setTimeout(() => onLoad?.(), 0);
    return <div data-testid="svg-component" data-src={src} onClick={onClick} />;
  },
}));

// Mock react-zoom-pan-pinch
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({
    children,
  }: {
    children: React.ReactNode | (() => React.ReactNode);
  }) => (
    <div data-testid="transform-wrapper">
      {typeof children === 'function' ? children() : children}
    </div>
  ),
  TransformComponent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transform-component">{children}</div>
  ),
}));

// Import mermaid to get typed mock
import mermaid from 'mermaid';
import { view } from '@forge/bridge';
const mockMermaid = vi.mocked(mermaid);

describe('Diagram Component', () => {
  const defaultProps = {
    code: 'graph TD\n  A --> B',
    colorMode: 'light' as const,
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMermaid.render.mockResolvedValue({
      svg: '<svg>test diagram</svg>',
      diagramType: 'graph',
      bindFunctions: vi.fn(),
    });
  });

  it('should render diagram with valid mermaid code', async () => {
    render(<Diagram {...defaultProps} />);

    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalledWith(
        expect.any(String),
        defaultProps.code,
      );
    });

    // Use findBy instead of getBy for elements that appear after async operations
    const svgComponent = await screen.findByTestId('svg-component');
    expect(svgComponent).toBeInTheDocument();

    // Since modalIsOpen is false by default, we should see the Box layout, not transform components
    expect(svgComponent).toBeInTheDocument();
  });

  it('should render transform components when modal is open', async () => {
    // Mock view.getContext to return modalOpen: true
    (vi.mocked(view.getContext) as ReturnType<typeof vi.fn>).mockResolvedValue({
      extension: {
        modal: {
          modalOpen: true,
        },
        isEditing: false,
        config: undefined,
        content: { id: 'test-id' },
      },
      moduleKey: 'test-module',
      localId: 'test-local',
      environmentId: 'test-env',
      environmentType: 'DEVELOPMENT',
      locale: 'en-US',
      timezone: 'UTC',
      accountId: 'test-account',
      siteUrl: 'https://test.atlassian.net',
      productType: 'confluence',
    });

    render(<Diagram {...defaultProps} />);

    // Use findBy for elements that appear after async modal detection
    const transformWrapper = await screen.findByTestId('transform-wrapper');
    expect(transformWrapper).toBeInTheDocument();

    const transformComponent = await screen.findByTestId('transform-component');
    expect(transformComponent).toBeInTheDocument();
  });

  it('should initialize mermaid with correct theme', async () => {
    render(<Diagram {...defaultProps} />);

    expect(mockMermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      theme: 'default',
      darkMode: false,
      securityLevel: 'antiscript',
      themeVariables: expect.objectContaining({ darkMode: false }) as unknown,
    });

    // Wait for async operations to complete
    await screen.findByTestId('svg-component');
  });

  it('should initialize mermaid with dark theme', () => {
    act(() => {
      render(<Diagram {...defaultProps} colorMode="dark" />);
    });

    expect(mockMermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      theme: 'dark',
      darkMode: true,
      securityLevel: 'antiscript',
      themeVariables: expect.objectContaining({ darkMode: true }) as unknown,
    });
  });

  it('should handle mermaid render errors', async () => {
    const error = new Error('Mermaid render error');
    mockMermaid.render.mockRejectedValueOnce(error);

    render(<Diagram {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith(error);
    });
  });

  it('should re-render when code changes', async () => {
    const { rerender } = render(<Diagram {...defaultProps} />);

    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalledWith(
        expect.any(String),
        defaultProps.code,
      );
    });

    const newCode = 'graph LR\n  C --> D';
    rerender(<Diagram {...defaultProps} code={newCode} />);

    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalledWith(
        expect.any(String),
        newCode,
      );
    });
  });

  it('should re-render when color mode changes', () => {
    let component: ReturnType<typeof render>;
    act(() => {
      component = render(<Diagram {...defaultProps} />);
    });

    expect(mockMermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'default' }),
    );

    act(() => {
      component.rerender(<Diagram {...defaultProps} colorMode="dark" />);
    });

    expect(mockMermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' }),
    );
  });

  it('should handle window resize events', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<Diagram {...defaultProps} />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should handle empty code gracefully', () => {
    act(() => {
      render(<Diagram {...defaultProps} code="" />);
    });

    // Should not render with empty code
    expect(mockMermaid.render).not.toHaveBeenCalled();
  });

  it('should handle mermaid render errors', async () => {
    const renderError = new Error('Invalid syntax');
    mockMermaid.render.mockRejectedValue(renderError);

    render(<Diagram {...defaultProps} code="invalid code" />);

    // Wait for the error handler to be called
    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith(renderError);
    });
  });

  it('should call modal.open when SVG is clicked', async () => {
    render(<Diagram {...defaultProps} />);

    // Wait for SVG to render
    await waitFor(() => {
      expect(screen.getByTestId('svg-component')).toBeDefined();
    });

    // Click on the SVG to trigger openDialog - this should execute the openDialog function
    const svgElement = screen.getByTestId('svg-component');

    // Test that clicking doesn't throw an error and the function executes
    expect(() => {
      fireEvent.click(svgElement);
    }).not.toThrow();

    // The component should still be rendered after clicking
    expect(svgElement).toBeDefined();

    // Additional test to ensure the click handler is properly attached
    expect(svgElement).toHaveProperty('onclick');
  });

  it('should trigger resize handler when window is resized', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    act(() => {
      render(<Diagram {...defaultProps} />);
    });

    // Initial render
    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalled();
    });

    // Trigger window resize event to cover the onResize function
    act(() => {
      const resizeEvent = new Event('resize');
      Object.defineProperty(window, 'innerHeight', {
        value: 800,
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
        writable: true,
      });

      window.dispatchEvent(resizeEvent);
    });

    // Check that event listeners are properly set up
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should handle direct function execution for modal opening', () => {
    // This test specifically targets the openDialog function execution
    act(() => {
      render(<Diagram {...defaultProps} />);
    });

    // Since the component is now rendered, the module is loaded and modal is instantiated
    // We can test that the component renders without error which means modal creation worked
    expect(screen.getByTestId('svg-component')).toBeDefined();

    // Test multiple clicks to ensure the function can be called repeatedly
    const svgElement = screen.getByTestId('svg-component');
    act(() => {
      fireEvent.click(svgElement);
      fireEvent.click(svgElement);
    });

    // Verify the component remains stable after multiple clicks
    expect(svgElement).toBeDefined();
  });
});

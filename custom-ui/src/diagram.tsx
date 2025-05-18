import { useEffect, useState } from 'react';
import SVG from 'react-inlinesvg';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import mermaid from 'mermaid';
import { Modal, view } from '@forge/bridge';
import { Box, xcss } from '@atlaskit/primitives';
import '@fortawesome/fontawesome-free/css/all.css';

const modal = new Modal({
  size: 'max',
  context: {
    modalOpen: true,
  },
});

function openDialog() {
  void modal.open();
}

const boxStyles = xcss({
  borderStyle: 'solid',
  borderRadius: 'border.radius',
  borderWidth: 'border.width',
  borderColor: 'color.border.disabled',

  ':hover': {
    borderColor: 'color.border',
  },
});

export const Diagram: React.FunctionComponent<{
  code: string;
  colorMode: 'light' | 'dark';
  onError: (error: Error) => void;
}> = ({ code, colorMode, onError }) => {
  const [size, setSize] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const { svg, error } = useMermaidRenderSVG(code, colorMode);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  useEffect(() => {
    const detectIfIsInTheDialog = async () => {
      const context = await view.getContext();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const modalIsOpen: boolean = context.extension.modal?.modalOpen;
      setModalIsOpen(modalIsOpen);
    };

    void detectIfIsInTheDialog();
  }, []);

  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  useEffect(() => {
    const onResize = () => {
      const newSize = {
        height: window.innerHeight,
        width: window.innerWidth,
      };

      setSize(newSize);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [size.height, size.width]);

  const styles = {
    display: 'flex',
    justifyContent: 'center',
    width: size.width,
  };

  if (modalIsOpen) {
    return (
      <TransformWrapper>
        {() => (
          <>
            <TransformComponent>
              <SVG
                src={svg}
                style={{
                  height: size.height * 0.95,
                  width: size.width,
                }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    );
  }

  return (
    <Box
      padding="space.400"
      backgroundColor="color.background.neutral.subtle"
      xcss={boxStyles}
      style={styles}
    >
      <SVG src={svg} onClick={openDialog} />
    </Box>
  );
};

function useMermaidRenderSVG(code: string, colorMode: 'light' | 'dark') {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const [theme, darkMode] = (
      {
        light: ['default', false],
        dark: ['dark', true],
      } as const
    )[colorMode];

    mermaid.initialize({
      startOnLoad: false,
      theme,
      darkMode,
      themeVariables: {
        darkMode,
      },
      securityLevel: 'antiscript', // allows usage of HTML tags, except <script>
    });
  }, [colorMode]);

  useEffect(() => {
    const run = async () => {
      if (!code) {
        return;
      }

      try {
        const { svg } = await mermaid.render(
          'diagram' + String(Date.now()),
          code,
        );
        setSvg(svg);
      } catch (error) {
        setError(error as Error);
      }
    };

    void run();
  }, [code, colorMode]);

  return { svg, error };
}

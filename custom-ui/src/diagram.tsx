import { useEffect, useState } from 'react';
import SVG from 'react-inlinesvg';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
// eslint-disable-next-line node/no-missing-import
import mermaid from 'mermaid';

export const Diagram: React.FunctionComponent<{
  code: string;
  colorMode: 'light' | 'dark';
  onError: CallableFunction;
}> = ({ code, colorMode, onError }) => {
  const [size, setSize] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const { svg, error } = useMermaidRenderSVG(code, colorMode);

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

  return (
    <TransformWrapper>
      <TransformComponent
        contentStyle={{
          width: size.width,
          justifyContent: 'center',
        }}
      >
        <SVG src={svg} />
      </TransformComponent>
    </TransformWrapper>
  );
};

function useMermaidRenderSVG(code: string, colorMode: 'light' | 'dark') {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const isDarkMode = colorMode === 'dark';

    mermaid.initialize({
      startOnLoad: false,
      theme: colorMode,
      darkMode: isDarkMode,
      themeVariables: {
        darkMode: isDarkMode,
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
        const { svg } = await mermaid.render('diagram' + Date.now(), code);
        setSvg(svg);
      } catch (error) {
        setError(error as Error);
      }
    };

    void run();
  }, [code, colorMode]);

  return { svg, error };
}

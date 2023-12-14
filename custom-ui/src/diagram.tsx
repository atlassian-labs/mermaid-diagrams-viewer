import { useEffect, useMemo, useState } from 'react';
import SVG from 'react-inlinesvg';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import mermaid from 'mermaid';

mermaid.mermaidAPI.initialize({ startOnLoad: false });

export const Diagram: React.FunctionComponent<{
  code?: string;
  onError: CallableFunction;
}> = ({ code, onError }) => {
  const [size, setSize] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

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

  const svg = useMemo(() => {
    if (!code) {
      return '';
    }

    try {
      const newSvg = mermaid.mermaidAPI.render('diagram' + Date.now(), code);
      return newSvg;
    } catch (error) {
      onError(error);
      return '';
    }
  }, [code, onError]);

  return (
    <TransformWrapper>
      <TransformComponent
        contentStyle={{
          width: size.width,
        }}
      >
        <SVG src={svg} />
      </TransformComponent>
    </TransformWrapper>
  );
};

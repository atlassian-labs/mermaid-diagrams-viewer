/**
 * Local development mock for @forge/bridge.
 *
 * This file is aliased in vite.config.ts when running `vite` (dev mode) so
 * the app works without a real Confluence / Forge runtime.
 *
 * Tweak MOCK_CONTEXT below to simulate different macro configurations, or
 * swap MOCK_PAGE_ID to point at a different fixture in adf-fixture.ts.
 */
import { adfFixture } from './adf-fixture';
import type { Context } from '../context';

// ---------------------------------------------------------------------------
// Simulated Confluence context
// ---------------------------------------------------------------------------
const MOCK_CONTEXT: Context & {
  extension: { macro?: { isConfiguring?: boolean } };
} = {
  moduleKey: 'mermaid-diagram-viewer',
  localId: 'mock-local-id-0001',
  extension: {
    isEditing: false,
    // Set to `true` to open the config panel instead of the viewer.
    macro: { isConfiguring: false },
    config: {
      // index of the mermaid block on the page (0-based).
      // Must be set when the ADF fixture has no matching extension node.
      index: 0,
    },
    content: { id: 'mock-page-123' },
  },
};

// ---------------------------------------------------------------------------
// Modal  (used by diagram.tsx to open a full-screen view)
// ---------------------------------------------------------------------------
export class Modal {
  private options: object;
  constructor(options: object) {
    this.options = options;
  }
  open() {
    // eslint-disable-next-line no-console
    console.log('[forge/bridge mock] Modal.open()', this.options);
    return Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// view  (subset used by the app)
// ---------------------------------------------------------------------------
export const view = {
  getContext: () => Promise.resolve(MOCK_CONTEXT),

  /** Simulates the Atlaskit theme being enabled; sets data-color-mode synchronously so
   * useThemeObserver() has a value on first render. */
  theme: {
    enable: () => {
      document.documentElement.setAttribute('data-color-mode', 'light');
      return Promise.resolve();
    },
  },

  /** Simulates config-panel submission; logs the payload locally. */
  submit: (payload: unknown) => {
    // eslint-disable-next-line no-console
    console.log('[forge/bridge mock] view.submit', payload);
    return Promise.resolve();
  },
};

// ---------------------------------------------------------------------------
// requestConfluence  (subset used by the app)
// ---------------------------------------------------------------------------

const MOCK_PAGES: Record<string, object> = {
  'mock-page-123': {
    body: {
      atlas_doc_format: {
        value: JSON.stringify(adfFixture),
      },
    },
  },
};

export const requestConfluence = (url: string): Promise<Response> => {
  // Extract the page/blogpost id from the URL, e.g.
  //   /wiki/api/v2/pages/mock-page-123?...
  const match = url.match(/\/(pages|blogposts)\/([^?/]+)/);
  const id = match?.[2];
  const body = id ? MOCK_PAGES[id] : undefined;

  if (body) {
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }

  return Promise.resolve(new Response('{}', { status: 404 }));
};

// ---------------------------------------------------------------------------
// invoke  (routes resolver calls to local stubs)
// ---------------------------------------------------------------------------

// Edit this map to test different icon pack combinations locally.
// Each entry: pack name → external CDN URL (sandbox restrictions don't apply
// in local dev, so fetching from CDN here is fine).
const MOCK_ICON_PACK_URLS: Record<string, string> = {
  logos: 'https://unpkg.com/@iconify-json/logos@1/icons.json',
  aws: 'https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/aws-icons-mermaid.json',
};

export const invoke = <T = unknown>(
  functionKey: string,
  payload?: Record<string, unknown>,
): Promise<T> => {
  switch (functionKey) {
    case 'listIconPacks':
      return Promise.resolve(Object.keys(MOCK_ICON_PACK_URLS) as T);

    case 'getIconPackUrl': {
      const pack = payload?.pack as string;
      const url = MOCK_ICON_PACK_URLS[pack];
      if (!url) {
        return Promise.reject(
          new Error(`[forge/bridge mock] Unknown icon pack: "${pack}"`),
        );
      }
      return Promise.resolve(url as T);
    }

    default:
      return Promise.reject(
        new Error(`[forge/bridge mock] No stub for invoke("${functionKey}")`),
      );
  }
};

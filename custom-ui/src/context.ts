import { Config } from './config-data';

interface Extension {
  isEditing: boolean;
  config: Config | undefined;
  content: { id: string };
}

export interface Context {
  extension: Extension;
  moduleKey: string;
  localId: string;
}

import ForgeUI, { MacroConfig, render, TextField } from '@forge/ui';

const Config = () => {
  return (
    <MacroConfig>
      <TextField name="url" label="Bitbucket file URL" />
    </MacroConfig>
  );
};

export const run = render(<Config />);

import { execa } from 'execa';

export interface ExecOperations {
  exec(command: string, cwd: string): Promise<void>;
}

export const defaultExecOperations: ExecOperations = {
  async exec(command: string, cwd: string): Promise<void> {
    await execa({ shell: true, cwd })`${command}`;
  },
};

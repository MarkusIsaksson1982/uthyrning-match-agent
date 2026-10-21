import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

import { handleMessage } from "./handlers.js";
import type { JsonRpcResponse } from "./handlers.js";

export interface WritableLike {
  write(chunk: string): unknown;
}

export interface LineServerHandle {
  close(): void;
}

export function createLineHandler(output: WritableLike): (line: string) => void {
  return (line: string): void => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }
    const response: JsonRpcResponse = handleMessage(trimmed);
    output.write(`${JSON.stringify(response)}\n`);
  };
}

export function attachStdioServer(
  input: NodeJS.ReadableStream,
  output: WritableLike,
): LineServerHandle {
  const rl = createInterface({ input, terminal: false });
  const onLine = createLineHandler(output);
  rl.on("line", onLine);
  return {
    close(): void {
      rl.close();
    },
  };
}

export function startStdioServer(): LineServerHandle {
  return attachStdioServer(stdin, stdout);
}

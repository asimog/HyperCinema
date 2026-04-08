import net from "node:net";

function parseEmulatorHost(host: string): { host: string; port: number } | null {
  const trimmed = host.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(.+):(\d+)$/);
  if (!match) {
    return {
      host: trimmed,
      port: 8080,
    };
  }

  const port = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    host: match[1] ?? trimmed,
    port,
  };
}

function probeTcpEndpoint(input: {
  host: string;
  port: number;
  timeoutMs: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: input.host,
      port: input.port,
    });

    const finish = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    socket.setTimeout(input.timeoutMs);
    socket.once("connect", () => finish());
    socket.once("timeout", () => {
      finish(new Error(`Timed out connecting to ${input.host}:${input.port}`));
    });
    socket.once("error", (error) => {
      finish(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

export async function assertFirestoreEmulatorAvailable(timeoutMs = 500): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    return;
  }

  const parsed = parseEmulatorHost(host);
  if (!parsed) {
    throw new Error(
      `FIRESTORE_EMULATOR_HOST is invalid: ${host}. Expected host:port, for example 127.0.0.1:8080.`,
    );
  }

  try {
    await probeTcpEndpoint({
      host: parsed.host,
      port: parsed.port,
      timeoutMs,
    });
  } catch {
    throw new Error(
      `Firestore emulator is not reachable at ${parsed.host}:${parsed.port}. Start it before creating or checking MythX jobs.`,
    );
  }
}

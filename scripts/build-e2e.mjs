import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "build"],
  {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_DIST_DIR: ".next-e2e" },
    stdio: "inherit",
  }
);

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});

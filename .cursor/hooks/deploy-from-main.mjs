#!/usr/bin/env node
/**
 * Deploy-from-main hook. Policy lives in redline.mjs (see the file header).
 * Asks before wrangler / pnpm deploy unless HEAD is main.
 * Not failClosed — a crash must not brick shipping.
 */
import { runHookCli } from "./redline.mjs";

process.exitCode = runHookCli();

#!/usr/bin/env node
/**
 * Ask before wrangler/pnpm deploy unless HEAD is main.
 * Not failClosed — a crash must not brick shipping.
 */
import { runHookCli } from "./redline.mjs";

process.exitCode = runHookCli();

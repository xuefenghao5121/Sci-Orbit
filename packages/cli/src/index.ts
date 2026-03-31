#!/usr/bin/env node

import { Command } from "commander";
import { install } from "./install.js";
import { uninstall } from "./uninstall.js";

const program = new Command();

program
  .name("ai4s")
  .description("AI4S Claude Code orchestrator CLI")
  .version("0.1.0");

program
  .command("init")
  .description("Install ai4s-orchestrator into Claude Code")
  .action(() => install());

program
  .command("uninstall")
  .description("Remove ai4s-orchestrator from Claude Code")
  .action(() => uninstall());

program.parse();

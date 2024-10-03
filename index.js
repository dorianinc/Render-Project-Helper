#!/usr/bin/env node

const readline = require("readline");
const {
  fetchServices,
  fetchDatabase,
  fetchOwner,
  rebuildDatabase,
} = require("./databaseManager");

const c = require('ansi-colors'); // Import ansi-colors

// User Interface --------------------------------------------------------------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const showMenu = async () => {
  console.log(c.cyan.bold("\n1. Rebuild Database"));
  console.log(c.cyan.bold("2. View Database Details"));
  console.log(c.cyan.bold("3. View Service Details"));
  console.log(c.cyan.bold("4. View Owner Details"));
  console.log(c.cyan.bold("5. Exit"));

  rl.question(c.yellow("Choose an option: "), async (answer) => {
    switch (answer) {
      case "1":
        console.log(c.green("\nRebuilding Database"));
        await rebuildDatabase();
        showMenu();
        break;
      case "2":
        console.log(c.green("Fetching Database Details"));
        let database = await fetchDatabase();
        console.log(c.cyan.bold("🖥️  Database: "), database);
        showMenu();
        break;
      case "3":
        console.log(c.green("Fetching Service Details"));
        let services = await fetchServices();
        console.log(c.cyan.bold("🖥️  Services: "), services);
        showMenu();
        break;
      case "4":
        console.log(c.green("Fetching Owner Details"));
        let owner = await fetchOwner();
        console.log(c.cyan.bold("🖥️  Owner: "), owner);
        showMenu();
        break;
      case "5":
        rl.close();
        break;
      default:
        console.log(c.red("Invalid option. Please try again."));
        rl.close();
    }
  });
};

rl.on("close", () => {
  console.log(c.bgRed.white.bold("\nExiting program"));
  process.exit(0);
});

showMenu();

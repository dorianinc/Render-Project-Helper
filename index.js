const readline = require("readline");
const {
  fetchServices,
  fetchDatabase,
  fetchConnectionInfo,
  rebuildDatabase,
} = require("./databaseManager");


// User Interface --------------------------------------------------------------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const showMenu = async () => {
  const chalk = (await import("chalk")).default;

  console.log(chalk.cyan.bold("\n1. Rebuild Database"));
  console.log(chalk.cyan.bold("2. View Database Details"));
  console.log(chalk.cyan.bold("3. View Service Details"));
  console.log(chalk.cyan.bold("4. Exit"));

  rl.question(chalk.yellow("Choose an option: "), async (answer) => {
    switch (answer) {
      case "1":
        console.log(chalk.green("\nRunning Rebuild Script..."));
        await rebuildDatabase();
        showMenu();
        break;
      case "2":
        console.log(chalk.green("Fetching Database Details..."));
        let database = await fetchDatabase();
        let connectionInfo = await fetchConnectionInfo(database.id);
        console.log(chalk.cyan.bold("🖥️  Database: "), database);
        console.log(chalk.cyan.bold("🖥️  Connection Info: "), connectionInfo);
        showMenu();
        break;
      case "3":
        console.log(chalk.green("Fetching Service Details..."));
        let services = await fetchServices();
        console.log(chalk.cyan.bold("🖥️  Services: "), services);
        showMenu();
        break;
      case "4":
        rl.close();
        break;
      default:
        console.log(chalk.red("Invalid option. Please try again."));
        rl.close();
    }
  });
};

rl.on("close", async () => {
  const chalk = (await import("chalk")).default;

  console.log(chalk.bgRed.white.bold("\nExiting program..."));
  process.exit(0);
});

showMenu();

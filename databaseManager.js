require("dotenv").config();
const axios = require("axios");

const baseUrl = "https://api.render.com/v1";
const databaseName = process.env.DATABASE_NAME; // name of your new database
const databaseKey = process.env.DATABASE_ENV_KEY; // env database key name
const region = process.env.REGION; // region that your projects are linked to
const key = process.env.RENDER_API_KEY; //api key from render

const options = {
  headers: {
    accept: "application/json",
    "Content-Type": "application/json",
    authorization: `Bearer ${key}`,
  },
};

// Owner --------------------------------------------------------------------------------------------

const fetchOwner = async () => {
  try {
    const response = await axios.get(`${baseUrl}/owners?limit=1`, options);
    if (response.status === 200) {
      const { owner } = response.data[0];
      return owner;
    }
  } catch (error) {
    handleError(error, "fetchOwner");
  }
};

// Service --------------------------------------------------------------------------------------------

const fetchServices = async () => {
  try {
    const response = await axios.get(`${baseUrl}/services`, options);
    const services = response.data
      .filter((item) => item.service.type === "web_service")
      .map((item) => item.service);

    return services.filter((service) => service !== null);
  } catch (error) {
    handleError(error, "fetchServices");
  }
};

const deployService = async (serviceId) => {
  const body = {
    clearCache: "do_not_clear",
  };

  try {
    const response = await axios.post(
      `${baseUrl}/services/${serviceId}/deploys`,
      body,
      options
    );
    return response.data;
  } catch (error) {
    handleError(error, "deployServices");
  }
};

// Database --------------------------------------------------------------------------------------------

const fetchDatabase = async () => {
  try {
    const response = await axios.get(`${baseUrl}/postgres`, options);
    return response.data.length ? response.data[0].postgres : {};
  } catch (error) {
    handleError(error, "fetchDatabase");
  }
};

const fetchConnectionInfo = async (databaseId) => {
  try {
    const response = await axios.get(
      `${baseUrl}/postgres/${databaseId}/connection-info`,
      options
    );
    return response.data;
  } catch (error) {
    handleError(error, "fetchConnectionInfo");
  }
};

const createDatabase = async (ownerId) => {
  const body = {
    enableHighAvailability: false,
    plan: "free",
    version: "16",
    name: databaseName,
    ownerId,
    region,
  };

  try {
    const response = await axios.post(`${baseUrl}/postgres`, body, options);
    return response.data;
  } catch (error) {
    handleError(error, "createDatabase");
  }
};

const deleteDatabase = async (databaseId) => {
  try {
    const response = await axios.delete(
      `${baseUrl}/postgres/${databaseId}`,
      options
    );
    return response;
  } catch (error) {
    handleError(error, "deleteDatabase");
  }
};

const rebuildDatabase = async () => {
  const isValid = await validateVariables();
  if (!isValid) return;

  console.log("Rebuilding database...");
  try {
    const owner = await fetchOwner();
    const services = await fetchServices();
    const database = await fetchDatabase();

    if (!isEmpty(database)) {
      const deleteDb = await deleteDatabase(database.id);
      if (deleteDb.status !== 204) {
        console.error("Failed to delete existing database.");
        return;
      }
    }

    const { name, status, id, createdAt } = await createDatabase(owner.id);
    const newDb = { name, status, id, createdAt };
    const { internalConnectionString } = await fetchConnectionInfo(id);
    newDb.internalDatabaseUrl = internalConnectionString;

    for (const service of services) {
      await updateEnvVariable(
        service.id,
        databaseKey,
        newDb.internalDatabaseUrl
      );
      await deployService(service.id);
    }

    console.log("done!");
  } catch (error) {
    handleError(error, "rebuildDatabase");
  }
};

// ENV --------------------------------------------------------------------------------------------

const updateEnvVariable = async (serviceId, envKey, envValue) => {
  const body = {
    value: envValue,
  };

  try {
    const response = await axios.put(
      `${baseUrl}/services/${serviceId}/env-vars/${envKey}`,
      body,
      options
    );
    return response.data;
  } catch (error) {
    handleError(error, "updateEnvVariable");
  }
};
// Helpers --------------------------------------------------------------------------------------------

const isEmpty = (obj) => {
  return Object.values(obj).length === 0;
};

const validateVariables = async () => {
  const chalk = (await import("chalk")).default;
  let missing = [];

  if (!databaseName) {
    missing.push(chalk.red("databaseName"));
  }
  if (!databaseKey) {
    missing.push(chalk.red("databaseKey"));
  }
  if (!region) {
    missing.push(chalk.red("region"));
  }
  if (!baseUrl) {
    missing.push(chalk.red("baseUrl"));
  }
  if (!key) {
    missing.push(chalk.red("key"));
  }

  if (missing.length) {
    console.log(
      chalk.yellow(
        `The following variables still don't have a value: ${missing.join(
          ", "
        )}`
      )
    );
    console.log(chalk.yellow("Please add them for the script to run..."));
    return false;
  }

  console.log(chalk.green("All variables are set. Rebuilding database...\n"));
  return true;
};

const handleError = (error, functionName) => {
  const statusCode = error.response?.status;
  const errorMessage =
    error.response?.data?.message || "An unknown error occurred";

  console.error(
    `Error in ${functionName}: ${errorMessage} ${
      !statusCode ? "" : `Status code: ${statusCode}`
    }`
  );

  throw new Error(
    `Error in ${functionName}: ${errorMessage} ${
      !statusCode ? "" : `Status code: ${statusCode}`
    }`
  );
};

module.exports = {
  fetchServices,
  fetchDatabase,
  fetchConnectionInfo,
  fetchOwner,
  rebuildDatabase,
};

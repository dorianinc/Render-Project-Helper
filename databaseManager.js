#!/usr/bin/env node

require("dotenv").config();
const axios = require("axios");
const c = require("ansi-colors");

const baseUrl = "https://api.render.com/v1";
const databaseName = process.env.DATABASE_NAME; // name of new render database
const databaseKey = process.env.DATABASE_ENV_KEY; // name of key for render database
const region = process.env.REGION; // region you use for your applications
const key = process.env.RENDER_API_KEY; // render API key

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

const deployService = async (service) => {
  console.log(`Deploying ${service.name}`);
  const body = {
    clearCache: "do_not_clear",
  };

  try {
    const response = await axios.post(
      `${baseUrl}/services/${service.id}/deploys`,
      body,
      options
    );
    return response.data;
  } catch (error) {
    handleError(error, "deployServices");
  }
};

// Database --------------------------------------------------------------------------------------------

const fetchDatabase = async (databaseId) => {
  try {
    const response = databaseId
      ? await axios.get(`${baseUrl}/postgres/${databaseId}`, options)
      : await axios.get(`${baseUrl}/postgres`, options);

    if (databaseId && response.data) {
      const connectionInfo = await fetchConnectionInfo(databaseId);
      return {
        ...response.data,
        connectionInfo: connectionInfo || null,
      };
    }

    const freeDatabases = response.data
      .filter((db) => db.postgres.plan === "free")
      .map((db) => db.postgres);

    if (freeDatabases.length > 0) {
      const connectionInfo = await fetchConnectionInfo(freeDatabases[0].id);
      return {
        ...freeDatabases[0],
        connectionInfo: connectionInfo || null,
      };
    }

    return null;
  } catch (error) {
    handleError(error, "fetchDatabase");
    return null;
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
    return null;
  }
};

const createDatabase = async (ownerId) => {
  console.log("Creating new database");
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
  console.log("Deleting existing database");
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

  try {
    const owner = await fetchOwner();
    const services = await fetchServices();
    const database = await fetchDatabase();

    if (database) {
      const deleteDb = await deleteDatabase(database.id);
      if (deleteDb.status !== 204) {
        console.error(c.red("Failed to delete existing database."));
        return;
      }
    }

    const { name, status, id, createdAt } = await createDatabase(owner.id);
    const newDb = { name, status, id, createdAt };
    const { internalConnectionString } = await fetchConnectionInfo(id);
    newDb.internalDatabaseUrl = internalConnectionString;

    let dbStatus = "creating";

    console.log("Waiting for database...");
    while (dbStatus === "creating") {
      dbStatus = await checkDbStatus();
    }

    if (dbStatus === "available") {
      console.log(c.green("Database is available"));
      console.log("Updating Services...");
      for (const service of services) {
        await updateEnvVariable(
          service.id,
          databaseKey,
          newDb.internalDatabaseUrl
        );
        await deployService(service);
      }
      console.log(c.green("Done!"));
    } else {
      console.log(c.red("Something went wrong with your database"));
    }
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

const validateVariables = async () => {
  let missing = [];

  if (!databaseName) {
    missing.push(c.red("databaseName"));
  }
  if (!databaseKey) {
    missing.push(c.red("databaseKey"));
  }
  if (!region) {
    missing.push(c.red("region"));
  }
  if (!baseUrl) {
    missing.push(c.red("baseUrl"));
  }
  if (!key) {
    missing.push(c.red("key"));
  }

  if (missing.length) {
    console.log(
      c.yellow(
        `The following variables still don't have a value: ${missing.join(
          ", "
        )}`
      )
    );
    console.log(c.yellow("Please add them for the script to run..."));
    return false;
  }
  return true;
};

const checkDbStatus = async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const { status } = await fetchDatabase();
    return status;
  } catch (error) {
    console.error(c.red("Failed checking database status: "), error.message);
    return false;
  }
};

const checkServiceStatus = async (serviceId) => {
  serviceId = "srv-cihg1d2ip7vpelu8jr7g";

  try {
    let eventType = "deploy_started";
    let serviceStatus;

    // Wait for 1 second before starting the checks
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Poll for the service events until deploy_ended is received
    while (eventType !== "deploy_ended") {
      const response = await axios.get(
        `${baseUrl}/services/${serviceId}/events?limit=10`,
        options
      );

      const event = response.data[0].event;
      eventType = event.type;

      // Capture the service status when deploy_ended event is detected
      if (eventType === "deploy_ended") {
        serviceStatus = event.details.status;
      }
    }

    // Determine and log the service status
    if (serviceStatus === 2) {
      console.log("Service is deployed");
      return "deployed";
    } else if (serviceStatus === 3) {
      console.log("Service is not deployed");
      return "not deployed";
    } else {
      console.log("Service has an error");
      return "error";
    }

  } catch (error) {
    handleError(error, "fetchServiceEvents");
  }
};


const handleError = (error, functionName) => {
  const statusCode = error.response?.status;
  const errorMessage =
    error.response?.data?.message || "An unknown error occurred";

  console.error(
    c.red(
      `Error in ${functionName}: ${errorMessage} ${
        !statusCode ? "" : `Status code: ${statusCode}`
      }`
    )
  );

  throw new Error(
    `Error in ${functionName}: ${errorMessage} ${
      !statusCode ? "" : `Status code: ${statusCode}`
    }`
  );
};

checkServiceStatus();

module.exports = {
  fetchServices,
  fetchDatabase,
  fetchConnectionInfo,
  fetchOwner,
  rebuildDatabase,
};

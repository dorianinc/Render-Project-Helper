//------------ DATABASE ------------------//

const buildDatabaseAPI = async () => {
  // type: "PostgreSQL"
  const { name, status, id, createdAt } = await fetchDatabase();
  const database = { name, status, type: "PostgreSQL", id, createdAt };
  return database;
};

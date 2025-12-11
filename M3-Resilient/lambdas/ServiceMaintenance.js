export const handler = async (event) => {
  console.log("serviceMaintenance execution");
  return {
    statusCode: 200,
    body: JSON.stringify({ service: "Maintenance" }),
  };
};

export const handler = async (event) => {
  console.log("serviceDegraded execution");
  return {
    statusCode: 200,
    body: JSON.stringify({ service: "Degraded" }),
  };
};

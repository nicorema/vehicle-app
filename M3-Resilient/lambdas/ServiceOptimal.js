export const handler = async (event) => {
  console.log("serviceOptimal execution");
  return {
    statusCode: 200,
    body: JSON.stringify({ service: "Optimal" }),
  };
};

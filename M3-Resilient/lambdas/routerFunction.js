import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const lambda = new LambdaClient({ region: "us-east-2" });
const dynamo = new DynamoDBClient({ region: "us-east-2" });

export const handler = async (event) => {
  const lambdas = ["ServiceOptimal", "ServiceDegraded", "ServiceMaintenance"];

  for (const name of lambdas) {
    const command = new InvokeCommand({
      FunctionName: name,
      InvocationType: "Event",
    });
    await lambda.send(command);
  }

  const now = Date.now();

  const updateCmd = new UpdateItemCommand({
    TableName: "RouterStatus",
    Key: { id: { S: "router:test" } },
    UpdateExpression:
      "ADD errorCount :inc SET lastUpdated = :now, minutesWithoutError = if_not_exists(minutesWithoutError, :zero)",
    ExpressionAttributeValues: {
      ":inc": { N: "1" },
      ":now": { N: now.toString() },
      ":zero": { N: "0" },
    },
    ReturnValues: "ALL_NEW",
  });

  const result = await dynamo.send(updateCmd);
  console.log("DynamoDB router:test =", result.Attributes);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Router ejecutó las 3 Lambdas y actualizó DynamoDB",
      item: result.Attributes,
    }),
  };
};

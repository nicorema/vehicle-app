import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";

const lambda = new LambdaClient({ region: "us-east-2" });
const dynamo = new DynamoDBClient({ region: "us-east-2", maxAttempts: 3 });

export const handler = async (event) => {
  try {
    const errorValue = event.error;
    const eventTime = new Date(event.timestamp).getTime();

    if (errorValue === true) {
      await dynamo.send(new PutItemCommand({
        TableName: "RouterErrors",
        Item: {
          routerId: { S: "router:test" },
          timestamp: { N: eventTime.toString() },
          ttl: {
            N: Math.floor(eventTime / 1000 + 600).toString()
          }
        }
      }));
    };

    const oneMinuteAgo = eventTime - (1 * 60 * 1000);
    const queryCmd = new QueryCommand({
      TableName: "RouterErrors",
      KeyConditionExpression: "routerId = :rid AND #ts BETWEEN :from AND :to",
      ExpressionAttributeNames: {
        "#ts": "timestamp"
      },
      ExpressionAttributeValues: {
        ":rid": { S: "router:test" },
        ":from": { N: oneMinuteAgo.toString() },
        ":to": { N: eventTime.toString() }
      },
      Select: "COUNT"
    });

    const result = await dynamo.send(queryCmd);
    const errorCountLastMinute = result.Count;
    console.log(`Error count: ${errorCountLastMinute}`);

    let targetLambda = "";
    if (errorCountLastMinute <= 4) {
      targetLambda = "ServiceOptimal";
    } else if (errorCountLastMinute >= 5 && errorCountLastMinute <= 9) {
      targetLambda = "ServiceDegraded";
    } else if (errorCountLastMinute >= 10) {
      targetLambda = "ServiceMaintenance";
    }

    await lambda.send(new InvokeCommand({
      FunctionName: targetLambda,
      InvocationType: "Event"
    }));
    console.log(`Invoked Lambda: ${targetLambda}`);

    let returnStatusCode = 0;
    let returnMessage = "";
    if (errorValue === true) {
      returnStatusCode = 400;
      returnMessage = `Error processing the request.`;
    } else {
      returnStatusCode = 200;
      returnMessage = `Success processing the request.`;
    };

    let returnStatusMessage = "";
    if (targetLambda === "ServiceMaintenance") {
      returnStatusMessage = "Level 3: service under maintenance, please try again later.";
    } else if (targetLambda === "ServiceDegraded") {
      returnStatusMessage = "Level 2: service degraded, minimum operation.";
    } else if (targetLambda === "ServiceOptimal") {
      returnStatusMessage = "Level 1: service is in optimal conditions.";
    }

    return {
      statusCode: returnStatusCode,
      body: JSON.stringify({
        message: returnMessage,
        lastMinuteErrors: errorCountLastMinute,
        systemStatus: returnStatusMessage
      })
    };
  } catch (error) {
    console.error("Unhandled error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message
      })
    };
  }
};

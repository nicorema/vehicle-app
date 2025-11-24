const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: "us-east-2" });
const emergencyQueueUrl =
  "https://sqs.us-east-2.amazonaws.com/600946366035/vehicle-emergency";

async function pollQueue() {
  const command = new ReceiveMessageCommand({
    QueueUrl: emergencyQueueUrl,
    MaxNumberOfMessages: 10,
  });

  try {
    const data = await sqsClient.send(command);
    if (data.Messages) {
      for (const msg of data.Messages) {
        console.log("Emergency message received:", msg.Body);

        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: emergencyQueueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          })
        );
      }
    }
  } catch (err) {
    console.error("Error polling queue:", err);
  }

  // Immediately poll again (long polling handles the wait time)
  pollQueue();
}

// Start polling
pollQueue();

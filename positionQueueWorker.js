const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: "us-east-2" });
const positionQueueUrl =
  "https://sqs.us-east-2.amazonaws.com/600946366035/vehicle-position";

async function pollQueue() {
  const command = new ReceiveMessageCommand({
    QueueUrl: positionQueueUrl,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 10,
    WaitTimeSeconds: 20,
  });

  try {
    const data = await sqsClient.send(command);
    if (data.Messages) {
      const processingPromises = data.Messages.map(async (msg) => {
        try {
          console.log("Position message received:", msg.Body);

          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: positionQueueUrl,
              ReceiptHandle: msg.ReceiptHandle,
            })
          );
          console.log("Message processed and removed from the queue");
        } catch (err) {
          console.error(
            "Error processing the message, it will be available for retry in the queue",
            msg.Body,
            err
          );
        }
      });
      await Promise.allSettled(processingPromises);
    }
  } catch (err) {
    console.error("Error polling queue:", err);
  }

  // Immediately poll again (long polling handles the wait time)
  pollQueue();
}

// Start polling
pollQueue();

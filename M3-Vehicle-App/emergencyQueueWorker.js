const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const { sendEmergencyMail } = require("./sendEmergencyMail");

const sqsClient = new SQSClient({ region: "us-east-2" });
const emergencyQueueUrl =
  "https://sqs.us-east-2.amazonaws.com/600946366035/vehicle-emergency";

async function pollQueue() {
  const command = new ReceiveMessageCommand({
    QueueUrl: emergencyQueueUrl,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 10,
    WaitTimeSeconds: 20,
  });

  try {
    const data = await sqsClient.send(command);
    if (data.Messages) {
      for (const msg of data.Messages) {
        console.log("Emergency message received:", msg.Body);
        await sendEmergencyMail(msg.Body);
        console.log("Emergency mail sent successfully");
        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: emergencyQueueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          })
        );
        console.log("Message processed and removed from the queue");
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

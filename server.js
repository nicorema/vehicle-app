const express = require("express");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const app = express();

app.use(express.json());

const sqsClient = new SQSClient({ region: "us-east-2" });

const QUEUE_MAP = {
  position: "https://sqs.us-east-2.amazonaws.com/600946366035/vehicle-position",
  emergency:
    "https://sqs.us-east-2.amazonaws.com/600946366035/vehicle-emergency",
};

app.post("/event", async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, event: req.body }));

  const type = req.body.type?.toLowerCase();
  const queueUrl = QUEUE_MAP[type];

  if (!queueUrl) {
    return res.status(200).json({ message: "OK!" });
  }

  try {
    const messageBody = JSON.stringify(req.body);
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      })
    );
    console.log(`Message sent to ${type} queue`);
    res.status(200).json({ message: "OK!" });
  } catch (err) {
    console.error("Error sending message to queue:", err);
    res.status(500).json({ error: "Failed to send message to queue" });
  }
});

app.get("/", (req, res) => {
  res.send("Vehicle Events Service Running");
});

// ✅ Healthcheck endpoint
app.get("/ping", (req, res) => {
  res.json({ message: "pong!" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

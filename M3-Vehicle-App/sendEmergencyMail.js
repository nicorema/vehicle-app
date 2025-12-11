const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const CLIENT_ID = "";
const CLIENT_SECRET = "";
const REDIRECT_URI = "";
const REFRESH_TOKEN = "";
const MAIL = "";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendEmergencyMail(messageBody) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: MAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // Parse the message body to extract emergency information
    let emergencyData = {};
    try {
      emergencyData = JSON.parse(messageBody);
    } catch (e) {
      // If parsing fails, use the raw message body
      emergencyData = { raw: messageBody };
    }

    // Extract key information
    const vehiclePlate = emergencyData.vehicle_plate || "Unknown";
    const eventType = emergencyData.type || "Unknown";
    const status = emergencyData.status || "Unknown";

    // Build email content with emergency details
    const emailText = `Emergency Alert!

Vehicle Plate: ${vehiclePlate}
Event Type: ${eventType}
Status: ${status}`;

    const emailHtml = `<h1>Emergency Alert!</h1>
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <p><strong>Vehicle Plate:</strong> ${vehiclePlate}</p>
        <p><strong>Event Type:</strong> ${eventType}</p>
        <p><strong>Status:</strong> ${status}</p>
      </div>`;

    const mailOptions = {
      from: MAIL,
      to: MAIL,
      subject: `Emergency Alert - ${vehiclePlate}`,
      text: emailText,
      html: emailHtml,
    };

    const result = await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Error sending emergency mail:", error);
  }
}

module.exports = { sendEmergencyMail };

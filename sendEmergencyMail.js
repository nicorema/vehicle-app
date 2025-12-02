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

async function sendEmergencyMail() {
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

    const mailOptions = {
      from: MAIL,
      to: MAIL,
      subject: "Emergency Mail",
      text: "Emergency mail",
      html: "<h1>Emergency mail</h1>",
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Emergency mail successfully sent");
  } catch (error) {
    console.log("Error sending emergency mail:", error);
  }
}

module.exports = { sendEmergencyMail };

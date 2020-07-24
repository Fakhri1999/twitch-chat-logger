const express = require("express");
const app = express();
const PORT = 1231;
const irc = require("irc");
const axios = require("axios");
require("dotenv").config();
const { clientId, oauthToken, tmiToken } = process.env;
const urlCallback = "https://1663909923aa.ngrok.io/twitch";

// let client = new irc.Client('irc.chat.twitch.tv', 'Fakhri1999', {
//   channels: ['#'],
//   password: tmiToken
// });

// client.addListener('message', function (from, to, message, data) {
//   console.log(from + ' : ' + message);
// });

// client.addListener('error', function(message) {
//   console.log('error: ', message);
// });

try {
  axios({
    method: "POST",
    url: "https://api.twitch.tv/helix/webhooks/hub",
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${oauthToken}`
    },
    data: {
      "hub.callback": urlCallback,
      "hub.mode": "subscribe",
      "hub.topic":
        "https://api.twitch.tv/helix/users/follows?first=1&from_id=151872813",
      // "hub.topic": "https://api.twitch.tv/helix/streams?user_id=151872813",
      "hub.lease_seconds": "50000"
    }
  })
    .then(res => {
      console.log(res.status);
    })
    .catch(error => {
      console.log(error.response.data);
    });
} catch (error) {
  console.log(error);
}

app.get("/twitch", (req, res) => {
  console.log(req.query);
  res.setHeader("content-type", "text/plain");
  res.send(req.query["hub.callback"]);
});

app.post("/twitch", (req, res) => {
  console.log(req.body);
  // console.log(res);
  res.status(200).json();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

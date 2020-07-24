const express = require("express");
const app = express();
const PORT = 80;
const irc = require("irc");
const axios = require("axios");
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const moment = require('moment');

require("dotenv").config();

const { clientId, oauthToken, tmiToken } = process.env;
const urlCallback = "https://d74891ac43d2.ngrok.io/twitch";

const [formatFile] = ['.txt'];

const dateNow = moment(new Date()).format('DD-MM-YYYY');
const locationParent = path.join(process.cwd(), 'records');
const locationFile = path.join(locationParent, dateNow + formatFile);

let client = new irc.Client('irc.chat.twitch.tv', 'aldiwildan_', {
  channels: ['#fl0m'],
  password: tmiToken
});

client.addListener('message', function (from, to, message, data) {
  const dataChunk = `${from}: ${message} \n`;
  fsPromises.appendFile(locationFile, dataChunk, {});
});

client.addListener('error', function (message) {
  console.log('error: ', message);
});

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
    "hub.topic": "https://api.twitch.tv/helix/streams?user_id=156806450",
    "hub.lease_seconds": "50000"
  }
})
  .then(res => {
    console.log(res.status);
  })
  .catch(error => {
    console.log(error.response.data);
  });

app.use(express.json());

app.get("/twitch", (req, res) => {
  console.log(req.query);
  res.setHeader("content-type", "text/plain");
  res.send(req.query["hub.challenge"]);
});

app.post("/twitch", (req, res) => {
  console.log(req.body)
  res.status(200).json({
    message: 'ok',
  });
});

app.get('/records', async (req, res) => {
  const query = req.query;

  try {
    if (!query) return res.status(400).json({ message: 'some params is missing' });

    const file = await fsPromises.readFile(path.join(locationParent, query.date + formatFile));
    if (file.length == 0) return res.status(404).json({ message: 'file not found' });

    const fileConverted = file.toString('utf8');
    let arrayFile = fileConverted.split('\n');

    res.status(200).json({ data: arrayFile });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Internal Server Error' })
  }
});

app.listen(PORT, () => {
  if (!fs.existsSync(locationParent)) {
    fs.mkdirSync(locationParent);
  }
  console.log(`Server is running on http://localhost:${PORT}`);
});

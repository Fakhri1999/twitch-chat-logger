const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const irc = require("irc");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const moment = require("moment");
const exphbs = require("express-handlebars");

require("dotenv").config();

var hbs = exphbs.create({
  helpers: {
    inc: value => parseInt(value) + 1
  }
});
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

const { port, clientId, oauthToken, tmiToken, ircUsername } = process.env;
const urlCallback = "https://d74891ac43d2.ngrok.io/twitch";

const [formatFile] = [".txt"];

const dateNow = moment(new Date()).format("DD-MM-YYYY");
const locationParent = path.join(process.cwd(), "records");
const locationFile = path.join(locationParent, dateNow + formatFile);
let lastMessage = ["lastMessage"];
let newMessage = [];
app.use(express.static(path.join(process.cwd(), "public")));

let client = new irc.Client("irc.chat.twitch.tv", ircUsername, {
  channels: ["#eryctriceps"],
  password: tmiToken
});

client.addListener("message", function(from, to, message, data) {
  const dataChunk = `${from}: ${message} \n`;
  newMessage.push(dataChunk);
  fsPromises.appendFile(locationFile, dataChunk, {});
});

client.addListener("error", function(message) {});

app.get("", (req, res) => {
  res.render("index", {
    layout: false
  });
});

app.get("/api/data", async (req, res) => {
  const query = req.query;

  try {
    if (!query)
      return res.status(400).json({ message: "Some params is missing" });

    if (!fs.existsSync(path.join(locationParent, query.date + formatFile))) {
      return res.status(404).json({ message: "File not found" });
    }
    const file = await fsPromises.readFile(
      path.join(locationParent, query.date + formatFile)
    );

    const fileConverted = file.toString("utf8");
    let arrayFile = fileConverted.split("\n");

    res.status(200).json({ data: arrayFile });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

let clientConnected = 0;
io.on("connection", socket => {
  console.log("New connection established");
  clientConnected++;
  console.log(`Client : ${clientConnected}`);

  socket.on("setDate", data => {
    console.log(data);
    let emitData = {
      clientId: clientConnected,
      date: data
    };
    socket.emit("setStatus", emitData);
  });  
  setInterval(() => { 
    console.clear()
    console.log(`lastMessage : ${lastMessage}`);
    console.log(`newMessage : ${newMessage}`);
    
    if(!(lastMessage == newMessage) && newMessage.length > 0) {
      console.log("Masuk sini");      
      socket.emit(dateNow, newMessage)
      lastMessage = newMessage
      newMessage = []
    }
  }, 1000);

  socket.on("disconnect", () => {
    console.log("Connection disconnected\n");

    clientConnected--;
  });
});

// axios({
//   method: "POST",
//   url: "https://api.twitch.tv/helix/webhooks/hub",
//   headers: {
//     "Client-Id": clientId,
//     Authorization: `Bearer ${oauthToken}`
//   },
//   data: {
//     "hub.callback": urlCallback,
//     "hub.mode": "subscribe",
//     "hub.topic": "https://api.twitch.tv/helix/streams?user_id=156806450",
//     "hub.lease_seconds": "50000"
//   }
// })
//   .then(res => {
//     console.log(res.status);
//   })
//   .catch(error => {
//     console.log(error.response.data);
//   });

// app.use(express.json());

// app.get("/twitch", (req, res) => {
//   console.log(req.query);
//   res.setHeader("content-type", "text/plain");
//   res.send(req.query["hub.challenge"]);
// });

// app.post("/twitch", (req, res) => {
//   console.log(req.body)
//   res.status(200).json({
//     message: 'ok',
//   });
// });

http.listen(port, () => {
  if (!fs.existsSync(locationParent)) {
    fs.mkdirSync(locationParent);
  }
  console.log(`Server is running on http://localhost:${port}`);
});

// require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
// const createError = require("http-errors");
const cors = require("cors");
// require("dotenv").config();
const path = require("path");
const { sendNotification } = require("./controller/notification.controller");

const app = express();
const cookieParser = require("cookie-parser");

const db = require("./config/db.config");
const Router = require("./router");
const ErrorHandler = require("./helpers/errorHandler");
const PORT = db.port;
const joinedUser = {},
  connectedUser = {};
/**************** MONGO DB CONNECTION CONFIG *********************/
mongoose
  .connect(db.host, {
    user: db.username,
    pass: db.password,
    dbName: db.dbName,
    // useNewUrlParser: true, FYI: Used to ensure and use new parser
    // useUnifiedTopology: true, FYI: Used to enable new features used to connect mongo
  })
  .then(() => console.log("Connected to " + db.host))
  .catch((error) =>
    console.log("Error occured while connecting to MongoDB:", error)
  );

/**************** ENABLING CORS  *********************/
app.use(
  cors({
    origin: ["http://localhost:4002", "http://localhost:4001"],
    credentials: true,
  })
);

/**************** ALLOWS JSON CONTENT TYPE PAYLOAD IN REQUEST BODY *********************/
app.use(express.json());

/**************** ENABLING COOKIES  *********************/
app.use(cookieParser());

/**************** API ROUTER *********************/
Router(app, express.Router());

//************************DEPLOYMENT ******************/
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  console.log(__dirname1, "lll");
  // app.use(express.static())
} else {
  /**************** EXPRESS APPLICATION INITIALIZATION *********************/
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to Mongo." });
  });
}

/**************** ERROR HANDLER *********************/
app.use(ErrorHandler);

const server = app.listen(PORT, (err) => {
  if (err) console.log(`Error: ${err.message}`);
  else console.log(`Server is running successfully`);
});

const io = require("socket.io")(server, {
  cors: {
    origin: ["http://localhost:4002", "http://localhost:4001"],
  },
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log("Connected socket.io");
  socket.on("setup user room", (userData) => {
    joinedUser[userData._id] = "";
    connectedUser[socket.id] = userData._id;
    socket.join(userData._id);
    console.log("User Joined Chat " + userData._id);
    socket.emit("User Connected");
  });
  socket.on("join chat room", async (roomID, userID) => {
    if (!joinedUser[userID]) joinedUser[userID] = roomID;
    socket.join(roomID);
    console.log("User Joined Room " + roomID);
  });
  socket.on("new message", (chatInfo) => {
    var users = chatInfo?.message?.users;
    var chatid = chatInfo?.message?._id;
    var notifyUsers = [];
    if (!users?.length) return;
    users.forEach((user, index) => {
      if (user._id !== chatInfo.sender._id) {
        if (!joinedUser[user._id] || joinedUser[user._id] !== chatid) {
          notifyUsers.push(user._id);
        }
        socket.in(user._id).emit("emit message receive", chatInfo, index);
      }
    });
    sendNotification(chatInfo, notifyUsers, socket);
  });
  socket.on("typing", (...args) =>
    socketTypingEvent(...args, "typing", socket)
  );
  socket.on("stop typing", (...args) =>
    socketTypingEvent(...args, "stop typing", socket)
  );

  socket.on("disconnect", () => {
    if (
      connectedUser[socket.id] &&
      joinedUser.hasOwnProperty(connectedUser[socket.id])
    ) {
      console.log("User Disconnected ", connectedUser[socket.id]);
      delete joinedUser[connectedUser[socket.id]];
      delete connectedUser[socket.id];
    }
  });

  function socketTypingEvent(
    users,
    authUserRoomId,
    selectedChatRoom,
    event,
    socket
  ) {
    users.forEach((user) => {
      if (user._id !== authUserRoomId)
        socket.in(user._id).emit(event, selectedChatRoom);
    });
  }
});

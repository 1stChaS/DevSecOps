const express = require("express");

const app = express();
const port = 3000;

//
// Registers a HTTP GET route.
//
app.get("/", (req, res) => {
    res.send("Hello World!");
});

//
// Starts the HTTP server.
//
app.listen(port);  
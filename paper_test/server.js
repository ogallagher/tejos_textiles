const express = require("express");
const app = express();

const port = 8080;
const ip = "127.0.0.1";
app.use(express.static("public"));

app.listen(port,ip);
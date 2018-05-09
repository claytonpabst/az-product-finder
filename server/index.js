
const express = require('express');
const bodyParser = require('body-parser');
var massive = require('massive');
var session = require('express-session');
var config = require('./config.js');

const puppeteer = require('puppeteer');

const app = module.exports = express();

app.use(bodyParser.json());
app.use(session({
  secret: config.secret,
    resave: true,
    saveUninitialized: false,
    cookie:{
      maxAge: (1000*60*60*24*14)
    }
}))

massive(config.connection)
.then( db => {
  app.set('db', db);
}).catch(err=>{});

app.use(express.static(__dirname + './../build'))

var userController = require("./userController.js");

app.get('/api/isLoggedIn', userController.isLoggedIn);
app.get('/api/logOut', userController.logOut);
app.post('/api/logIn', userController.logIn);
app.post('/api/createUser', userController.createUser);


/*********************** Instagram stuff *********************************/

var amazonController = require("./amazonController.js");

app.get('/api/getUrls', amazonController.getUrls);
app.get('/api/getInvestigatingList', amazonController.getInvestigatingList);
app.post('/api/launchAZ', amazonController.findProducts);
app.post('/api/closeBrowser', amazonController.closeBrowser);
app.post('/api/markAsInvestigating', amazonController.markAsInvestigating);
app.post('/api/markOneUrl', amazonController.markOneUrl);
app.post('/api/markAll20', amazonController.markAll20);



app.listen(config.port, console.log("you are now connected on " + config.port));


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

massive(config[config.env])
.then( db => {
  app.set('db', db);
}).catch(err=>{});

app.use(express.static(__dirname + './../build'))

var userController = require("./userController.js");
  app.get('/api/isLoggedIn', userController.isLoggedIn);
  app.get('/api/logOut', userController.logOut);
  app.post('/api/logIn', userController.logIn);
  app.post('/api/createUser', userController.createUser);

var amazonController = require("./amazonController.js");
  app.get('/api/getBackEndErrorLog', amazonController.returnErrorLog);
  app.post('/api/launchAZ', amazonController.findProducts);
  app.post('/api/closeBrowser', amazonController.closeBrowser);

var asinController = require("./asinController.js");
  app.get('/api/getUrls', asinController.getUrls);  
  app.get('/api/getUrlsRanked', asinController.getUrlsRanked);  
  app.get('/api/getInvestigatingList', asinController.getInvestigatingList);
  app.post('/api/saveComments', asinController.saveComments);
  app.post('/api/markAsInvestigating', asinController.markAsInvestigating);
  app.post('/api/markOneUrl', asinController.markOneUrl);
  app.post('/api/markAsFreshUrl', asinController.markAsFreshUrl);
  app.post('/api/markAsinForRecheck', asinController.markAsinForRecheck);


app.listen(config.port, console.log("you are now connected on " + config.port));

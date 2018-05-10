var app = require('./index.js');
var config = require('./config.js');

function log(content){
  if (config.debug){
    console.log(content);
  }
}

module.exports = {
  
  getUrls: (req, res) => {
    var db = app.get('db');

    db.getUrls()
    .then( urls => {
      log(urls);
      return res.status(200).send(urls);
    })
    .catch( err => log(err) )

  },

  getInvestigatingList: (req, res) => {
    var db = app.get('db');

    db.getInvestigatingList()
    .then( list => {
      log(list);
      return res.status(200).send(list);
    })
    .catch( err => log(err) )

  },

  markAsinForRecheck: function(req, res){
    var db = app.get('db');

    let { id } = req.body;

    log(id)

    db.markAsinForRecheck([id])
    .then( done => { 
      log('Updated 1 asin');
      return res.status(200).send({error: false, message: 'Marked 1 ASIN for recheck'});
    })
    .catch( err => {})

  },  

  markAsInvestigating: function(req, res){
    var db = app.get('db');

    let { id } = req.body;

    db.markAsInvestigating([id])
    .then( done => { 
      log('Updated 1 asin as being investigated');
      return res.status(200).send({error: false, message: 'Marked 1 ASIN as being investigated'});
    })
    .catch( err => {})

  },  

  markOneUrl: function(req, res){
    var db = app.get('db');

    let { id } = req.body;

    db.markAsinAsLookedAt([id])
    .then( done => { 
      log('Updated 1 asin');
      return res.status(200).send({error: false, message: 'Looked at 1 ASIN'});
    })
    .catch( err => {})

  },  

  markAsFreshUrl: function(req, res){
    var db = app.get('db');

    let { id } = req.body;

    db.markAsFreshUrl([id])
    .then( done => { 
      log('Updated 1 asin');
      return res.status(200).send({error: false, message: 'Reset 1 ASIN to original state'});
    })
    .catch( err => {})

  },  

}
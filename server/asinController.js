var app = require('./index.js');
var config = require('./config.js');

let debug = true; 

function log(content){
  if (debug){
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

    console.log(id)

    db.markAsinForRecheck([id])
    .then( done => { 
      log('Updated 1 asin');
      return res.status(200).send({error: false, message: 'Marked 1 ASIN for recheck'});
    })
    .catch( err => {})

  },  

  markAsInvestigating: function(req, res){
    var db = app.get('db');

    let { asin } = req.body;

    db.markAsInvestigating([asin])
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

  markAll20: function(req, res){
    var db = app.get('db');

    let { idList } = req.body;
    let numUpdated = 0;

    for (let i = 0; i < idList.length; i++){
      db.markAsinAsLookedAt([idList[i]])
      .then( done => { 

        numUpdated++;
        log('Updated 1 asin');

        if (numUpdated === asins.length){
          return res.status(200).send({error: false, message: 'Updated all 20 ASINS'});
        }

      })
      .catch( err => {})
    }
  },


}
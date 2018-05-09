var app = require('./index.js');
var config = require('./config.js');

const puppeteer = require('puppeteer');

// change debug to true to see the console.log messages
let debug = true; 
let browser = null;

// ** This only works for the terminal. Inside page.evaluate, we have to pass log or use console.log
function log(content){
  if (debug){
    console.log(content);
  }
}

async function getAsinsOnPage(page){
  try{
    log('Getting ASINs for the products on this page');

    // This is the list of items on this page (search results)
    let listSelector = '#s-results-list-atf';
    await page.waitForSelector(listSelector);
    
    // This gets the ASINs for all of the products on this page
    const asinList = await page.evaluate((listSelector) => {

      let asins = [];

      // this logs to the Puppeteer window console
      console.log(listSelector); 
      console.log(document.querySelectorAll(listSelector));

      let ul =  document.querySelectorAll(listSelector)[0];
      let list = ul.children || [];

      for (let i = 0; i < list.length; i++){
        let att = list[i].attributes;

        // For each product, go through the attributes, find the data-asin object, and get the asin from it
        for (let j = 0; j < att.length; j++){
          if (att[j].name && att[j].name === 'data-asin' && list[i].attributes[j].nodeValue){
            asins.push(list[i].attributes[j].nodeValue);
          }
        }
      }

      // console.log(asins);

      return asins;
  
    }, listSelector);

    log(asinList);

    return asinList;
  }
  catch(e){ log("Error with getAsinsOnPage func"); }
}

async function getProductRanking(page){
  try{
    log(" ");        
    log('Getting Product Ranking');

    let buybox = '#buybox';
    // page.waitForSelector(buybox);
    

    let ranking = await page.evaluate((buybox) => {
      timesChecked = 0;
      function waitForS(selector){
        if(document.querySelector(selector)){
          let rank = "100000000000";
          
          if (document.body.innerHTML.match(/#(\d+.*?) in .*?\(/)){
            rank = document.body.innerHTML.match(/#(\d+.*?) in .*?\(/)[1]
          }
          console.log(rank);
    
          return rank;

        } else {
          timesChecked++;
          if(timesChecked > 10){ 
            return "10000000000"
          }
          setTimeout(function(){
            waitForS(selector);
          }, 500)
        }
      }

      return waitForS(buybox);
      
    }, buybox);
    
    log(ranking);
    return ranking;
  }
  catch(e){ log("Error with getProductRanking func"); }
}

async function checkIfAmazonSellsProduct(page){
  try{
    log('checking sellers...');

    let sellersBox = '#olpOfferList';
    await page.waitForSelector(sellersBox);
    
    let amazonSellsThisProduct = await page.evaluate((sellersBox) => {
        
      if (!document.querySelector(sellersBox)){
        console.log('\n**ERROR: Sellers box selector doesn\'t exist, need new selector for this page**\n');
        return false;
      }

      let sellersHtml = document.querySelector(sellersBox).innerHTML;
      let amazonPatterns = [
        /alt="Amazon\.com"/,
        /alt="amazon\.com"/,
        /src="https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/01dXM-J1oeL\.gif/,
      ];

      // Add manufacturer to the patterns to avoid as well
      let manufacturerElement = document.getElementById('olpProductByline');
      let text = manufacturerElement.innerText.trim();
      text = text.replace('by ', '');
      let pattern = new RegExp(text, 'i');
      amazonPatterns.push(pattern);

      for (let i = 0; i < amazonPatterns.length; i++){
        if (sellersHtml.match(amazonPatterns[i])){
          console.log('Found Amazon Pattern');
          return true;
        }
      }

      // Attempt to get a list of all the sellers here
      let sellersArr = [];
      if (document.querySelectorAll('#olpOfferList .olpOffer')){
        let sellersList = document.querySelectorAll('#olpOfferList .olpOffer');
        for (let i = 0; i < sellersList.length; i++){
          let name;
          try{
            name = sellersList[i].children[3].children[0].innerText;
          }
          catch(e){}
          if (name) { sellersArr.push(name.toLowerCase()); }
        }
      }

      // If there's only 2 sellers and they are both the same seller, we don't want to list it
      if (sellersArr.length === 2 && sellersArr[0] === sellersArr[1]){
        return true;
      }
      
      return false;

    }, sellersBox);

    return amazonSellsThisProduct;

  }
  catch(e){ log("Error with checkIfAmazonSellsProduct func"); }
}

async function getNextPageUrl(page){
  try{
    log('Getting next page URL');

    let nextLink = '#pagnNextLink';

    let newUrl = await page.evaluate((nextLink) => {
      return document.getElementById('pagnNextLink').href;
    }, nextLink);

    return newUrl;
  }
  catch(e){ log("Error with getNextPageUrl func"); }
}

async function getNumberOfPagesToSearch(page){
  try{
    let className = "pagnDisabled";
    let numberOfPages = await page.evaluate((className) => {
      return parseInt(document.getElementsByClassName("pagnDisabled")[0].innerText)
    }, className);
    return numberOfPages;
  }
  catch(e){ log("Error with getNumberOfPagesToSearch func"); }
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

  closeBrowser: async function(req, res){
    await browser.close();
    browser = null;
    log(" ");
    log("Browser Closed From Front End.");
    return;
  },

  findProducts: async function(req, res){
    
    try{

      let pageNum = 1;
      let pagesToSearch = 400;
      const category = req.body.category;
      let searchTerm = req.body.search.split(' ').join('+');
  
      if(!browser){
        browser = await puppeteer.launch({headless: false});
      }
      const page = await browser.newPage(); 
      
      // Main search results URL
      let mainUrl = `https://www.amazon.com/s?url=search-alias%3D${req.body.category}&field-keywords=${searchTerm}`;
      await page.goto(mainUrl);
    
      while (pageNum < pagesToSearch){

        pagesToSearch = await getNumberOfPagesToSearch(page);
        log("Searching Page " + pageNum + " of " + pagesToSearch);
          
        let asinList = await getAsinsOnPage(page);
        log(asinList);

        // Get the url for future pages
        let newUrl = await getNextPageUrl(page);
        log('Next page url: ' + newUrl);

        /*
        ************** AT THIS POINT WE HAVE A LIST OF ASINS, & WE CAN GO TO EACH URL ****************** 
        */

        for (let i = 0; i < asinList.length; i++){
          let productDetailsPage = `https://www.amazon.com/abc/dp/${asinList[i]}`;
          let productSellersPage = `https://www.amazon.com/gp/offer-listing/${asinList[i]}/ref=dp_olp_new_mbc?ie=UTF8&condition=new`;
          let productSellersPage2 = `https://www.amazon.com/gp/offer-listing/${asinList[i]}?ie=UTF8&condition=new`;
          
          // This takes us to the product details page where we get the product sales ranking
          await page.goto(productDetailsPage);
          let ranking = await getProductRanking(page);
          ranking = ranking ? ranking : "100000000000";
          ranking = ranking.replace(",", "")
          ranking = parseInt(ranking, 10);
          // log(ranking);
    
          // If the ranking is good enough, make sure Amazon doesn't sell it themselves
          if (ranking && !isNaN(ranking) && ranking < 80500){

            // Here we can see who sells each product. Amazon should be top of the list if they sell it
            await page.goto(productSellersPage);
            let amazonSellsThisProduct = await checkIfAmazonSellsProduct(page);
            log('Amazon sells: ' + amazonSellsThisProduct);
      
            if (!amazonSellsThisProduct){
              // At this point we know the ranking is good, and we know amazon doesn't sell the product, so get the product URL & push it to the DB
              log('Getting ASINS from DB');
              
              var db = app.get('db');
              db.getAllAsins()
              .then( dbAsins => {

                let duplicate = false;
                let newAsin = asinList[i];

                // check if the db already has this asin or not
                for (let i = 0; i < dbAsins.length; i++){
                  if (dbAsins[i].asin === newAsin){
                    duplicate = true;
                  }
                }

                if (!duplicate){
                  log('Pushing new ASIN to DB');
                  db.addAsin([newAsin, ranking])
                  .then( success => {
                    // return res.status(200).send({successful: true, message: '.catch error', error: err});
                  })
                  .catch(err=>{});
                }else{
                  log('duplicate (ASIN already in DB): ' + newAsin);
                }

              })
              .catch(err=>{});
            }
          }
        }   

        // Go to the next page
        if (pageNum > pagesToSearch) {
          browser.close()
          log("Browser Closed.")
          return;
        }
        await page.goto(newUrl);
        pageNum++;
      }
    }
    catch(e){ log("Error in the main findProducts function"); }
  },

  markOneUrl: function(req, res){
    var db = app.get('db');

    let { asin } = req.body;

    db.markAsinAsLookedAt([asin])
    .then( done => { 
      log('Updated 1 asin');
      return res.status(200).send({error: false, message: 'Updated 1 ASIN'});
    })
    .catch( err => {})

  },  

  markAll20: function(req, res){
    var db = app.get('db');

    let { asins } = req.body;
    let numUpdated = 0;

    for (let i = 0; i < asins.length; i++){
      db.markAsinAsLookedAt([asins[i]])
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
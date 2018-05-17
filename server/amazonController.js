var app = require('./index.js');
var config = require('./config.js');

const puppeteer = require('puppeteer');

let browser = null;
let searchRunning = false;
let headless = false;

let errorLog = ['these three', 'two are just to check that', 'this endpoint is return from this Array'];

// ** This only works for the terminal. Inside page.evaluate, we have to pass log or use console.log
function log(content){
  if (config.debug){
    console.log(content);
  }
}

function logError(content){
  errorLog.unshift(content);
  if(errorLog.length > 100){
   errorLog = errorLog.splice(100, 1)
  }
}

function getRandomNumber(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getManufacturer(page){
  let manufacturer = await page.evaluate(() => {
    let manufacturerElement = document.getElementById('olpProductByline');
    let text = manufacturerElement.innerText.trim();
    text = text.replace('by ', '');
    return text;
  });

  return manufacturer;
}

function isExcluded(manufacturer, exclusionList){
  for(let i=0; i<exclusionList.length; i++){
  
    if(manufacturer.replace(/ |-/gi, '').toLowerCase() ===  exclusionList[i].companies.replace(/ |-/gi, '').toLowerCase()){
      log("Company is in exclusion list (=== comparison)");
      return true;
    };
    if(manufacturer.replace(/ |-/gi, '').toLowerCase().includes(exclusionList[i].companies.replace(/ |-/gi, '').toLowerCase())){
      log("Company is in exclusion list (manuf includes exclusion list company)");
      return true;
    };
    if(exclusionList[i].companies.replace(/ |-/gi, '').toLowerCase().includes(manufacturer.replace(/ |-/gi, '').toLowerCase())){
      log("Company is in exclusion list (exclusion list company includes manuf)");
      return true;
    };
  };
  return false;
}

async function doesSellerMakeThisProduct(page){
  let manufacturer = await page.evaluate(() => {
    let manufacturerElement = document.getElementById('olpProductByline');
    let text = manufacturerElement.innerText.trim();
    text = text.replace('by ', '');
    return text;
  });
  let sellers = await page.evaluate(() => {
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
    return sellersArr;
  });

  log('Manufacturer: ' + manufacturer);
  log(`Sellers: [${sellers}]`);

  if ((sellers.length === 2 && sellers[0] === sellers[1]) || sellers.length === 1){
    log("Not Enough Sellers");
    return true;
  }

  if (manufacturer.match(/amazon/i)){
    log('Amazon is the manufacturer');
    return true;
  }

  // try{
    for(let i=0; i<sellers.length; i++){
  
      if(manufacturer.replace(/ |-/gi, '').toLowerCase() ===  sellers[i].replace(/ |-/gi, '').toLowerCase()){
        log("Seller Is Manufacturer: True");
        return true;
      };
      if(manufacturer.replace(/ |-/gi, '').toLowerCase().includes(sellers[i].replace(/ |-/gi, '').toLowerCase())){
        log("Seller Is Manufacturer: True");
        return true;
      };
      if(sellers[i].replace(/ |-/gi, '').toLowerCase().includes(manufacturer.replace(/ |-/gi, '').toLowerCase())){
        log("Seller Is Manufacturer: True");
        return true;
      };
  
      manufacturerWords = manufacturer.split(' ');
      let numberOfSimilaritiesPossible = manufacturerWords.length;
      let numberOfSimilaritiesFound = 0;
  
      for(let j=0; j<manufacturerWords.length; j++){
  
        if(sellers[i].replace(/ |-/gi, '').toLowerCase().includes(manufacturerWords[j].toLowerCase())){
          numberOfSimilaritiesFound++;
        };
  
      };
  
      if( (numberOfSimilaritiesFound > 0 && numberOfSimilaritiesPossible <= 2) || numberOfSimilaritiesFound > 1 ){
        log("Too many word matches");
        return true;
      };
    };
    
    log("Seller Is Manufacturer: False");
    return false;

  // }
  // catch(e){
  //   let error = JSON.stringify(e);
  //   log('Clayton Says, "Error with doesSellerMakeThisProduct() ....... Error: ' + error + '"');
  // }

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

      return asins;
  
    }, listSelector);

    return asinList;
  }
  catch(e){ logError('' + e + ''); logError("Error with getAsinsOnPage func"); log("Error with getAsinsOnPage func"); }
}

async function getProductRanking(page){
  try{      
    log('\nGetting Product Ranking');

    let buybox = '#buybox';
    
    //this is because that one product was a video and didnt have a buybox.....
    let ranking = await page.evaluate((buybox) => {
      timesChecked = 0;
      function waitForS(selector){
        if(document.querySelector(selector)){
          let rank = "100000000000";
          
          if (document.body.innerHTML.match(/#(\d+.*?) in .*?\(/)){
            rank = document.body.innerHTML.match(/#(\d+.*?) in .*?\(/)[1]
          }
    
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
  catch(e){logError('' + e + ''); logError("Error with getProductRanking func"); log("Error with getProductRanking func"); }
}

async function checkIfAmazonSellsProduct(page){
  try{

    let sellersBox = '#olpOfferList';
    await page.waitForSelector(sellersBox);
    
    let amazonSellsThisProduct = await page.evaluate((sellersBox) => {
      
      if (!document.querySelector(sellersBox)){
        return false;
      }

      let sellersHtml = document.querySelector(sellersBox).innerHTML;
      let amazonPatterns = [
        /alt="Amazon\.com"/,
        /alt="amazon\.com"/,
        /src="https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/01dXM-J1oeL\.gif/,
      ];
      
      for (let i = 0; i < amazonPatterns.length; i++){
        if (sellersHtml.match(amazonPatterns[i])){
          return true;
        }
      }

      return false;

    }, sellersBox);

    log('Amazon sells: ' + amazonSellsThisProduct);
    return amazonSellsThisProduct;

  }
  catch(e){ logError('' + e + ''); log(e); }
}

async function getNumberOfPagesToSearch(page){
  try{
    let numberOfPages = await page.evaluate(() => {
      return parseInt(document.getElementsByClassName("pagnDisabled")[0].innerText)
    });
    return numberOfPages;
  }
  catch(e){ logError('' + e + ''); logError("Error with getNumberOfPagesToSearch func"); log("Error with getNumberOfPagesToSearch func"); }
}

let pageNum = 1;
let pagesToSearch = 400;
let mainUrl = '';

module.exports = {

  returnErrorLog(req, res){
    return res.status(200).send({errorLog: errorLog});
  },

  closeBrowser: async function(req, res){
    if(browser !== null || searchRunning === true){
      searchRunning = false;
      if(browser !== null){
        await browser.close();
      }
      browser = null;
      log("\nBrowser Closed From Front End.");
      return res.status(200).send({message: 'Browser has been closed'});
    } else {
      return res.status(200).send({message: 'Browser is already closed'});
    }
  },

  findProducts: async function(req, res){

    if(browser !== null || searchRunning === true){
      res.status(200).send({message:`Server is searching page ${pageNum} of ${pagesToSearch}. Please close browser to start a new search. Starting URL: ${mainUrl}`});
      return;
    }
    
    try{
      pageNum = 1;
      pagesToSearch = 400;

      const category = req.body.category;
      let searchTerm = req.body.search.split(' ').join('+');
  
      if(!browser && !searchRunning){
        searchRunning = true;
        browser = await puppeteer.launch({headless: headless, args: ['--no-sandbox']});
      } else {
        return;
      }

      let page = await browser.newPage(); 

      res.status(200).send({message:`Started searching ${req.body.urlToSearch} successfully.`})
      
      // Main search results URL
      // let mainUrl = `https://www.amazon.com/s?url=search-alias%3D${req.body.category}&field-keywords=${searchTerm}`;
      mainUrl = req.body.urlToSearch;
      await page.goto(mainUrl);
    
      while (pageNum < pagesToSearch){

        pagesToSearch = await getNumberOfPagesToSearch(page);
        log("Searching Page " + pageNum + " of " + pagesToSearch);
          
        let asinList = await getAsinsOnPage(page);

        // Get the url for future pages
        let newUrl = await page.evaluate(() => document.getElementById('pagnNextLink').href);
        log('Next page url: ' + newUrl);
        newUrl = newUrl.split('&ie=UTF')[0];
        if(newUrl.includes('ref')){
          newUrl = newUrl.split('ref');
          newUrl[1] = newUrl[1].replace(/\/(.*)?\?/, '?');
          newUrl = newUrl[0] + 'ref' + newUrl[1];
        }
        log('Next page url: ' + newUrl);

        // At this point we have a list of ASINs for the current page, so we can check each one
        for (let i = 0; i < asinList.length; i++){
        // for (let i = 0; i < 3; i++){
          let productDetailsPage = `https://www.amazon.com/abc/dp/${asinList[i]}`;
          let productSellersPage = `https://www.amazon.com/gp/offer-listing/${asinList[i]}/ref=dp_olp_new_mbc?ie=UTF8&condition=new`;
          let productSellersPage2 = `https://www.amazon.com/gp/offer-listing/${asinList[i]}?ie=UTF8&condition=new`;
          
          // This takes us to the product details page where we get the product sales ranking
          await page.goto(productDetailsPage);
          await page.waitFor(getRandomNumber(100, 500));
          let ranking = await getProductRanking(page);
          ranking = ranking ? ranking : "100000000000";
          ranking = ranking.replace(/,/g, "")
          ranking = parseInt(ranking, 10);
    
          // If the ranking is good enough, make sure Amazon doesn't sell it themselves
          if (ranking && !isNaN(ranking) && ranking < 80500){

            // Here we can see who sells each product. Amazon should be top of the list if they sell it
            await page.goto(productSellersPage);

            let amazonSellsThisProduct = await checkIfAmazonSellsProduct(page);
            let doesSellerMakeThisProductReturn = null;
            if(!amazonSellsThisProduct){
              doesSellerMakeThisProductReturn = await doesSellerMakeThisProduct(page);
            }

            if (!amazonSellsThisProduct && !doesSellerMakeThisProductReturn){
              // At this point we know the ranking is good, and we know amazon doesn't sell the product, so get the product URL & push it to the DB

              const manufacturer = await getManufacturer(page);
              
              log('Getting ASINS from DB');
              var db = req.app.get('db');
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
                  db.getExclusionList()
                  .then( exclusionList => {
                    console.log("exclusion list", exclusionList);     

                    let excluded = isExcluded(manufacturer, exclusionList);

                    if(!excluded){

                      log('Pushing new ASIN to DB: ' + newAsin);
                      db.addAsin([newAsin, ranking, manufacturer, category])
                      .then( success => {
                        // return res.status(200).send({successful: true, message: '.catch error', error: err});
                      })
                      .catch(err=>{ logError('' + err + ''); log(err); });
                    } else {
                      log(`${manufacturer} is in exclusion list`);
                    }
                  })
                  .catch(err=>{logError('' + err + ''); log(err); });
                }else{
                  log('duplicate (ASIN already in DB): ' + newAsin);
                }

              })
              .catch(err=>{ logError('' + err + ''); log(err) });
            }
          }
        }   

        // Go to the next page
        if (pageNum >= pagesToSearch) {
          searchRunning = false;
          await browser.close();
          browser = null;
          log("Browser Closed.")
          return;
        }
        await page.waitFor(getRandomNumber(60000*3, 60000*5))
        await browser.close();
        browser = null;
        browser = await puppeteer.launch({headless: headless, args: ['--no-sandbox']});
        page = await browser.newPage();
        await page.goto(newUrl);
        pageNum++;
      }
    }
    catch(e){ 
      logError('' + e + '');
      logError("Error in main function");
      log(e); 
      return res.status(200).send({message: 'Error starting the product finder'})
    }
  },

}
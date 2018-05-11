var app = require('./index.js');
var config = require('./config.js');

const puppeteer = require('puppeteer');

let browser = null;

// Settings
let debug = true; 
let headless = true;

// ** This only works for the terminal. Inside page.evaluate, we have to pass log or use console.log
function log(content){
  if (debug){
    console.log(content);
  }
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
  
    if(manufacturer.replace(/ |-/gi, '').toLowerCase() ===  exclusionList[i].replace(/ |-/gi, '').toLowerCase()){
      log("Seller Is Manufacturer: True");
      return true;
    };
    if(manufacturer.replace(/ |-/gi, '').toLowerCase().includes(exclusionList[i].replace(/ |-/gi, '').toLowerCase())){
      log("Seller Is Manufacturer: True");
      return true;
    };
    if(exclusionList[i].replace(/ |-/gi, '').toLowerCase().includes(manufacturer.replace(/ |-/gi, '').toLowerCase())){
      log("Seller Is Manufacturer: True");
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

  console.log(manufacturer + "," + sellers)

  if ((sellers.length === 2 && sellers[0] === sellers[1]) || sellers.length === 1){
    log("Not Enough Sellers");
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

    return asinList;
  }
  catch(e){ log("Error with getAsinsOnPage func"); }
}

async function getProductRanking(page){
  try{
    log(" ");        
    log('Getting Product Ranking');

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
  catch(e){ log(e); }
}

async function getNextPageUrl(page){
  try{
    log('Getting next page URL');

    let newUrl = await page.evaluate(() => {
      return document.getElementById('pagnNextLink').href;
    });

    return newUrl;
  }
  catch(e){ log("Error with getNextPageUrl func"); }
}

async function getNumberOfPagesToSearch(page){
  try{
    let numberOfPages = await page.evaluate(() => {
      return parseInt(document.getElementsByClassName("pagnDisabled")[0].innerText)
    });
    return numberOfPages;
  }
  catch(e){ log("Error with getNumberOfPagesToSearch func"); }
}

let pageNum = 1;
let pagesToSearch = 400;
module.exports = {

  closeBrowser: async function(req, res){
    await browser.close();
    browser = null;
    log(" ");
    log("Browser Closed From Front End.");
    return;
  },

  findProducts: async function(req, res){

    if(browser !== null){
      console.log("hit")
      res.send({message:`Server is searching page ${pageNum} of ${pagesToSearch}. Please close browser to start a new search.`});
      return;
    };
    
    try{
      pageNum = 1;
      pagesToSearch = 400;

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
          ranking = ranking.replace(/,/g, "")
          ranking = parseInt(ranking, 10);
          // log(ranking);
    
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
                  db.getExclusionList()
                  .then( exclusionList => {
                    console.log("exclusion list", exclusionList);     

                    let excluded = isExcluded(manufacturer, exclusionList)


                    // for(let i=0; i<exclusionList.length; i++){
                    //   console.log(manufacturer)
                    //   if(manufacturer.toLowerCase() === exclusionList[i].companies.toLowerCase()){
                    //     excluded = true;
                    //   }
                    // }

                    if(!excluded){

                      log('Pushing new ASIN to DB: ' + newAsin);
                      db.addAsin([newAsin, ranking, manufacturer, category])
                      .then( success => {
                        // return res.status(200).send({successful: true, message: '.catch error', error: err});
                      })
                      .catch(err=>{});
                    } else {
                      log(`${manufacturer} is in exclusion list`);
                    }
                  })
                  .catch(err=>{});
                }else{
                  log('duplicate (ASIN already in DB): ' + newAsin);
                }



              })
              .catch(err=>{ console.log(err) });
            }
          }
        }   

        // Go to the next page
        if (pageNum >= pagesToSearch) {
          browser.close()
          log("Browser Closed.")
          return;
        }
        await page.goto(newUrl);
        pageNum++;
      }
    }
    catch(e){ 
      let error = JSON.stringify(e);
      log(e); 
    }
  },

}
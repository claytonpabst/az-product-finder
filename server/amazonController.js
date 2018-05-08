var app = require('./index.js');
var config = require('./config.js');

const puppeteer = require('puppeteer');

let browser = null;

async function getAsinsOnPage(page){
  try{
    console.log('Getting ASINs for the products on this page');

    // This is the list of items on this page (search results)
    let listSelector = '#s-results-list-atf';
    await page.waitForSelector(listSelector);
    
    // This gets the ASINs for all of the products on this page
    const asinList = await page.evaluate((listSelector) => {

      let asins = [];

      // this console.logs to the Puppeteer window console
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

      return asins;
  
    }, listSelector);

    // await page.waitfor(100000);

    return asinList;
  }
  catch(e){}
}

async function getProductRanking(page){
  try{
    console.log(" ");        
    console.log('Getting Product Ranking');

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
    
    console.log(ranking);
    return ranking;
  }
  catch(e){}
}

async function checkIfAmazonSellsProduct(page){
  try{
    console.log('checking sellers...');

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
      
      return false;

    }, sellersBox);

    return amazonSellsThisProduct;

  }
  catch(e){

  }
}

async function getNextPageUrl(page){
  try{
    console.log('Getting next page URL');

    let nextLink = '#pagnNextLink';

    let newUrl = await page.evaluate((nextLink) => {
      return document.getElementById('pagnNextLink').href;
    }, nextLink);

    return newUrl;
  }
  catch(e){

  }
}

async function getNumberOfPagesToSearch(page){
  let className = "pagnDisabled";
  let numberOfPages = await page.evaluate((className) => {
    return parseInt(document.getElementsByClassName("pagnDisabled")[0].innerText)
  }, className);
  return numberOfPages;
}

module.exports = {

  closeBrowser: async function(req, res){
    await browser.close();
    browser = null
    console.log(" ");
    console.log("Browser Closed From Front End.");
    return;
  },

  findProducts: async function(req, res){
    
    try{

      let pageNum = 1;
      let pagesToSearch = 400;
      const category = req.body.category;
      let searchTerm = req.body.search.split(' ').join('+');
  
      if(browser === null){
        browser = await puppeteer.launch({headless: false});
      }
      const page = await browser.newPage(); 
      
      // Main search results URL
      let mainUrl = `https://www.amazon.com/s?url=search-alias%3D${req.body.category}&field-keywords=${searchTerm}`;
      await page.goto(mainUrl);
    
      while (pageNum < pagesToSearch){

        pagesToSearch = await getNumberOfPagesToSearch(page);
        console.log("Searching Page " + pageNum + " of " + pagesToSearch);
          
        let asinList = await getAsinsOnPage(page);
        // console.log(asinList);

        // Get the url for future pages
        let newUrl = await getNextPageUrl(page);
        console.log('Next page url: ' + newUrl);

        /*
        ************** AT THIS POINT WE HAVE A LIST OF ASINS, & WE CAN GO TO EACH URL ****************** 
        */

        // for (let i = 0; i < 2; i++){
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
          // console.log(ranking);
    
          // If the ranking is good enough, make sure Amazon doesn't sell it themselves
          if (ranking && !isNaN(ranking) && ranking < 80500){

            // Here we can see who sells each product. Amazon should be top of the list if they sell it
            await page.goto(productSellersPage);
            let amazonSellsThisProduct = await checkIfAmazonSellsProduct(page);
            console.log('Amazon sells: ' + amazonSellsThisProduct);
      
            if (!amazonSellsThisProduct){
              // At this point we know the ranking is good, and we know amazon doesn't sell the product, so get the product URL & push it to the DB
              console.log('Pushing ASIN to DB');
              
              var db = app.get('db');
              db.addAsin([asinList[i], ranking])
              .then( success => {
                // return res.status(200).send({successful: true, message: '.catch error', error: err});
              })
              .catch(err=>{
                // return res.status(200).send({successful: false, message: '.catch error', error: err});
              });
            }
          }
        }   

        // Go to the next page
        if (pageNum > pagesToSearch) {
          browser.close()
          console.log("Browser Closed.")
          return;
        }
        await page.goto(newUrl);
        pageNum++;
      }
    }
    catch(e){
      console.log("There was an error!", e)
    }
  },

}
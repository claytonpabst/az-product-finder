var app = require('./index.js');
var config = require('./config.js');

const puppeteer = require('puppeteer');

module.exports = {

  findProducts: async function(req, res){
    console.log('hit')
    const category = req.body.category;
    let searchTerm = req.body.search.split(' ').join('+');

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage(); 
    
    // Main search results URL
    let mainUrl = `https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3D${req.body.category}&field-keywords=${searchTerm}`;
    await page.goto(mainUrl);
    
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
        asins.push(list[i].attributes[2].nodeValue);
      }

      return asins;
  
    }, listSelector);

    console.log(asinList);

    for (let i = 0; i < asinList.length; i++){
      let productUrl = `https://www.amazon.com/gp/offer-listing/${asinList[i]}/ref=dp_olp_new_mbc?ie=UTF8&condition=new`;
      await page.goto(productUrl);
      await page.waitForSelector('#olpOfferList');

      // Here we can see who sells each product. Amazon should be top of the list if they sell it

      // this takes us to the product details page where we can get the sales ranking
      await page.waitForSelector('#olpDetailPageLink');
      page.click('#olpDetailPageLink');

      let buybox = '#buybox';
      await page.waitForSelector(buybox);


      let ranking = await page.evaluate((buybox) => {

        let rank = 100000000000;
        
        if (document.body.innerHTML.match(/#(\d+.*?) in .*?\(/)){
          rank = document.body.innerHTML.match(/#(\d+.*?) in .*?\(/)[1]
        }
  
        return rank;
    
      }, buybox);

      console.log(ranking);

      // Push items to the DB here that meet certain criteria
    }

    console.log('for loop done');

  },

  referenc: async function(req, res){

    try{
      let userId = req.session.user.id;
      
      if (!req.session || !req.session.user || !req.session.user.id){
        return console.log('not logged in');
      }
      
      // check to make sure script isn't already running for this user
      if (userIdsRunningTheScript[userId] && userIdsRunningTheScript[userId].scriptRunning){
        return console.log('script is already running for this user');
      }
      
      // if userId doesn't exist yet in the object up top, create it
      if (!userIdsRunningTheScript[userId]){
        //  we will eventually send this array across in the body
        let profilesToTarget = ['https://www.instagram.com/psercia/', 'https://www.instagram.com/lpabst/'];
        
        userIdsRunningTheScript[userId] = {
          scriptRunning: true,
          profilesToTarget: profilesToTarget, 
          peopleFollowedByScript: [],
          peopleToUnfollow: [],
          id: userId,
          currentDay: Math.round(new Date().getTime() / 1000 / 60 / 60 /24)
          // need to add username
        }
        console.log('creating user in global object:');
        console.log(userIdsRunningTheScript);
      }
      
      userIdsRunningTheScript[userId].scriptRunning = true; //Script is allowed to start if this line gets run.

      const logInOption = '#react-root > section > main > article > div._kbq82 > div:nth-child(2) > p > a';
      const emailInput = '#react-root > section > main > article > div._kbq82 > div:nth-child(1) > div > form > div:nth-child(1) > div > div._ev9xl input';
      const passwordInput = '#react-root > section > main > article > div._kbq82 > div:nth-child(1) > div > form > div:nth-child(2) > div > div._ev9xl input';
      const logInBtn = '#react-root > section > main > article > div._kbq82 > div:nth-child(1) > div > form > span > button';
      const profileLink = 'a[href="/'+config.username+'/"]';
      const followingBtn = '#react-root > section > main > article > header > section > ul > li:nth-child(3) > a';
      const followingList = '._gs38e ul div';
      const followersButton = '#react-root > section > main > article > header > section > ul > li:nth-child(2) > a';
      const followersListReady = 'body > div:nth-child(14) > div > div._o0j5z > div > div._gs38e > ul > div > li:nth-child(1) > div > div._mtnzs > span > button';
      const followersList = '._p4iax > li:nth-child(0) >';
      
      let {email, password} = req.body;
      
      const browser = await puppeteer.launch({headless: false});
      const unfollowPage = await browser.newPage(); 
      const page = await browser.newPage(); 
      
      await page.waitFor(5000);
      await page.goto('https://www.instagram.com/');
      await page.waitForSelector(logInOption);
      await page.click(logInOption);
      await page.waitForSelector(emailInput);
      await page.type(emailInput, email);
      await page.type(passwordInput, password);
      await page.click(logInBtn);
      await page.waitFor(5000);
      await page.goto(userIdsRunningTheScript[userId].profilesToTarget[0]);
      await page.waitForSelector(followersButton);
      await page.click(followersButton);
      await page.waitForSelector(followersListReady)
      
      let numberOfPeopleToFollow = 10;
      let peopleFollowed = 0;
      
      for(let i=1; i<=numberOfPeopleToFollow; i++){
        if(userIdsRunningTheScript[userId].scriptRunning){

          
          await page.waitFor(5000)
          if(i<=25){ // This will scroll the page until 270 peeps are on the DOM.
            await page.evaluate(() => {document.getElementsByClassName('_gs38e')[0].scrollTop = document.getElementsByClassName('_gs38e')[0].scrollHeight });
          }
          await page.waitFor(600)
          
          ///////////////////////////// Should the follow button get pressed ? ///////////////////////
          let clickedUsername = await page.evaluate((i) => { 
            return document.getElementsByClassName('_2g7d5')[i].innerHTML; 
          }, i);
          let buttonText = await page.evaluate((i) => {
            if(document.getElementsByClassName("_mtnzs")[i].children[0].children[0]){
              console.log('button is there for ', i)
              return document.getElementsByClassName("_mtnzs")[i].children[0].children[0].innerHTML;
            } else {
              return "Nah"
            }
          }, i);
          console.log('buttonText:', i, buttonText)
          if (buttonText === "Follow" && !followedByScriptBefore(clickedUsername)) {
            console.log('bout to click ', i)
            // const followButton = `body > div:nth-child(14) > div > div._o0j5z > div > div._gs38e > ul > div > li:nth-child(${i}) > div > div._mtnzs > span > button`
            await page.evaluate((i) => {
              document.getElementsByClassName("_mtnzs")[i].children[0].children[0].click();
            }, i)
            let clickedUserInfo = {
              n:clickedUsername,
              d:Math.round( new Date().getTime() / 1000 / 60 / 60 / 24 ),
              u:0
            }
            userIdsRunningTheScript[userId].peopleFollowedByScript.push(clickedUserInfo);
            console.log(userIdsRunningTheScript[userId].peopleFollowedByScript);
          }
    
          let rightNow = Math.round(new Date().getTime() / 1000 / 60 / 60 /24) // days since 1970
          userIdsRunningTheScript[userId].peopleToUnfollow = userIdsRunningTheScript[userId].peopleFollowedByScript.filter(i => !i.u && i.d <= rightNow - 4)
          console.log(userIdsRunningTheScript[userId].peopleToUnfollow);
    
          if(userIdsRunningTheScript[userId].peopleToUnfollow.length){
            await unfollowPage.goto(`https://www.instagram.com/${userIdsRunningTheScript[userId].peopleToUnfollow[0].n}/`)
    
            //unfollow this person
          }
    
          // unfollow people that were followed over 4 days ago
    
          // people followed over 3 months ago should be spliced from the peopleFollowed array (65,000 people in 90 days running 24/7 =~ 66 megabytes of ram)
    
        } else {
          userIdsRunningTheScript[userId].scriptRunning = false;
          browser.close();
          res.status(200).send("scriptRunning changed to false")
          //can do something here if scriptRunning is false?
        }
      }
      userIdsRunningTheScript[userId].scriptRunning = false;
      browser.close();
      res.status(200).send("for loop ended")
      console.log(userIdsRunningTheScript);
    }
    catch(error){
      // userIdsRunningTheScript[userId].scriptRunning = false;
      // browser.close();
      res.status(200).send("an error stopped the script")
      console.log(error)
    }
    
  }


}
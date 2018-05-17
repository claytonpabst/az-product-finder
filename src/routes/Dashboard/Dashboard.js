import axios from "axios";

import React, { Component } from 'react';
import './Dashboard.css'

import PageNameHeader from '../../components/PageNameHeader/PageNameHeader.js';

// log function for debugging on front end
let debug = false;
function log(content){
    if (debug){
      console.log(content);
    }
}

class Dashboard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            categoryInput: '',
            searchInput: '',
            urls: [{}],
            investigating: [{}],
            showInvestigatingList: false,
            message: '',
            addToExclusionInput:'',
            exclusion:[],
        }

        this.getUrls = this.getUrls.bind(this);
        this.getInvestigatingList = this.getInvestigatingList.bind(this);
        this.launchAZ = this.launchAZ.bind(this);
        this.toggleInvestigatingList = this.toggleInvestigatingList.bind(this);
        this.saveComments = this.saveComments.bind(this);
        this.markAsInvestigating = this.markAsInvestigating.bind(this);
        this.markOneUrl = this.markOneUrl.bind(this);
    }

    componentDidMount() {
        this.getUrls();
        this.getInvestigatingList();
    }

    getUrls(){
        axios.get('/api/getUrls')
        .then( res => {
            log(res);
            this.setState({
                urls: res.data,
                message: 'Here are 20 fresh URLs'
            })
        })
        .catch( err => log(err) );
    }

    getInvestigatingList(){
        axios.get('/api/getInvestigatingList')
        .then( res => {
            log(res);
            this.setState({
                investigating: res.data
            })
        })
        .catch(err=>{});
    }

    launchAZ(){
        let {categoryInput, searchInput} = this.state;

        if (!categoryInput || !searchInput){
            alert("Include both category and search term to begin Amazon product query.")
            return;
        }

        axios.post('/api/launchAZ', { category: categoryInput, search: searchInput })
            .then(res => {
                if(res.data.message){
                    alert(res.data.message);
                };
                if(res.data.error){
                    alert(res.data.error);
                };
                log(res);
            })
            .catch( err => log(err));
    }

    toggleInvestigatingList(){
        this.setState({
            showInvestigatingList: !this.state.showInvestigatingList,
            message: '',
        })
    }

    getUrlsRanked(){
        axios.get('/api/getUrlsRanked')
        .then( res => {
            log(res);
            this.setState({
                urls: res.data,
                message: 'Top 20 ranked URLs'
            })
        })
        .catch( err => log(err) );
    }

    closeBrowser(){
        axios.post('/api/closeBrowser')
            .then(res => {
                log(res);
                if (res.data && res.data.message){
                    alert(res.data.message);
                }else{
                    alert('Unexpected error');
                }
            })
            .catch( err => log(err));
    }

    saveComments(id, comments){
        axios.post('/api/saveComments', {id, comments})
        .then( res => {
            this.setState({message: 'Saved comments'})
        })
        .catch(err => console.log(err) )
    }

    markAsInvestigating(id, i){
        if (this.state.urls.length === 0){
            return this.getUrls();
        }

        axios.post('/api/markAsInvestigating', {id})
        .then( res => {
            let message;

            if (!res.data || !res.data.message){
                message = 'Error, please try again';
            }else{
                message = res.data.message;
            }
            alert(message);
            
            this.setState({ message })
            this.getUrls();
            this.getInvestigatingList();
        })
        .catch(err => {});
    }
    
    // Gets the asin from which ever list is showing (new asins or investigating)
    // and marks it as looked at
    markOneUrl(id, whichList){        
        axios.post('/api/markOneUrl', {id})
        .then( res => {
            log(res);
            let message;
            
            if (!res.data || !res.data.message){
                message = 'Error, please try again';
            }else{
                message = res.data.message;
            }
            
            this.setState({ message })
            this.getUrls();
            this.getInvestigatingList();
        })
    }

    markAsFreshUrl(id){
        let {urls, investigating} = this.state;

        axios.post('/api/markAsFreshUrl', {id})
        .then( res => {
            log(res);
            let message;

            if (!res.data || !res.data.message){
                message = 'Error, please try again';
            }else{
                message = res.data.message;
            }
            if (res.status === 200){
                // if this is an asin in the urls list, mark it as not looked at
                for(let i=0; i<urls.length; i++){
                    if(urls[i].id === id){
                        urls[i].looked_at = false;
                        urls[i].needs_recheck = false;
                    }    
                }
                // if this is an asin in the investigating list, mark it as not looked at,
                // then move it back to the urls list instead
                for(let i=0; i<investigating.length; i++){
                    if(investigating[i].id === id){
                        investigating[i].looked_at = false;
                        investigating[i].needs_recheck = false;
                        investigating[i].investigating = false;
                        urls.push(investigating.splice(i, 1)[0]);
                    }    
                }
            }

            this.setState({ urls, message, investigating })
        })
    }

    markAsinForRecheck = (id) => {

        axios.post('/api/markAsinForRecheck', {id})
        .then( res => {
            let message;

            if (!res.data || !res.data.message){
                message = 'Error, please try again';
            }else{
                message = res.data.message;
            }

            this.setState({ message })
        })
        .catch(err => {});
    }

    addToExclusion = () => {
        let {exclusion} = this.state;
        exclusion.push(this.state.addToExclusionInput);
        this.setState({exclusion});
    }

    render() {

        return (
            <section>
                < PageNameHeader>
                    {() => (
                        <h1>Search</h1>
                    )}
                </ PageNameHeader >
                <div className="home_wrapper">
                    <p>Category</p>
                    <select onChange={(e) => this.setState({ categoryInput: e.target.value })} value={this.state.categoryInput} aria-describedby="searchDropdownDescription" className="" style={{ "display": "block", "top": "0px" }} tabIndex="1">
                        <option value="aps">All Departments</option>
                        <option value="alexa-skills">Alexa Skills</option>
                        <option value="amazon-devices">Amazon Devices</option>
                        <option value="warehouse-deals">Amazon Warehouse Deals</option>
                        <option value="appliances">Appliances</option>
                        <option value="mobile-apps">Apps &amp; Games</option>
                        <option value="arts-crafts">Arts, Crafts &amp; Sewing</option>
                        <option value="automotive">Automotive Parts &amp; Accessories</option>
                        <option value="baby-products">Baby</option>
                        <option value="beauty">Beauty &amp; Personal Care</option>
                        <option value="stripbooks">Books</option>
                        <option value="popular">CDs &amp; Vinyl</option>
                        <option value="mobile">Cell Phones &amp; Accessories</option>
                        <option value="fashion">Clothing, Shoes &amp; Jewelry</option>
                        <option value="fashion-womens">&nbsp;&nbsp;&nbsp;Women</option>
                        <option value="fashion-mens">&nbsp;&nbsp;&nbsp;Men</option>
                        <option value="fashion-girls">&nbsp;&nbsp;&nbsp;Girls</option>
                        <option value="fashion-boys">&nbsp;&nbsp;&nbsp;Boys</option>
                        <option value="fashion-baby">&nbsp;&nbsp;&nbsp;Baby</option>
                        <option value="collectibles">Collectibles &amp; Fine Art</option>
                        <option value="computers">Computers</option>
                        <option value="courses">Courses</option>
                        <option value="financial">Credit and Payment Cards</option>
                        <option value="digital-music">Digital Music</option>
                        <option value="electronics">Electronics</option>
                        <option value="lawngarden">Garden &amp; Outdoor</option>
                        <option value="gift-cards">Gift Cards</option>
                        <option value="grocery">Grocery &amp; Gourmet Food</option>
                        <option value="handmade">Handmade</option>
                        <option value="hpc">Health, Household &amp; Baby Care</option>
                        <option value="local-services">Home &amp; Business Services</option>
                        <option value="garden">Home &amp; Kitchen</option>
                        <option value="industrial">Industrial &amp; Scientific</option>
                        <option value="digital-text">Kindle Store</option>
                        <option value="fashion-luggage">Luggage &amp; Travel Gear</option>
                        <option value="luxury-beauty">Luxury Beauty</option>
                        <option value="magazines">Magazine Subscriptions</option>
                        <option value="movies-tv">Movies &amp; TV</option>
                        <option value="mi">Musical Instruments</option>
                        <option value="office-products">Office Products</option>
                        <option value="pets">Pet Supplies</option>
                        <option value="prime-exclusive">Prime Exclusive Savings</option>
                        <option value="pantry">Prime Pantry</option>
                        <option value="instant-video">Prime Video</option>
                        <option value="software">Software</option>
                        <option value="sporting">Sports &amp; Outdoors</option>
                        <option value="tools">Tools &amp; Home Improvement</option>
                        <option value="toys-and-games">Toys &amp; Games</option>
                        <option value="vehicles">Vehicles</option>
                        <option value="videogames">Video Games</option>
                    </select>
                    <p>Search Term</p>
                    <input onChange={(e) => this.setState({ searchInput: e.target.value })} />
                    <button onClick={this.launchAZ}> Launch Amazon </button>
                    <button onClick={this.closeBrowser}> Close Browser </button>
                </div>
                < PageNameHeader>
                    {() => (
                        <h1>Product Managment</h1>
                    )}
                </ PageNameHeader >

                    { this.state.showInvestigatingList ? 
                        <div className='asinControls'>
                            <button onClick={this.toggleInvestigatingList} >Show New ASINS</button>
                        </div>
                    :   <div className='asinControls'>
                            <button onClick={this.toggleInvestigatingList} >Show Investigating</button>
                            <button onClick={() => this.getUrlsRanked()} >Get Top Ranked Products</button>
                        </div>
                    }
                

                <p className='message' >{this.state.message}</p>

                { !this.state.showInvestigatingList && (
                    <div className='asinList'>
                        {
                            this.state.urls.map( (item, i) => {
                                log(item);
                                
                                let productSellers = `https://www.amazon.com/gp/offer-listing/${item.asin}/ref=dp_olp_new_mbc?ie=UTF8&condition=new`;

                                return <div className='url' key={i}>
                                    <a href={ productSellers } target='_blank' >{item.asin}</a>
                                    <p>Ranking: {item.ranking || 'No ranking obtained'}</p>
                                    <p>Manufacturer: {item.manufacturer || 'No manufacturer obtained'}</p>
                                    <textarea className={`comments`} placeholder='Comments about company or product' onBlur={(e) => this.saveComments(item.id, e.target.value)} defaultValue={item.comments} />
                                    <button className='investigatingBtn' onClick={() => this.markAsInvestigating(item.id, i)} >Mark as INVESTIGATING</button>
                                    {
                                        !item.looked_at ? 
                                        <button className='removeBtn' onClick={() => this.markOneUrl(item.id, 'urls')} >REMOVE (Mark as looked at)</button> :
                                        <button onClick={() => this.markAsFreshUrl(item.id)} >Undo</button>
                                    }
                                    <button onClick={() => {this.markAsinForRecheck(item.id); this.markOneUrl(item.id, 'urls') }} >Mark For Recheck</button>
                                </div>
                            })
                        }


                        <button onClick={this.getUrls} >Get More Urls</button>

                    </div>
                )}

                { this.state.showInvestigatingList && (
                    <div className='investigatingList'>
                        { 
                            this.state.investigating.map( (item, i) => {

                                let productSellers = `https://www.amazon.com/gp/offer-listing/${item.asin}/ref=dp_olp_new_mbc?ie=UTF8&condition=new`;

                                return <div className='investigatingListItem' key={i}>
                                    <p>ASIN: <span><a href={ productSellers } target='_blank' > {item.asin} </a></span></p>
                                    <p>Manufacturer: {item.manufacturer}</p>
                                    <textarea className={`comments`} placeholder='Comments about company or product' onBlur={(e) => this.saveComments(item.id, e.target.value)}  defaultValue={item.comments}/>                                    
                                    <button onClick={() => this.markAsFreshUrl(item.id)} >Move back to fresh URLs list</button>
                                    <button className='removeBtn' onClick={() => this.markOneUrl(item.id, 'investigating')}>Mark as looked at</button>
                                </div>
                            })
                        }
                    </div>
                )}
                < PageNameHeader>
                    {() => (
                        <h1>Exclusion List</h1>
                    )}
                </ PageNameHeader >
                <div className="exclusion-wrapper">
                    <p>{this.state.exclusion}</p>
                    <p>Add to exclusion (Should be typed out exactly as it appears on Amazon)</p>
                    <input onChange={(e) => this.setState({addToExclusionInput:e.target.value})}/>
                    <button onClick={this.addToExclusion}>Submit</button>


                </div>

            </section>
        );
    }
}


export default Dashboard;
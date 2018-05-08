import axios from "axios";

import React, { Component } from 'react';
import './Dashboard.css'


class Dashboard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            categoryInput: '',
            searchInput: '',
            urls: [{}],
            message: '',
        }

        this.getUrls = this.getUrls.bind(this);
        this.launchAZ = this.launchAZ.bind(this);
        this.markOneUrl = this.markOneUrl.bind(this);
        this.markAll20 = this.markAll20.bind(this);
    }

    componentDidMount() {
        this.getUrls();
    }

    getUrls(){
        axios.get('/api/getUrls')
        .then( res => {
            console.log(res);
            this.setState({
                urls: res.data,
                message: 'Here are 20 fresh URLs'
            })
        })
        .catch( err => console.log(err) );
    }

    launchAZ(){
        let {categoryInput, searchInput} = this.state;

        if (!categoryInput || !searchInput){
            return;
        }

        axios.post('/api/launchAZ', { category: categoryInput, search: searchInput })
            .then(res => {
                console.log(res);
            })
            .catch( err => console.log(err));
    }

    closeBrowser(){
        axios.post('/api/closeBrowser')
            .then(res => {
                console.log(res);
            })
            .catch( err => console.log(err));
    }

    markOneUrl(id){

        let urls = this.state.urls

        axios.post('/api/markOneUrl', {id})
        .then( res => {
            let message;

            if (!res.data || !res.data.message){
                message = 'Error, please try again';
            }else{
                message = res.data.message;
            }
            if (res.status === 200){
                for(let i=0; i<urls.length; i++){
                    if(urls[i].id === id){
                        urls[i].looked_at = true;
                    }    
                }
            }       

            // urls.splice(i, 1);

            this.setState({ urls, message })
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
    }

    // Marks all remaining urls as 'looked at' then gets new URLs. If no URLs remain, it just gets new urls
    markAll20(){
        if (this.state.urls.length === 0){
            return this.getUrls();
        }

        let idList = [];

        for (let i = 0; i < this.state.urls.length; i++){
            idList.push(this.state.urls[i].id);
        }

        axios.post('/api/markAll20', {idList})
        .then( res => {
            console.log(res);
            if (res.data && !res.data.error){
                this.setState({
                    message: res.data.message || 'Getting new URLs'
                })
            }
        })
        .catch(err => console.log(err));
    }

    render() {
        let numAsins = this.state.urls.length;

        return (
            <section>
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
                <div className='asinList'>

                    <p className='message' >{this.state.message}</p>

                    {
                        this.state.urls.map( (item, i) => {
                            console.log(item);
                            let href = `https://www.amazon.com/abc/dp/${item.asin}`;
                            return <div className='url' key={i}>
                                <a href={href} target='_blank' >{item.asin}</a>
                                <p>Ranking: {item.ranking || 'No ranking obtained'}</p>
                                <p>Manufacturer: {item.manufacturer || 'No manufacturer obtained'}</p>
                                {
                                    !item.looked_at ?
                                    <button onClick={() => this.markOneUrl(item.id)} >Mark this URL as looked at</button> :
                                    <button onClick={() => this.markOneUrl(item.id)} >Undo</button>
                                }
                                <button onClick={() => {this.markAsinForRecheck(item.id); this.markOneUrl(item.id) }} >Mark this URL For Recheck</button>
                            </div>
                        })
                    }

                    <button onClick={this.markAll20} >
                        {numAsins > 0 ? `Mark all ${numAsins} as 'looked_at'` : 'Get New Urls'}
                    </button>

                </div>
            </section>
        );
    }
}


export default Dashboard;
import React, { Component } from 'react';

import './PageNameHeader.css';

class PageNameHeader extends Component {

  constructor(props) {
    super(props);

  }

  render() {
    console.log(this.props)
    const test = 'hello'
    return (
      <div className='page-name-header_wrapper'>
        <div>
          {
            this.props.children()
          }
        </div>
      </div> 
    );
  }
}

export default PageNameHeader;
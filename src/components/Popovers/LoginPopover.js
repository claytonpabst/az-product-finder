import React from 'react';
import './LoginPopover.css';

export default function LoginPopover(props) {

  return (
    <div className='login-popover_wrapper' onClick={() => props.closeLoginPopover()}>
      <div onClick={(e) => e.stopPropagation()} id="login-popover_content-wrapper">
        <div id="login-popover_x-out" onClick={() => props.closeLoginPopover()}>x</div>
        <h2 id="login-popover_header">Log In to Your Account!</h2>
        <form>
          <div style={{margin:'0 auto', display:'block', width:'90%', margin:' 15px auto'}} className="form-group">
            {/* <label style={{margin:'5px'}} for="exampleInputEmail1">E-mail address:</label> */}
            <small style={{fontSize:'12px', margin:'-5px auto 5px 5px'}} id="emailHelp" className="form-text text-muted">E-mail</small>
            <input style={{padding:'6px', fontSize:'20px', width:'95%', margin:'0 auto', display:'block'}} type="email" className="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter E-mail" />
          </div>
          <div style={{margin:'0 auto', display:'block', width:'90%',  margin:' 15px auto'}} className="form-group">
            {/* <label style={{margin:'5px'}} for="exampleInputPassword1">Password:</label> */}
            <small style={{fontSize:'12px', margin:'-5px auto 5px 5px', color:'#ef992f'}} id="emailHelp" className="form-text">Password:</small>
            <input style={{padding:'6px', fontSize:'20px', width:'95%', margin:'0 auto', display:'block'}} type="password" className="form-control" id="exampleInputPassword1" placeholder="Enter Password" />
          </div>
          <button 
            style={{margin:'0 auto', display:'block', width:'90%', fontWeight:'bold', padding:'12px'}} 
            type="submit" 
            className="btn login-popover_log-in-button"
            onClick={(e) => {e.stopPropagation()}}
          >
            Log In
          </button>
          <small style={{fontSize:'12px', textAlign:'center', margin:'10px auto -7px auto'}} id="login-popover_forgot-password" className="form-text">Forgot Password?</small>
          <p style={{textAlign:'center', padding:'30px', color:'#777', fontWeight:'bold'}}>_____________ or _____________</p>
          <button 
            style={{margin:'0 auto 20px auto', display:'block', width:'90%', fontWeight:'bold', padding:'12px'}} 
            className="btn login-popover_log-in-button"
            onClick={(e) => {e.stopPropagation(); props.openSignUpPopover();}}
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  )
}
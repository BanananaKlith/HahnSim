import axios from 'axios';
import React from 'react';
import { BrowserRouter as Router, Link } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import Simulation from './Components/simulation.js';




function App() {
 
  const [usernameText, setusernameText] = useState("");
  const [passwordText, setPasswordText] = useState("");
  const [token,setToken]=useState("");
  const [view,setView]=useState("simulatio")

  function loginClick() {
    axios.post("https://localhost:7115/User/Login", {
      username: usernameText,
      password: passwordText
    })
    .then((response) => {
      console.log(response); // Log the response (optional)
      setToken(response.data.token);
      console.log(token);
      setView("simulation")

    })
    .catch(error => console.log(error));
  }
  

  function usernameChange (eventText) {
    setusernameText(eventText);
  }

  function passwordChange (eventText) {
    setPasswordText(eventText);
  }
  if(view==="simulation"){
    return(<Simulation token={token}/>)
  }


  return (
    <div className="App">
      <div className="App-header">
      </div>
        <div className="Login-form">
          <div className="Left-img"><img src={require("./Components/images/newpiece.png")} alt="BrandingImage"/></div>
          <div className="Right-stuff">
            <div className="Rs-top">
              <h1>Login</h1>
              <p>Don't have an account yet? <Router><Link>Sign up</Link></Router></p>
            </div>
            <div className="Rs-middle">
              <div className="First-half">
                <label>Username</label>
                <input type= "text" onChange={(e)=>usernameChange(e.target.value)}/>
                <label>Password</label>
                <input type= "password" onChange={(e)=>passwordChange(e.target.value)}/>
                <input id="remember-me" style={{marginRight:'80px'}} type="checkbox"></input>
                <label htmlFor="remember-me">Remember me</label>
                <button style={{backgroundColor:"#f50ee9",border:"none",padding:"0.8vw 7vw",color:"white",fontWeight:"700"}}
                onClick={loginClick}>Login</button>
              </div>
              <div className="Second-half"></div>
            </div>
          </div>
        </div>
    
    </div>
  );
}

export default App;

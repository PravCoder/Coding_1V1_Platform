import { useCookies } from "react-cookie";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import React, { useState } from "react";


const RegisterForm = () => {
    // user credentials required to create user-obj
    const [username, setUsername] = useState();
    const [email, setEmail] = useState();
    const [password, setPassword] = useState();
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [_, setCookies] = useCookies(["access_token"]); // save access token as cookie when registering
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        await axios.post("http://localhost:3001/register", {username, email, password}) 
        .then(result => {  
        console.log("register-form-result: "+result);
        console.log("register-response-status: "+result.status)
        if (result.status === 201) { 
            alert("Succesfully registered now login");
            navigate("/login");
        }
        })
        .catch(err => {
        if (err.response) {
            if (err.response.status === 400) {
                setError("an error occured registering with these credentials");
                console.log("register-error");
            }
        } 
        });
    }

    return (
        <div>
            <h2>Regster form</h2>
            <form onSubmit={handleSubmit}>
                <label>Username</label>
                <input type="text" placeholder="enter username" onChange={(e) => setUsername(e.target.value)} />

                <label>Email</label>
                <input type="text" placeholder="enter email" onChange={(e) => setEmail(e.target.value)} />

                <label>Password</label>
                <input type="password" placeholder="enter password" onChange={(e) => setPassword(e.target.value)} />
            
                <button type="create" style={{ color: 'black', fontWeight: 'bold'}}>Create Account & Register!</button>
            </form>

            

        </div>
        
    
    )
}

export default RegisterForm;
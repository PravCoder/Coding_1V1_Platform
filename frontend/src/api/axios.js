import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

console.log("api url: ", API_URL);
const api = axios.create({
  baseURL: API_URL,
//   withCredentials: true, // only if you need cookies
});

export default api;

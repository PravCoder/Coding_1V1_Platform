const getCurrentUser = () => {
    return window.localStorage.getItem("userID");
};
export default getCurrentUser;

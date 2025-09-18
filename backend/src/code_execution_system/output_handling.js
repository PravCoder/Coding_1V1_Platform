
// given a language gets the code-snippet that prints the users solution
const generateOutputHandling = (language, return_type) => {
    if (language === "python") {
        return 'print(json.dumps(result))';
    } else if (language === "javascript") {
        return 'console.log(JSON.stringify(result));';
    }
}

module.exports = generateOutputHandling;

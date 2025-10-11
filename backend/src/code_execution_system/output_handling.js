const dataTypeSystem = require("./data_type_system");


// given a language gets the code-snippet that prints the users solution
const generateOutputHandling = (language, return_type) => {
    // output printing for python
    if (language === "python") {
        return 'print(json.dumps(result))';

    // output printing for c++
    } else if (language === "cpp") {
        const cppReturnType = dataTypeSystem[return_type]?.cpp || return_type;
        if (cppReturnType.includes('vector<vector<')) {
            // print 2D vector output
            return `for(int i = 0; i < result.size(); i++) {
            for(int j = 0; j < result[i].size(); j++) {
                cout << result[i][j];
                if(j < result[i].size() - 1) cout << " ";
            }
            if(i < result.size() - 1) cout << "\\n";
        }`;
        } else if (cppReturnType.includes('vector<')) {
            // print 1D vector output
            return `for(int i = 0; i < result.size(); i++) {
            cout << result[i];
            if(i < result.size() - 1) cout << " ";
        }`;
        } else {
            // Simple type output
            // For boolean return -> But cout << result; prints 1 or 0 → does not match JSON true/false → all testcases fail, Fix: Print true/false as string in C++ output handling.
            if (cppReturnType === "bool") {
                return 'cout << (result ? "true" : "false");';
            } else {
                return 'cout << result;';
            }
        }
    }
}



module.exports = generateOutputHandling;

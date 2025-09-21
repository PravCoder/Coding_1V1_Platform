
// converts general data type (whats stored in the problem object in db) into the lanaguage specific data type equivalent
// this is used create data types for parameters, returns type for each problem in each langauge dynamically
const typeSystem = {

    // Single Value Types: in each language
    "int": { 
        python: "int", 
        java: "int", 
        cpp: "int" 
    },
    "double": { 
        python: "float", 
        java: "double", 
        cpp: "double" 
    },
    "string": { 
        python: "str", 
        java: "String", 
        cpp: "string"
    },
    "boolean": { 
        python: "bool", 
        java: "boolean", 
        cpp: "bool" 
    },

    
    // Array Types: each array data type for each language. 
    "int[]": { 
        python: "List[int]", 
        java: "int[]", 
        cpp: "vector<int>"
    },
    "double[]": {                       // same thing as double
        python: "List[float]", 
        java: "double[]", 
        cpp: "vector<double>"
    },
    "boolean[]": { 
        python: "List[bool]", 
        java: "boolean[]", 
        cpp: "vector<bool>"
    },
    "string[]": { 
        python: "List[str]", 
        java: "String[]", 
        cpp: "vector<string>"
    },

    // The different 2D-array types for different primitative types for each language
    "int[][]": { 
        python: "List[List[int]]", 
        java: "int[][]", 
        cpp: "vector<vector<int>>"
    },
    "double[][]": { 
        python: "List[List[float]]", 
        java: "double[][]", 
        cpp: "vector<vector<double>>"
    },
    "boolean[][]": { 
        python: "List[List[bool]]", 
        java: "boolean[][]", 
        cpp: "vector<vector<bool>>"
    },
    "string[][]": { 
        python: "List[List[str]]", 
        java: "String[][]", 
        cpp: "vector<vector<string>>"
    },



}

module.exports = typeSystem;

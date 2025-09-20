
// converts general data type into the lanaguage specific data type equivalent
const typeSystem = {
    // primitive types and there corresponding types in each language
    'number': { 
        python: 'int', 
        javascript: 'number', 
        java: 'int', 
        cpp: 'int' 
    },
    'string': { 
        python: 'str', 
        javascript: 'string', 
        java: 'String', 
        cpp: 'string' 
    },
    'boolean': { 
        python: 'bool', 
        javascript: 'boolean', 
        java: 'boolean', 
        cpp: 'bool' 
    },

    // array types and there corresponding types in each language, TBD do for each type of list like int, double, bool, string.
    'number[]': { 
        python: 'List[int]', 
        javascript: 'number[]', 
        java: 'int[]', 
        cpp: 'vector<int>' 
    },
    'string[]': { 
        python: 'List[str]', 
        javascript: 'string[]', 
        java: 'String[]', 
        cpp: 'vector<string>' 
    },
    'number[][]': { 
        python: 'List[List[int]]', 
        javascript: 'number[][]', 
        java: 'int[][]', 
        cpp: 'vector<vector<int>>' 
    },

    // complex types, tbd


}

module.exports = typeSystem;

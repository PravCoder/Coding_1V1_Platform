const typeSystem = require('./data_type_system');

// generates the *user code* template what they see based on different languages dyanmically
const templateGenerators = {
    
    python: (problem) => {  // given problem-obj
        const {function_name, parameters, return_type} = problem;  // given a problem

        // iterate all parameters of problem and get the problem name, and combine into a comam seperated list
        const param_list = parameters.map(p => p.name).join(', ');  
        // iterate all paramteres get the sctual type of the paramter in this language using typeSystem
        const type_hints = parameters.map(p => `:type ${p.name}: ${typeSystem[p.type]?.python || p.type}`).join('\n    ');
        // get return type of python given general return type of problem
        const py_return_type = typeSystem[return_type]?.python || return_type;

        // dynamically create a template of the problem code that the user sees, based on the given problems name and paramters their types
        // also based on the return type of problem of this language
        let temp =
            `def ${function_name}(${param_list}):
                """
                ${type_hints}
                :rtype: ${py_return_type}
                """
                pass
            `;

        return temp;
    },

    cpp: (problem) => {
        const {function_name, parameters, return_type} = problem;
        
        // iterate all parameters of problem and get the cpp-type of each paramter combine it with the paramter-name into a string
        const cpp_params = parameters.map(p => `${typeSystem[p.type]?.java || p.type} ${p.name}`).join(', ');
        // get the c-- reuturn type based on problem general type
        const cpp_return_type = typeSystem[return_type]?.java || return_type;

        // create dynamic template for problem in cpp based on return type, function name, parameters
        let temp = 
            `
            class Solution {
                public:
                    ${cpp_return_type} ${function_name}(${cpp_params}) {
                        // Your code here
                    }
            };
            `;
        return temp;
    },

    java: (problem) =>{
        const {function_name, parameters, return_type} = problem;  // from problem-obj

        // iterate all parameters of problem and for each get the paramter type for java  and its name and combine into a string
        const java_params = parameters.map(p => `${typeSystem[p.type]?.java || p.type} ${p.name}`).join(', ');
        // get the java reutrn type based on the problem general type
        const java_return_type = typeSystem[return_type]?.java || return_type;

        // create a dynamic remplate for problem in java based onreturn type, function name, and paramters and its types of problem.
        let temp = 
            `
            class Solution {
                public ${java_return_type} ${function_name}(${java_params}) {
                    // Your code here
                    return null;
                }
            }
            `;
    }

}

module.exports = templateGenerators;

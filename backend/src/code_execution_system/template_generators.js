const typeSystem = require('./data_type_system');

// generates the *user code* template "what the user sees" based on different languages dyanmically
/* 
For example what the user sees:
def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your code here
    pass

Given the problem function_name, parameters, return_type it creates those parameter/type-hint comments dynamically.
Also generates funtion header given langauge, function-name, parameters dynamically.

When user is in match we have to fetchProblem(), this calls request /get-match-problem, which everytime dynamically creates the template using
templateGenerators below for that problem.
*/
const templateGenerators = {
    
    python: (problem) => {  // given problem-obj
        const {function_name, parameters, return_type} = problem;  // given a problem

        // iterate all parameters of problem and get the problem name, and combine into a comma separated list
        const param_list = parameters.map(p => p.name).join(', ');  

        // iterate all parameters and get the actual type of the parameter in this language using typeSystem
        const type_hints = parameters
            .map(p => `:type ${p.name}: ${typeSystem[p.type]?.python || p.type}`)
            .join('\n');

        // get return type of python given general return type of problem
        const py_return_type = typeSystem[return_type]?.python || return_type;

        // indent type_hints lines properly for Python docstring (8 spaces inside function)
        const indented_type_hints = type_hints
            .split('\n')
            .map(line => '    ' + line) // 8 spaces
            .join('\n');

        // dynamically create a template of the problem code that the user sees, based on the given problem name and parameters and their types
        // also based on the return type of problem of this language
         const temp = `def ${function_name}(${param_list}):
    """
${indented_type_hints}
    :rtype: ${py_return_type}
    """
    # Your code here
    pass`;

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

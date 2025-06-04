const typeSystem = require('./output_handling');


const codeWrappers = {

    python: (problem, userCode) => {  // given a problem and userCode (what the user sees)
        const {function_name, parameters} = problem;

        // for every parameter of this problem create a string line of code that creates a variable
        // that stores that input-param as its data structure type inthe code, (in the background user doesnt see)
        // ex, input_data["nums"] real python array , input_data["target"] real python int.
        const inputParsingCode = parameters.map(param => {
            return `${param.name} = input_data["${param.name}"]`;
        }).join("\n");

        // create a func-call string that just calls the problem function at the end
        const function_call = `${function_name}(${parameters.map(p => p.name).join(', ')})`;

        // get the line of code that prints the output based on the language 
        const output_handle = generateOutputHandling("python", problem.return_type);

        // based on input parsing code of this problem's parameteres, and users code, the function call and output printing wrap the final code
        let temp =
            `
            import sys
            import json
            
            # Input parsing
            input_data = json.loads(sys.stdin.read())
            ${inputParsingCode}

            # Users Solution
            ${userCode}

            # Call output
            result = ${function_call}
            ${output_handle}
            `;

        return temp;

    }

}

module.exports = templateGenerators;

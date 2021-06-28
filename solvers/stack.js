import objectHash from "object-hash"
import stringify from "json-stable-stringify"

export function makeSolver({
        generateNextStates,
        isValid,
        isSolved,
        checkDuplicates,
        returnMeta,
    }) {
    return (state) => {
        let visited = 0
        let steps = []

        let duplicates = new Set()
        let dupCheck = false

        /* sudoku timings 
        2.31 none: no duplicate check (may not return if loops are possible)
        3.85 json: check by json.stringify, may be unstable (which will recheck some answers if state has hashes)
        9.54 stable: check using a stable version of json.stringify
        20.53 hash: check using the object hash library, may have collisions (which may skip the correct answer)
        */
        if (checkDuplicates == 'stable') {
            dupCheck = stringify
        } else if (checkDuplicates == 'hash') {
            dupCheck = objectHash
        } else if (checkDuplicates == 'json') {
            dupCheck = JSON.stringify
        }


        /* ----- */

        let currentNode = {
            children: [{
                step: function(state) {},
                unstep: function(state) { throw 'No solution found' },
                children: [],
            }],
        }

        while (true) {
            // Advance to the next node in the state tree
            // If we have another child to try, try that first
            if (currentNode.children.length > 0) {
                currentNode = currentNode.children.shift()
                currentNode.step(state)
                if (currentNode.text) steps.push(currentNode.text)
            }
            // If we don't, unwind and go back to the parent node
            else {
                currentNode.unstep(state)
                if (currentNode.text) steps.pop()
                currentNode = currentNode.parent
                continue
            }

            // If the current state has been visited, advance
            visited++
            if (dupCheck) {
                let value = dupCheck(state)
                if (duplicates.has(value)) {
                    continue
                } else {
                    duplicates.add(value)
                }
            }

            // If we get into an invalid state, advance
            if (!isValid(state)) {
                continue
            }

            // If we have a solution, we're done searching
            if (isSolved(state)) {
                return returnMeta ? {steps, state, visited} : state
            }

            // Otherwise add all child nodes then try the first one
            for (let node of generateNextStates(state)) {
                currentNode.children.push({
                    parent: currentNode,
                    children: [],
                    ...node
                })
            }
        }
    }
}
import objectHash from "object-hash"
import stringify from "json-stable-stringify"

// TODO: Paramaterize check duplicates
export function makeSolver({
        generateNextStates,
        isValid,
        isSolved,
        checkDuplicates,
        returnMeta
    }) {
    return (state) => {
        let visited = 0
        let steps = []

        let duplicates = new Set()
        let dupCheck = false;

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

        let recur = () => {
            visited++
            if (dupCheck) {
                let value = dupCheck(state)
                if (duplicates.has(value)) {
                    return false
                } else {
                    duplicates.add(value)
                }
            }

            if (!isValid(state)) {
                return false
            }

            if (isSolved(state)) {
                return true
            }

            for (let {step, unstep, text} of generateNextStates(state)) {
                step(state)
                if (text) steps.push(text)

                if (recur()) {
                    return true
                } else {
                    unstep(state)
                    if (text) steps.pop()
                }
            }

            return false
        }
        
        if (recur()) {
            return returnMeta ? {steps, state, visited} : state
        } else {
            throw 'No solution found'
        }
    }
}
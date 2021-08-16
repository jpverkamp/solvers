import { Map, List, Set, fromJS } from 'immutable'

export function makeSolver({
        generateNextStates, // state -> [{state, step: String}, ...] // The string is a description of the step
        isValid,            // state -> Boolean: Is the given state valid
        isSolved,           // state -> Boolean: Is the given state a solution
        searchMode,         // [dfs(default), bfs, state -> Integer], depth/breadth first or a scoring function, higher scores first
        returnFirst,        // Boolean: Return the first solution found (false, check all and return least steps)
        debug,              // Boolean: Is debug mode set
        maxTime,            // Integer: If set, don't run more than this many seconds
    }) {

    // Takes a state and returns {state, steps, iterations}
    // If returnFirst is set, return the first solution we find; if not, keep looking and return the shortest solution
    return (state) => {
        let startTime = Date.now()
        let error = null

        // Map of <State, Steps> recording the shortest way to get to each state
        // If you ever see a duplicate state with a shorter path, update this
        let visited = Map()

        // Record solutions
        let solutions = Set()

        // List of states to visit, paired with the steps taken to get to them
        // Starts with the initial state and no steps (since we just started here)
        // If we're searching with a scored mode, include the score
        let initialNode = {state: fromJS(state), steps: List()}
        if (typeof(searchMode) === 'function') {
            initialNode.score = searchMode(initialNode.state)
        }
        let toVisit = List().push(initialNode)
        
        // Count how many nodes we processed for logging purposes
        let iterations = 0

        if (debug) {
            console.log('TO VISIT:')
            console.log(toVisit)
            console.log(toVisit.size)
        }

        // As long as we have at least one more node to visit, keep going
        while (toVisit.size > 0) {
            iterations++
            if (debug) console.log(`iteration: ${iterations}, queue size: ${toVisit.size}`)

            // Pop off the new value we're working on
            let {state: currentState, steps: currentSteps, score: currentScore} = toVisit.first()
            if (debug) console.log(`currentState: ${currentState}, currentSteps: ${currentSteps}, score: ${currentScore}`)
            toVisit = toVisit.shift()

            // If this state is invalid, discard it and move on
            if (!isValid(currentState)) {
                if (debug) console.log('NOT VALID')
                continue
            }

            // If we have a solution:
            // - If we're returning the first solution, return it and steps to get to it
            // - If not, record it
            if (isSolved(currentState)) {
                if (debug) console.log('SOLVED')

                if (returnFirst) {
                    return {
                        state: currentState.toJS(),
                        steps: currentSteps.toJS(),
                        iterations,
                        duration: (Date.now() - startTime) / 1000,
                        error
                    }
                } else {
                    solutions = solutions.add(currentState)
                }   
            }

            // Otherwise, check:
            // - If we've reached a new known state
            // - If it's a known state that contains fewer steps
            // Either way, do not continue processing
            if (!visited.contains(currentState)) {
                if (debug) console.log('storing new record in visited')
                visited = visited.set(currentState, currentSteps)
            } else {
                if (currentSteps.size < visited.get(currentState).size) {
                    if (debug) console.log('better path found')
                    visited = visited.set(currentState, currentSteps)        
                }
                continue
            }

            // A valid state that isn't a solution, check all neighbors from this state
            for (let {state: nextState, step} of generateNextStates(currentState)) {
                if (debug) console.log(`adding state: ${nextState} ${step}`)
                let newNode = {
                    state: nextState,
                    steps: currentSteps.push(step)
                }

                // Depth first search adds to the beginning (search these before all current nodes)
                if (searchMode === 'dfs' || searchMode === undefined) {
                    toVisit = toVisit.unshift(newNode)
                }
                
                // Breadth first search adds to the end (so we'll search these after all current nodes)
                else if (searchMode == 'bfs') {
                    toVisit = toVisit.push(newNode)
                }

                // Functional search, calculates and includes a score
                // toVisit will be sorted by these scores descending
                // Highest scores will end up at the beginning of the list, so will be processed first
                // If score returns a constant score, this is equivalent to DFS
                else if (typeof(searchMode) === 'function') {
                    // Calculate the score for the next state
                    newNode.score = searchMode(nextState)

                    if (debug) console.log(`scored new node ${newNode.score}: ${newNode.state}`)

                    // Edge case, no nodes
                    if (toVisit.size === 0) {
                        toVisit = toVisit.push(newNode)
                        continue
                    }

                    // Use a binary search to insert the scored node into the visited nodes
                    let lo = 0
                    let hi = toVisit.size - 1
                    while (hi - lo > 1) {
                        let mid = ((lo + hi) / 2) | 0 // Integer division by forcing cast to Int for | operator

                        if (newNode.score >= toVisit.get(mid).score) {
                            hi = mid
                        } else {
                            lo = mid
                        }
                    }
                    toVisit = toVisit.insert(lo, newNode)

                } else {
                    error = `Unknown search mode ${searchMode}`
                    break
                }
            }

            // If we've spent too long, bail out
            let currentDuration = (Date.now() - startTime) / 1000
            if (maxTime !== undefined && currentDuration > maxTime) {
                error = 'maxTime reached'
                break
            }
        }

        // If we've made it this far, check if we have any solutions
        // We need to return the shortest one
        let shortestState = null
        let shortestSteps = null

        for (let state of solutions) {
            let steps = visited[state]
            if (shortestState === null || steps.size < shortestSteps.size) {
                shortestState = state
                shortestSteps = steps
            }
        }

        let result = {
            iterations,
            duration: (Date.now() - startTime) / 1000,
            error,
        }

        if (shortestState) {
            result.state = shortestState.toJS()
            result.steps = shortestSteps.toJS()
        }

        return result
    }
}
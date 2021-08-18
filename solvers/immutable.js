import { Map, List, Set, Record, fromJS } from 'immutable'

export function makeSolver({
    generateNextStates, // state -> [{state, step: String}, ...] // The string is a description of the step
    isValid,            // state -> Boolean: Is the given state valid
    isSolved,           // state -> Boolean: Is the given state a solution
    searchMode,         // [dfs(default), bfs, state -> Integer], depth/breadth first or a scoring function, higher scores first
    returnFirst,        // Boolean: Return the first solution found (false, check all and return least steps)
    debug,              // Boolean: Is debug mode set
    progressEvery,      // Integer: Print progress every N iterations (0/undefined to disable)
    maxTime,            // Integer: If set, don't run more than this many seconds
}) {

    // Takes a state and returns {state, steps, iterations}
    // If returnFirst is set, return the first solution we find; if not, keep looking and return the shortest solution
    return (state) => {
        let startTime = Date.now()
        let error = null

        // Each node stores a state, and the shortest way to get to it
        let Node = Record({
            state: null,
            previousNode: null,
            step: null,
            distance: 0,
            score: 0,
        })

        // Visited is a map of state into the node graph
        let visited = Map()

        // Calculate the steps to get to a specific node
        let stepsTo = (node) => {
            let steps = []

            while (node) {
                steps.unshift(node.step)
                node = node.previousNode
            }

            return steps
        }

        // Record solutions
        let solutions = Set()

        // List of states to visit, paired with the steps taken to get to them
        // Starts with the initial state and no steps (since we just started here)
        // If we're searching with a scored mode, include the score
        let toVisit = List().push(Node({
            state: fromJS(state),
            step: 'start',
            score: typeof (searchMode) === 'function' ? searchMode(fromJS(state)) : 0,
        }))

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
            if (debug) console.log('===== ===== ===== ===== =====')
            if (debug) console.log(`iteration: ${iterations}, queue size: ${toVisit.size}`)
            if (progressEvery && iterations % progressEvery == 0) console.log(`iteration: ${iterations}, queue size: ${toVisit.size}`)

            // Pop off the new value we're working on
            let currentNode = toVisit.first()
            let { state: currentState, previousNode, step, distance, score } = currentNode
            if (debug) console.log(`currentNode: ${currentNode.toJSON()}`)
            if (debug) console.log(`current steps to node: ${stepsTo(currentNode)}`)
            toVisit = toVisit.shift()

            // If this state is invalid, discard it and move on
            if (!isValid(currentState)) {
                if (debug) console.log('invalid state found')
                continue
            }

            // If we have a solution:
            // - If we're returning the first solution, return it and steps to get to it
            // - If not, record it
            if (isSolved(currentState)) {
                if (debug) console.log('solution found')

                if (returnFirst) {
                    return {
                        state: currentState.toJS(),
                        steps: stepsTo(currentNode),
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
            if (visited.has(currentState)) {
                if (debug) console.log(`duplicate state found`)

                let visitedPreviousNode = visited.get(currentState)
                if (distance < visitedPreviousNode.distance) {
                    if (debug) console.log(`better path found`)
                    if (debug) console.log('previousNode', visitedPreviousNode.toJSON())
                    if (debug) console.log('currentNode', currentNode.toJSON())
                    visited = visited.set(currentState, currentNode)
                    if (debug) console.log('visited after', visited.get(currentState).toJSON())
                } else {
                    currentNode = currentNode.set('previousNode', visitedPreviousNode)
                }
                continue
            } else {
                if (debug) console.log('storing new record in visited')
                visited = visited.set(currentState, currentNode)
            }

            // A valid state that isn't a solution, check all neighbors from this state
            for (let { state: nextState, step } of generateNextStates(currentState)) {
                if (debug) console.log(`adding state: ${nextState} ${step}`)

                let newNode = Node({
                    state: nextState,
                    previousNode: currentNode,
                    step: step,
                    distance: distance + 1,
                })

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
                else if (typeof (searchMode) === 'function') {
                    // Calculate the score for the next state
                    newNode = newNode.set('score', searchMode(nextState))

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
        let shortestSolvedNode = null

        if (debug) console.log('SOLUTIONS')
        if (debug) console.log(solutions.toJSON())

        for (let state of solutions) {
            let node = visited.get(state)
            if (shortestSolvedNode === null || node.distance < shortestSolvedNode.distance) {
                shortestSolvedNode = node
            }
        }

        let result = {
            iterations,
            duration: (Date.now() - startTime) / 1000,
            error,
        }

        if (shortestSolvedNode) {
            result.state = shortestSolvedNode.state.toJS()
            result.steps = stepsTo(shortestSolvedNode)
        }

        return result
    }
}
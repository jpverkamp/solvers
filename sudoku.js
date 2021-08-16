import { Set } from 'immutable'
import { makeSolver } from './solvers/immutable.js'
import { markdownTable } from 'markdown-table'

/* Problem definition */

let indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8]

let getRow = (state, row) => indexes.map(i => state.get(row).get(i))
let getCol = (state, col) => indexes.map(i => state.get(i).get(col))
let getCel = (state, cel) => indexes.map(i => state.get(3 * Math.floor(cel / 3) + Math.floor(i / 3)).get(3 * (cel % 3) + (i % 3)))

let getCelIndex = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3)

let hasDup = (vs) => vs.some(v1 => v1 != 0 && vs.filter(v2 => v1 == v2).length != 1)

let generateNextStates = function*(state) {
    // Find the empty cell with the fewest degrees of freedom
    let bestI = 0
    let bestJ = 0
    let bestDoF = 100
    let bestVS = null

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (state.get(i).get(j) === 0) {
                let row = Set(getRow(state, i))
                let col = Set(getCol(state, j))
                let cel = Set(getCel(state, getCelIndex(i, j)))
                let all = row.union(col).union(cel)
                let dof = 10 - all.size

                if (bestVS === null || dof < bestDoF) {
                    bestI = i
                    bestJ = j
                    bestDoF = dof
                    bestVS = Set([1, 2, 3, 4, 5, 6, 7, 8, 9]).subtract(all)
                }
            }
        }
    }

    for (let v of bestVS) {
        yield {
            state: state.set(bestI, state.get(bestI).set(bestJ, v)),
            step: `(${bestI}, ${bestJ}) => ${v}`
        }
    }
}

let isValid = function(state) {
    for (let p = 0; p < 9; p++) {
        if (hasDup(getRow(state, p)) 
                || hasDup(getCol(state, p))
                || hasDup(getCel(state, p)))
            return false
    }
    return true
}

let isSolved = function(state) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (state.get(i).get(j) === 0)
                return false
        }
    }

    for (let p = 0; p < 9; p++) {
        if (hasDup(getRow(state, p)) 
                || hasDup(getCol(state, p))
                || hasDup(getCel(state, p)))
            return false
    }

    return true
}

let solveSudoku = makeSolver({
    generateNextStates,
    isValid,
    isSolved,
    returnFirst: true,
    debug: false,
    searchMode: 'dfs', 
})

let sudokuToString = (state) => state.map(row => row.join('')).join('\n') + '\n'

export { solveSudoku, sudokuToString }

/* Test framework */

if (process.argv.includes('--test')) {
    let defaultArguments = {
        returnFirst: true,
        debug: false,
        maxTime: 30,
    }
    
    let searchModes = {
        'Depth First Search': 'dfs',
        'Breadth First Search': 'bfs',
        'Constant score': (state) => 1, // Equivalent to DFS
        'Count non-zero squares': (state) => {
            let score = 0
            state.map(row => row.map(v => score += v === 0 ? 0 : 1))
            return score
        },
        'Count degrees of freedom': (state) => {
            for (let p = 0; p < 9; p++) {
                if (hasDup(getRow(state, p)) 
                        || hasDup(getCol(state, p))
                        || hasDup(getCel(state, p)))
                    return -1
            }
    
            let score = 0
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    let row = Set(getRow(state, r))
                    let col = Set(getCol(state, c))
                    let cel = Set(getCel(state, getCelIndex(r, c)))
    
                    score += 10 - row.union(col).union(cel).size
                }
            }
            return score
        },
    }
    
    let generators = {
        'Fill from top left': function*(state) {
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    if (state.get(i).get(j) === 0) {
                        for (let v = 1; v <= 9; v++) {
                            yield {
                                state: state.set(i, state.get(i).set(j, v)),
                                step: `(${i}, ${j}) => ${v}`
                            }
                        }
                        return
                    }
                }
            }
        },
        'Fill fewest degrees of freedom first': generateNextStates,
    }
    
    let tests = {
        'easy': [
            [0,4,0,0,0,0,1,7,9],
            [0,0,2,0,0,8,0,5,4],
            [0,0,6,0,0,5,0,0,8],
            [0,8,0,0,7,0,9,1,0],
            [0,5,0,0,9,0,0,3,0],
            [0,1,9,0,6,0,0,4,0],
            [3,0,0,4,0,0,7,0,0],
            [5,7,0,1,0,0,2,0,0],
            [9,2,8,0,0,0,0,6,0]
        ],
        'hard': [
            [1,0,0,0,0,7,0,9,0],
            [0,3,0,0,2,0,0,0,8],
            [0,0,9,6,0,0,5,0,0],
            [0,0,5,3,0,0,9,0,0],
            [0,1,0,0,8,0,0,0,2],
            [6,0,0,0,0,4,0,0,0],
            [3,0,0,0,0,0,0,1,0],
            [0,4,0,0,0,0,0,0,7],
            [0,0,7,0,0,0,3,0,0]
        ],
        'hardest': [
            [8,0,0,0,0,0,0,0,0],
            [0,0,3,6,0,0,0,0,0],
            [0,7,0,0,9,0,2,0,0],
            [0,5,0,0,0,7,0,0,0],
            [0,0,0,0,4,5,7,0,0],
            [0,0,0,1,0,0,0,3,0],
            [0,0,1,0,0,0,0,6,8],
            [0,0,8,5,0,0,0,1,0],
            [0,9,0,0,0,0,4,0,0]
        ],
    }
    
    let results = [[
        'Search Name',
        'Generator Name',
        'Test Name',
        'Iterations',
        'Duration',
        'Iter/Sec',
        'Error',
    ]]
    
    for (let [generatorName, generateNextStates] of Object.entries(generators)) {
        for (let [searchName, searchMode] of Object.entries(searchModes)) {
            let solve = makeSolver({...defaultArguments, searchMode, generateNextStates, isValid, isSolved})
    
            for (let [testName, input] of Object.entries(tests)) {
                console.log(`Running ${searchName}, ${generatorName} on ${testName}`)
    
                let {state: output, steps, iterations, duration, error} = solve(input)
    
                results.push([
                    searchName, 
                    generatorName,
                    testName,
                    iterations,
                    duration,
                    Math.round(iterations / duration),
                    error,
                ])
            }
        }
    }
    console.log()
    console.log(markdownTable(results))
}


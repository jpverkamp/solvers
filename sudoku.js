import { makeSimpleSolver } from './solver.js'

let indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8]

let getRow = (state, row) => indexes.map(i => state[row][i])
let getCol = (state, col) => indexes.map(i => state[i][col])
let getCel = (state, cel) => indexes.map(i => state[3 * Math.floor(cel / 3) + Math.floor(i / 3)][3 * (cel % 3) + (i % 3)])

let hasDup = (vs) => vs.some(v1 => v1 != 0 && vs.filter(v2 => v1 == v2).length != 1)

let solveSudoku = makeSimpleSolver({
    checkDuplicates: 'stable',
    generateNextStates: function*(state) {
        // Find the first empty cell
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (state[i][j] == 0) {
                    // Try each value in it
                    for (let v = 1; v <= 9; v++) {
                        yield {
                            step: function(state) { state[i][j] = v },
                            unstep: function(state) { state[i][j] = 0 }
                        }
                    }
                    return
                }
            }
        }
    },
    isValid: function(state) {
        for (let p = 0; p < 9; p++) {
            if (hasDup(getRow(state, p)) 
                    || hasDup(getCol(state, p))
                    || hasDup(getCel(state, p)))
                return false
        }
        return true
    },
    isSolved: function(state) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (state[i][j] == 0)
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
})

let test_easy = [
	[0,4,0,0,0,0,1,7,9],
	[0,0,2,0,0,8,0,5,4],
	[0,0,6,0,0,5,0,0,8],
	[0,8,0,0,7,0,9,1,0],
	[0,5,0,0,9,0,0,3,0],
	[0,1,9,0,6,0,0,4,0],
	[3,0,0,4,0,0,7,0,0],
	[5,7,0,1,0,0,2,0,0],
	[9,2,8,0,0,0,0,6,0]
]

let test_hard = [
    [1,0,0,0,0,7,0,9,0],
    [0,3,0,0,2,0,0,0,8],
    [0,0,9,6,0,0,5,0,0],
    [0,0,5,3,0,0,9,0,0],
    [0,1,0,0,8,0,0,0,2],
    [6,0,0,0,0,4,0,0,0],
    [3,0,0,0,0,0,0,1,0],
    [0,4,0,0,0,0,0,0,7],
    [0,0,7,0,0,0,3,0,0]
]

let test_hardest = [
    [8,0,0,0,0,0,0,0,0],
    [0,0,3,6,0,0,0,0,0],
    [0,7,0,0,9,0,2,0,0],
    [0,5,0,0,0,7,0,0,0],
    [0,0,0,0,4,5,7,0,0],
    [0,0,0,1,0,0,0,3,0],
    [0,0,1,0,0,0,0,6,8],
    [0,0,8,5,0,0,0,1,0],
    [0,9,0,0,0,0,4,0,0]
]

let test = test_hardest

function sudokuToString(state) {
    return state.map(row => row.join('')).join('\n') + '\n'
}

console.log(sudokuToString(test))
console.log(sudokuToString(solveSudoku(test)))

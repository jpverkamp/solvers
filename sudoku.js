import { makeSolver } from './solvers/recursive.js'

let indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8]

let getRow = (state, row) => indexes.map(i => state[row][i])
let getCol = (state, col) => indexes.map(i => state[i][col])
let getCel = (state, cel) => indexes.map(i => state[3 * Math.floor(cel / 3) + Math.floor(i / 3)][3 * (cel % 3) + (i % 3)])

let hasDup = (vs) => vs.some(v1 => v1 != 0 && vs.filter(v2 => v1 == v2).length != 1)

let solveSudoku = makeSolver({
    returnMeta: true,
    generateNextStates: function*(state) {
        // Find the first empty cell
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (state[i][j] == 0) {
                    // Try each value in it
                    for (let v = 1; v <= 9; v++) {
                        yield {
                            step: function(state) { state[i][j] = v },
                            unstep: function(state) { state[i][j] = 0 },
                            text: `(${i}, ${j}) => ${v}`
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

let sudokuToString = (state) => state.map(row => row.join('')).join('\n') + '\n'

export { solveSudoku, sudokuToString }
import { sudokuToString, solveSudoku } from './sudoku.js'

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
    ]
}

for (let test in tests) {
    let input = tests[test]

    console.log(`===== ${test} =====`)
    console.log(`input:`)
    console.log(sudokuToString(input))

    console.time(test)
    let output = solveSudoku(input)
    console.timeEnd(test)
    console.log()

    console.log(`output:`)
    console.log(sudokuToString(input))
}

import fs from 'fs'
import { makeSolver } from './solvers/immutable.js'
import { Map, List, Set, Record, fromJS } from 'immutable'
import { exit } from 'process'

let DEBUG = false
let PROGRESS_EVERY
let TIMEOUT

const SNAKE_BOUNDS = [
    { min: 'A', max: 'Z' },
    { min: 'a', max: 'z' },
    { min: '0', max: '9' },
]

let Point = Record({ r: 0, c: 0 })
let State = Record({
    walls: Set(),   // tiles that can't be walked through
    spikes: Set(),  // tiles that kill snakes touching them
    snakes: List(), // each snake is an ordered list of points from head to tail
    fruits: Set(),  // each fruit makes the snake that eats it one longer
    exit: Point(),  // each snake that reaches the exit is removed, when the last is removed you win
})

function loadLevel(path) {
    let rawData = fs.readFileSync(path, { encoding: 'utf8' })
    let data = rawData.split('\n')

    let walls = Set()
    let spikes = Set()
    let snakes = List()
    let fruits = Set()
    let exit = Point()

    // a list of snake definitions in files with an ordered range of characters for each
    // example snakes would be ABC or abc or 123
    let rawSnakes = SNAKE_BOUNDS.map(_ => [])

    for (var r = 0; r < data.length; r++) {
        cloop:
        for (var c = 0; c < data[r].length; c++) {
            let pt = Point({ r, c })

            // empty space
            if (data[r][c] == '-') {
                continue
            }

            // walls
            if (data[r][c] == '#') {
                walls = walls.add(pt)
                continue
            }

            // spikes
            if (data[r][c] == '^') {
                spikes = spikes.add(pt)
                continue
            }

            // fruits
            if (data[r][c] == '+') {
                fruits = fruits.add(pt)
                continue
            }

            // exit
            if (data[r][c] == '*') {
                exit = pt
                continue
            }

            // snakes, just collect the points for now with the character for later sorting
            for (let i = 0; i < SNAKE_BOUNDS.length; i++) {
                if (data[r][c] >= SNAKE_BOUNDS[i].min && data[r][c] <= SNAKE_BOUNDS[i].max) {
                    rawSnakes[i].push([data[r][c], pt])
                    continue cloop
                }
            }

            // wtf
            throw `Unknown character ${data[r][c]} at ${r}:${c}`
        }
    }

    // sort the snakes based on their character definition, push the list of points to state
    for (let rawSnake of rawSnakes) {
        if (rawSnake.length == 0) continue

        let pts = []
        for (let [_, pt] of rawSnake.sort()) {
            pts.push(pt)
        }
        snakes = snakes.push(List(pts))
    }

    return State({ walls, spikes, snakes, fruits, exit })
}

function snakebirdToString(state) {
    // Determine drawing bounds
    // This is necessary since snakes can run off platforms a bit
    let [minR, maxR, minC, maxC] = [0, 0, 0, 0]
    function bound(pt) {
        minR = Math.min(minR, pt.r)
        maxR = Math.max(maxR, pt.r)
        minC = Math.min(minC, pt.c)
        maxC = Math.max(maxC, pt.c)
    }

    state.walls.forEach(bound)
    state.snakes.forEach(snake => snake != null && snake.forEach(bound))
    state.fruits.forEach(bound)
    bound(state.exit)

    let str = ''
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            let pt = Point({ r, c })

            if (state.walls.has(pt)) {
                str += '#'
            } else if (state.spikes.has(pt)) {
                str += '^'
            } else if (state.fruits.has(pt)) {
                str += '+'
            } else if (state.exit.equals(pt)) {
                str += '*'
            } else if (state.snakes.some(snake => snake != null && snake.includes(pt))) {
                for (let i = 0; i < state.snakes.size; i++) {
                    if (state.snakes.get(i) == null) continue
                    for (let j = 0; j < state.snakes.get(i).size; j++) {
                        if (state.snakes.get(i).get(j).equals(pt)) {
                            str += String.fromCharCode(SNAKE_BOUNDS[i].min.charCodeAt(0) + j)
                        }
                    }
                }
            } else {
                str += '-'
            }
        }

        str += '\n'
    }

    return str
}

let isValid = function (state) {
    // check if any snake is on a spike
    if (state.snakes.some(snake => snake != null && snake.some(pt => state.spikes.has(pt)))) return false

    // check if any snake is falling forever

    // find the lowest row
    let maxR = 0
    state.walls.forEach(pt => { maxR = Math.max(maxR, pt.r) })

    // check that each snake has at least one point within that bound
    return state.snakes.every(snake => snake == null || snake.some(pt => pt.r <= maxR))
}

let isSolved = function (state) {
    return state.fruits.size == 0 && state.snakes.every(snake => snake == null)
}

let generateNextStates = function* (state) {
    //if (DEBUG) console.clear()
    if (DEBUG) console.log(snakebirdToString(state))
    if (DEBUG) console.log('fruits left', state.fruits.size)
    if (DEBUG) console.log('snakes left', state.snakes.filter(snake => snake != null).size)

    // handle hitting the exits (including by falling)
    // can only exit if there are no fruits left
    if (state.fruits.size == 0) {
        for (let i = 0; i < state.snakes.size; i++) {
            let snake = state.snakes.get(i)
            if (snake === null) continue

            // if we hit an exit, remove this snake
            // only remove one snake per iteration
            if (snake.some(pt => pt.equals(state.exit))) {
                if (DEBUG) console.log(`snake ${i} (${SNAKE_BOUNDS[i].min}-${SNAKE_BOUNDS[i].max}) exiting`)

                yield {
                    state: state.set('snakes', state.get('snakes').set(i, null)),
                    step: `${i}*`,
                }
                return
            }
        }
    }

    // handle gravity
    gravityEachSnake:
    for (let i = 0; i < state.snakes.size; i++) {
        let snake = state.snakes.get(i)
        if (snake == null) continue

        for (let pt of snake) {
            let ptd = pt.set('r', pt.get('r') + 1)

            // supported by a wall
            if (state.walls.has(ptd))
                continue gravityEachSnake

            // supported by another snake
            if (state.snakes.some(otherSnake => snake != null && otherSnake != null && snake != otherSnake && otherSnake.includes(ptd)))
                continue gravityEachSnake
        }

        if (DEBUG) console.log(`snake ${i} (${SNAKE_BOUNDS[i].min}-${SNAKE_BOUNDS[i].max}) falling`)

        // if we made it this far, the snake should fall one point
        let newSnake = snake.map(pt => pt.set('r', pt.get('r') + 1))

        yield {
            state: state.set('snakes', state.get('snakes').set(i, newSnake)),
            step: `${i}f`,
        }

        // Only generate a single fall per iteration
        return
    }

    // otherwise try to move each snake in each direction
    for (let i = 0; i < state.snakes.size; i++) {
        let snake = state.snakes.get(i)
        if (snake == null) continue

        for (let [d, cd, rd] of [['→', 1, 0], ['←', -1, 0], ['↓', 0, 1], ['↑', 0, -1]]) {
            // check that the square is empty
            // hitting a fruit or an exit is fine
            let pt = snake.get(0)
            pt = pt.set('r', pt.get('r') + rd).set('c', pt.get('c') + cd)

            if (state.walls.has(pt)) continue
            if (state.snakes.some(snake => snake != null && snake.includes(pt))) continue

            // move the snake by adding the new point to the front of the snake
            // if we hit a fruit, keep the last element to make the snake longer
            // otherwise, remove the end of the list to simulate movement
            let newSnake = snake.unshift(pt)
            let ateFruit = state.fruits.has(pt)
            if (!ateFruit) {
                newSnake = newSnake.pop()
            }

            let newState = state.set('snakes', state.snakes.set(i, newSnake))
            if (ateFruit) {
                newState = newState.set('fruits', newState.get('fruits').remove(pt))
            }
            if (DEBUG) console.log('newState', newState.toJSON())

            yield {
                state: newState,
                step: `${i}${d}${ateFruit ? 'g' : ''}`,
            }
        }

    }
}

if (process.argv.includes('--debug')) {
    DEBUG = true;
    process.argv.splice(process.argv.indexOf('--debug'), 1)
}

if (process.argv.includes('--progress')) {
    let index = process.argv.indexOf('--progress')
    PROGRESS_EVERY = parseInt(process.argv[index + 1]);
    process.argv.splice(index, 2)
}

if (process.argv.includes('--timeout')) {
    let index = process.argv.indexOf('--timeout')
    TIMEOUT = parseInt(process.argv[index + 1]);
    process.argv.splice(index, 2)
}

if (DEBUG) {
    console.log(`Options: DEBUG=${DEBUG}, PROGRESS_EVERY=${PROGRESS_EVERY}, TIMEOUT=${TIMEOUT}`)
}

let solveSnakebird = makeSolver({
    returnFirst: false,
    searchMode: 'bfs',
    debug: DEBUG,
    progressEvery: PROGRESS_EVERY,
    maxTime: TIMEOUT,
    generateNextStates,
    isValid,
    isSolved
})

process.argv.slice(2).forEach(path => {
    console.log(`===== ${path} =====`)

    // Initial state
    let state = loadLevel(path)
    console.log(snakebirdToString(state))

    // Solve and print
    let solution = solveSnakebird(state)
    console.log('time taken:', solution.duration)
    console.log('iterations:', solution.iterations)

    // Did we find a solution?
    if (solution.error) {
        console.log('error:', solution.error)
        return
    }
    if (!solution.steps) {
        console.log('error: no steps returned (so solution found)')
        return
    }

    // Print long version of steps
    console.log('raw steps:', solution.steps.join(' '))

    // Combine steps by which 
    let output = [...solution.steps.slice(1)]
        .filter((step) => !(step == 'start' || step[1] == 'f' || step[1] == '*'))
        .map((step) => step.substring(0, 2))

    for (var i = 0; i < output.length - 1; i++) {
        if (output[i][0] == output[i + 1][0]) {
            output[i] = output[i] + output[i + 1].substring(1)
            output.splice(i + 1, 1)
            i--
            continue
        }
    }

    let combinedOutput = []
    for (let chunk of output) {
        let i = parseInt(chunk[0])
        combinedOutput.push(`select(${i}; ${SNAKE_BOUNDS[i].min}-${SNAKE_BOUNDS[i].max})`)

        chunk
            .substring(1)
            .split(/(([^\d ])\2*)/ig)
            .filter((el, i) => i % 3 == 1)
            .forEach(el => combinedOutput.push(el.length == 1 ? el : `${el.length}${el[0]}`))
    }

    console.log('combined steps:', combinedOutput.join(' '))
    console.log()
})




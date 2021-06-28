import fs from 'fs'
import { makeSolver } from './solvers/stack.js'

let DEBUG = false
let OPTIMIZE = true

const SNAKE_BOUNDS = [
    {min: 'A', max: 'Z'},
    {min: 'a', max: 'z'},
    {min: '0', max: '9'},
]

const _pointCache = {}
function point(x, y) {
    if (!(x in _pointCache)) _pointCache[x] = {}
    if (!(y in _pointCache[x])) _pointCache[x][y] = {x, y}
    return _pointCache[x][y]
}

function loadLevel(path) {
    let rawData = fs.readFileSync(path, {encoding: 'utf8'})
    let data = rawData.split('\n')

    let state = {
        walls: new Set(),   // tiles that can't be walked through
        spikes: new Set(),  // tiles that kill snakes touching them
        snakes: [],         // each snake is an ordered list of points from head to tail
        fruits: new Set(),  // each fruit makes the snake that eats it one longer
        exit: null,         // each snake that reaches the exit is removed, when the last is removed you win
    }
    
    // a list of snake definitions in files with an ordered range of characters for each
    // example snakes would be ABC or abc or 123
    let rawSnakes = SNAKE_BOUNDS.map(_ => [])
    
    for (var r = 0; r < data.length; r++) {
        cloop:
        for (var c = 0; c < data[r].length; c++) {
            let pt = point(c, r)

            // empty space
            if (data[r][c] == '-') {
                continue
            }
            
            // walls
            if (data[r][c] == '#') {
                state.walls.add(pt)
                continue
            }

            // spikes
            if (data[r][c] == '^') {
                state.spikes.add(pt)
                continue
            }
            
            // fruits
            if (data[r][c] == '+') {
                state.fruits.add(pt)
                continue
            }
    
            // exit
            if (data[r][c] == '*') {
                if (state.exit !== null) {
                    throw `Multiple exits detected at ${r}:${c}`
                }
    
                state.exit = pt
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
        state.snakes.push(pts)
    }
    
    return state
}

function snakebirdToString(state) {
    // Determine drawing bounds
    // This is necessary since snakes can run off platforms a bit
    let [minR, maxR, minC, maxC] = [0, 0, 0, 0]
    function bound(pt) {
        minR = Math.min(minR, pt.y)
        maxR = Math.max(maxR, pt.y)
        minC = Math.min(minC, pt.x)
        maxC = Math.max(maxC, pt.x)
    }
    
    state.walls.forEach(bound)
    state.snakes.forEach(snake => snake != null && snake.forEach(bound))
    state.fruits.forEach(bound)
    bound(state.exit)

    let str = ''
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            let pt = point(c, r)
            
            if (state.walls.has(pt)) {
                str += '#'
            } else if (state.spikes.has(pt)) {
                str += '^'
            } else if (state.fruits.has(pt)) {
                str += '+'
            } else if (state.exit == pt) {
                str += '*'
            } else if (state.snakes.some(snake => snake != null && snake.includes(pt))) {
                for (let i = 0; i < state.snakes.length; i++) {
                    if (state.snakes[i] == null) continue
                    for (let j = 0; j < state.snakes[i].length; j++) {
                        if (state.snakes[i][j] == pt) {
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

let solveSnakebird = makeSolver({
    returnMeta: OPTIMIZE,
    checkDuplicates: 'json',
    generateNextStates: function*(state) {
        //if (DEBUG) console.clear()
        if (DEBUG) console.log(snakebirdToString(state))
        if (DEBUG) console.log('fruits left', state.fruits.size)
        if (DEBUG) console.log('snakes left', state.snakes.filter(snake => snake != null).length)

        // handle hitting the exits (including by falling)
        // can only exit if there are no fruits left
        if (state.fruits.size == 0) {
            for (let i = 0; i < state.snakes.length; i++) {
                let snake = state.snakes[i]
                if (snake == null) continue
    
                // if we hit an exit, remove this snake
                // only remove one snake per iteration
                if (snake.some(pt => pt == state.exit)) {
                    if (DEBUG) console.log(`snake ${i} (${SNAKE_BOUNDS[i].min}-${SNAKE_BOUNDS[i].max}) exiting`)
    
                    yield {
                        step: function(state) {
                            state.snakes.splice(i, 1, null)
                        },
                        unstep: function(state) {
                            state.snakes.splice(i, 1, snake)
                        },
                        text: `${i}*`,
                    }
                    return
                }
            }
        }

        // handle gravity
        gravityEachSnake:
        for (let i = 0; i < state.snakes.length; i++) {
            let snake = state.snakes[i]
            if (snake == null) continue

            for (let pt of snake) {
                let ptd = point(pt.x, pt.y + 1)

                // supported by a wall
                if (state.walls.has(ptd))
                    continue gravityEachSnake

                // supported by another snake
                if (state.snakes.some(otherSnake => snake != null && otherSnake != null && snake != otherSnake && otherSnake.indexOf(ptd) >= 0))
                    continue gravityEachSnake
            }

            if (DEBUG) console.log(`snake ${i} (${SNAKE_BOUNDS[i].min}-${SNAKE_BOUNDS[i].max}) falling`)

            // if we made it this far, the snake should fall one point
            let oldSnake = [...snake]
            let newSnake = oldSnake.map(pt => point(pt.x, pt.y + 1))

            yield {
                step: function(state) {
                    state.snakes.splice(i, 1, newSnake)
                },
                unstep: function(state) {
                    state.snakes.splice(i, 1, oldSnake)
                },
                text: `${i}f`,
            }

            // Only generate a single fall per iteration
            return 
        }

        // otherwise try to move each snake in each direction
        for (let i = 0; i < state.snakes.length; i++) {
            let snake = state.snakes[i]
            if (snake == null) continue

            for (let [d, xd, yd] of [['→', 1, 0], ['←', -1, 0], ['↓', 0, 1], ['↑', 0, -1]]) {
                // check that the square is empty
                // hitting a fruit or an exit is fine
                let pt = point(snake[0].x + xd, snake[0].y + yd)

                if (state.walls.has(pt)) continue
                if (state.snakes.some(snake => snake != null && snake.includes(pt))) continue

                let newSnake = [...snake]
                let oldSnake = [...snake]

                // move the snake by adding the new point to the front of the snake
                // if we hit a fruit, keep the last element to make the snake longer
                // otherwise, remove the end of the list to simulate movement
                newSnake.unshift(pt)
                
                let ateFruit = state.fruits.has(pt)
                if (!ateFruit) {
                    newSnake.pop()
                }

                yield {
                    step: function(state) {
                        state.snakes.splice(i, 1, newSnake)
                        if (ateFruit) {
                            state.fruits.delete(pt)
                        }
                    },
                    unstep: function(state) {
                        state.snakes.splice(i, 1, oldSnake)
                        if (ateFruit) {
                            state.fruits.add(pt)
                        }
                    },
                    text: `${i}${d}${ateFruit ? 'g' : ''}`,
                }
            }

        }
    },
    isValid: function(state) {
        // check if any snake is on a spike
        if (state.snakes.some(snake => snake != null && snake.some(pt => state.spikes.has(pt)))) return false

        // check if any snake is falling forever

        // find the lowest row
        let maxR = 0
        state.walls.forEach(pt => { maxR = Math.max(maxR, pt.y) })

        // check that each snake has at least one point within that bound
        return state.snakes.every(snake => snake == null || snake.some(pt => pt.y <= maxR))
    },
    isSolved: function(state) {
        return state.fruits.size == 0 && state.snakes.every(snake => snake == null)
    }
})


process.argv.slice(2).forEach(path => {
    if (path == 'DEBUG') {
        DEBUG = true;
        return
    }

    console.log(`===== ${path} =====`)

    // Initial state
    let state = loadLevel(path)
    console.log(snakebirdToString(state))

    // Solve and print
    let solution = solveSnakebird(state)
    console.log(solution)
    console.log()

    // Print long version of steps
    console.log(solution.steps.join(' '))
    console.log()

    // Generate and print short version of steps
    let output = []
    let currentSnake = null
    let currentMode = null
    let currentModeCount = 0

    for (let step of solution.steps) {
        if (step[1] == 'f') continue
            
        if (step[0] != currentSnake) {
            let i = parseInt(step[0])
            // output.push(`switch ${i} (${SNAKE_BOUNDS[i].min}-${SNAKE_BOUNDS[i].max})`)
            output.push(`select(${i})`)
            currentSnake = step[0]
        }

        if (step[1] == currentMode) {
            currentModeCount++
        } else {
            if (currentModeCount == 0) {
            } else if (currentModeCount == 1) {
                output.push(`${currentMode}`)
            } else {
                output.push(`${currentModeCount}${currentMode}`)
            }

            currentMode = step[1]
            currentModeCount = 1
        }
    }
    console.log(output.join(' '))
})




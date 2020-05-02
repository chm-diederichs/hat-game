var readline = require('readline')
var fs = require('fs')


  var list = []
  var actions = []
  var scores = []

  var item
  var roundList
  var prevKey

  var count = 0
  var score = 0

  fs.readFile('list.txt', function (err,data) {
    list = JSON.parse(data).map(fromBase64)
    clear('Type an item and press enter to submit!\n')

    process.stdin.on('data', input)
  })

  function input (data) {
    var str = data.slice(0, data.byteLength - 1).toString().toUpperCase()

    if (str === '--CLEAR') {
      list = []
      save()
      return clear('New list. Type an item and press enter to submit!\n')
    }

    if (str === 'PLAY') {
      save()
      return begin()
    }

    if (str === '--RESTORE') {
      return fs.readFile('round.txt', function (err, data) {
        var obj = JSON.parse(data)

        count = obj.count
        scores = obj.scores
        score = scores[scores.length - 1]

        begin(obj.roundList.map(fromBase64))
      })
    }

    if (str.substring(0, 4) == '--R ') {
      var i = list.indexOf(str.substring(4))
      list.splice(i, 1)
    } else {
      list.push(str)
      save()
    }

    clear(`${list.length} items in the hat. Add another!\n`)
  }

  function begin (init) {
    if (!init) init = shuffle(list)

    roundList = init
    item = roundList[count]

    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)

     clear('press any key to begin!')

    process.stdin.removeListener('data', input)
    process.stdin.once('keypress', function() {
      process.stdin.on('keypress', pickOut)

      clear('challenge: ')
      console.log(item)
      instruct()
    })
  }

  function pickOut (key, data) {
    var valid = ['y', 'n', 'p', '\r']

    if (data.ctrl && data.name === 't') {
      process.exit()
    } else {
      if (valid.includes(key) || key === 'z') {
        if (!['y', 'n'].includes(prevKey) && key !== 'z') actions.push(key)
        prevKey = key
      }

      switch (key) {
        case 'r' :
          roundList = shuffle(list)
          actions = ['r']
          scores = []
          score = 0
          count = 0
          break

        case 'p' :
          roundList.push(item)
          clear('challenge:')
          break

        case '\r' :
          var prev = actions[actions.length - 1]
          clear('challenge:')

          if (prev === 'y' || prev === 'n' || prev === 'r') {
            console.log(item)
            instruct()
            return
          }

          score++
          break

        case 'n' :
          roundList.push(item)
          scores.push(score)
          break

        case 'y' :
          scores.push(++score)
          if (count >= roundList.length) {
            console.log('End of list. You scored: ' + getScore())
            return
          }
          
          break
        
        case 'z' :
          undo()
          clear('challenge: ')
          break

        default :
          clear('challenge: ')
          console.log(item)
          instruct()
          return
      }
    }

    if (count < 0) {
      item = 'start of list!'
      count = 0
    } else if (++count >= roundList.length) {
      scores.push(score)
      console.log('End of list. You scroed: ' + getScore())
      return
    } else {
      item = roundList[count]
    }

    if (['\r', 'p', 'z'].includes(key)) {
      clear('challenge :')
      console.log(item)
      instruct()
    } else if (['y', 'r', 'n'].includes(key)) {
      clear('your score is: ' + getScore())
      console.log('Press ENTER to continue!')
      save({
        roundList: roundList.map(toBase64),
        count,
        scores
      }, 'round.txt')
    }
  }

  function clear(item) {
  // prints new line 50 times.
    for(var i = 0; i < 50; i++) {
      console.log("\n")
    }
    if (item) console.log(item)
  }

  function undo () {
    var action = actions.pop()
    count -= 2

    if (action === 'p') {
      roundList.pop()
    } else if (action === 'y' || action === 'n') {
      scores.pop()
      if (action === 'y') {
        score--
      } else roundList.pop()
    } else if (action === '\r') {
      score--
    }
  }

  function shuffle (arr) {
    var currentIndex = arr.length
    var tmp
    var randomIndex

    while (0 !== currentIndex) {

      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex--

      var tmp = arr[currentIndex]
      arr[currentIndex] = arr[randomIndex]
      arr[randomIndex] = tmp
    }

    return arr
  }

  function instruct () {
    var instructions = {
      next: 'enter',
      pass: 'p',
      undo: 'z',
      'time & success': 'y',
      'time & pass': 'n',
      'next round': 'r'
    }

    console.log('\n\n')
    for (let [k, v] of Object.entries(instructions)) {
      console.log(k.padStart(15, ' '), ': ', v)
    }
  }

  function save (obj, filename) {
    if (!obj) obj = list.map(toBase64)
    if (!filename) filename = 'list.txt'

    fs.writeFile(filename, JSON.stringify(obj), function (err) {
      if (err) console.error(err)
    })
  }

  function getScore () {
    var current = scores.length ? scores[scores.length - 1] : 0
    var previous = scores.length > 1 ? scores[scores.length - 2] : 0

    return current - previous
  }


function toBase64 (item) {
  return Buffer.from(item).toString('base64')
}

function fromBase64 (item) {
  return Buffer.from(item, 'base64').toString()
}

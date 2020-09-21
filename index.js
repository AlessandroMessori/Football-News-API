const express = require('express')
const app = express()
const port = process.env.PORT || 8100
const bodyParser = require('body-parser')
const { MongoClient } = require('mongodb')
const { username, password } = require('./cred.json')

// Connection URI
const uri =
  'mongodb://' +
  username +
  ':' +
  password +
  '@3.215.77.214/football-dashboard?poolsize=20&w=majority'

// Create a new MongoClient
const client = new MongoClient(uri)

const formatDate = date => {
  const d = new Date(date)
  let month = '' + (d.getMonth() + 1)
  let day = '' + d.getDate()
  const year = d.getFullYear()

  if (month.length < 2) month = '0' + month
  if (day.length < 2) day = '0' + day

  return [year, month, day].join('-')
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

app.get('/', (req, res) => {
  res.send('Welcome to the Football-Topics API')
})

app.get('/topics', (req, res) => {
  const db = client.db('football-dashboard')
  const { name, category } = req.query
  const query = {}

  if (name !== undefined) {
    query.name = { $regex: name }
  }

  if (category !== undefined) {
    query.category = { $regex: category }
  }

  db.collection('Topics')
    .find({ ...query })
    .limit(parseInt(req.query.limit))
    .toArray((err, result) => {
      if (err) {
        console.log(err)
        throw err
      }

      res.send(result)
    })
})

app.get('/counters', (req, res) => {
  const db = client.db('football-dashboard')
  db.collection('Counters')
    .find({
      ...req.query
    })
    .limit(parseInt(req.query.limit))
    .toArray((err, result) => {
      if (err) {
        console.log(err)
        throw err
      }

      res.send(result)
    })
})

app.get('/lastDate', (req, res) => {
  const db = client.db('football-dashboard')
  db.collection('Counters')
    .find({})
    .sort({ _id: -1 })
    .limit(parseInt(1))
    .toArray((err, result) => {
      if (err) {
        console.log(err)
        throw err
      }

      res.send(result[0].date)
    })
})

app.get('/mostGained', (req, res) => {
  const db = client.db('football-dashboard')
  db.collection('Counters')
    .find({})
    .sort({ _id: -1 })
    .limit(parseInt(1))
    .toArray((err, result) => {
      if (err) {
        console.log(err)
        throw err
      }

      const lastDate = new Date(result[0].date)
      const previousDate = new Date(result[0].date)
      previousDate.setDate(lastDate.getDate() - 1)

      //MODIFY
      db.collection('Counters').aggregate(
        [
          {
            $match: {
              date: { $in: [formatDate(lastDate), formatDate(previousDate)] }
            }
          },
          {
            $group: {
              _id: '$name',
              dates: { $push: '$date' },
              counts: { $push: '$count' }
            }
          }
        ],
        (err, docs) => {
          if (err) console.log(err)

          docs.toArray((err, result) => {
            if (err) {
              console.log(err)
              throw err
            }

            let mostGained = result.map(item => {
              let delta = 0

              item.counts.forEach((count, i) => {
                const gain =
                  item.dates[i] === formatDate(lastDate) ? count : -count
                delta += gain
              })

              return { name: item._id, delta }
            })

            mostGained = mostGained.sort((a, b) => a.delta - b.delta)

            res.send(mostGained)
          })
        }
      )
    })
})

app.get('*', (req, res) => {
  res.status(404)
  res.send('Error  404 Not Found')
})

async function run () {
  try {
    // Connect the client to the server
    await client.connect()

    // Establish and verify connection
    await client.db('admin').command({ ping: 1 })

    app.listen(port, () => {
      console.log('API Server listening on port ' + port)
    })
  } catch (e) {
    console.log(e)
  }
}

run().catch(console.dir)

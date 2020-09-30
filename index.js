const express = require('express')
const app = express()
const port = process.env.PORT || 8100
const bodyParser = require('body-parser')
const { MongoClient } = require('mongodb')
const { formatDate, getLastDate, getMostGained } = require('./src/helpers')
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

app.get('/counters/:name', (req, res) => {
  const db = client.db('football-dashboard')
  const { name } = req.params

  db.collection('Counters').aggregate(
    [
      {
        $match: {
          name
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: '$count' }
        }
      }
    ],
    (err, docs) => {
      if (err) console.log(err)

      docs.toArray((err, result) => {
        if (err) console.log(err)

        const response = {
          name,
          counts: result
        }

        res.send(response)
      })
    }
  )
})

app.get('/lastDate', (req, res) => {
  getLastDate(client)
    .then(result => res.send(result))
    .catch(err => console.log(err))
})

app.get('/mostGained', (req, res) => {
  const db = client.db('football-dashboard')
  getLastDate(client)
    .then(date => {
      const lastDate = new Date(date)
      const previousDate = new Date(date)
      previousDate.setDate(lastDate.getDate() - 1)

      const query = {}

      if (req.query.category !== undefined) {
        query.category = { $regex: req.query.category }
      }

      db.collection('Counters').aggregate(
        [
          {
            $match: {
              date: { $in: [formatDate(lastDate), formatDate(previousDate)] },
              ...query
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

          getMostGained(docs, lastDate)
            .then(mostGained => {
              const sortedGainers = mostGained.sort((a, b) => a.delta - b.delta)

              res.send(sortedGainers)
            })
            .catch(err => console.log(err))
        }
      )
    })
    .catch(err => console.log(err))
})

app.get('/newComers', (req, res) => {
  const db = client.db('football-dashboard')
  const query = {}

  if (req.query.category !== undefined) {
    query.category = { $regex: req.query.category }
  }
  getLastDate(client)
    .then(date => {
      const lastDate = new Date(date)
      const previousDate = new Date(date)
      previousDate.setDate(lastDate.getDate() - 1)

      db.collection('Counters').aggregate(
        [
          {
            $match: {
              date: { $in: [formatDate(lastDate), formatDate(previousDate)] },
              ...query
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

          docs.toArray((err2, result) => {
            if (err2) console.log(err)

            const newComers = result
              .filter(
                item =>
                  item.dates.includes(formatDate(lastDate)) &&
                  !item.dates.includes(formatDate(previousDate))
              )
              .map(({ _id, counts }) => ({
                name: _id,
                count: counts.reduce((acc, val) => acc + val, 0)
              }))
              .sort((a, b) => b.count - a.count)

            res.send(newComers)
          })
        }
      )
    })
    .catch(err => console.log(err))
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

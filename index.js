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

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Welcome to the Football-Topics API')
})

app.get('/topics', (req, res) => {
  const db = client.db('football-dashboard')
  db.collection('Topics')
    .find({ category: req.query.category })
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
    .find({ category: 'league' })
    .toArray((err, result) => {
      if (err) {
        console.log(err)
        throw err
      }

      res.send(result)
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

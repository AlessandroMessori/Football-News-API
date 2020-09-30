const formatDate = date => {
  const d = new Date(date)
  let month = '' + (d.getMonth() + 1)
  let day = '' + d.getDate()
  const year = d.getFullYear()

  if (month.length < 2) month = '0' + month
  if (day.length < 2) day = '0' + day

  return [year, month, day].join('-')
}

const getLastDate = client =>
  new Promise((resolve, reject) => {
    const db = client.db('football-dashboard')
    db.collection('Counters')
      .find({})
      .sort({ _id: -1 })
      .limit(parseInt(1))
      .toArray((err, result) => {
        if (err) {
          reject(new Error(err))
        }

        resolve(result[0].date)
      })
  })

const getMostGained = (docs, lastDate) =>
  new Promise((resolve, reject) => {
    docs.toArray((err, result) => {
      if (err) {
        reject(err)
      }

      const mostGained = result.map(item => {
        let delta = 0

        item.counts.forEach((count, i) => {
          const gain = item.dates[i] === formatDate(lastDate) ? count : -count
          delta += gain
        })

        return { name: item._id, delta, category: item.categories[0] }
      })
      resolve(mostGained)
    })
  })

module.exports = {
  formatDate,
  getLastDate,
  getMostGained
}

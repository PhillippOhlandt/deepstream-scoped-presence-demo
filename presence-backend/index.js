var deepstream = require('deepstream.io-client-js')

var ds = deepstream(process.env.DEEPSTREAM_HOST + ':' + process.env.DEEPSTREAM_PORT)

var users = []
var records = []
var loggedIn = false

ds.login({
  username: 'backend',
  password: 'password'
}, (success, data) => {
  if (success) {

    users = []
    records = []

    if (loggedIn) {
      ds.rpc.unprovide('join-chat')
      ds.presence.unsubscribe(onPresenceChange)
      ds.record.unlisten('presence/.*')
    }

    listenForPresence()
    listenForPresenceRecords()
    provideRPC()

    loggedIn = true;
  }
})

function provideRPC() {
  ds.rpc.provide('join-chat', function(data, response) {

    var record = ds.record.getRecord('presence/' + data.room)

    record.set(data.me.username, {
      online: true,
      role: data.me.role
    })

    record.discard()

    record = null

    response.send(data);
  });
}

function listenForPresenceRecords() {
  ds.record.listen('presence/.*', (match, isSubscribed, response) => {
    console.log(match, isSubscribed) // 'settings/security'
    if (isSubscribed) {

      response.accept()

      records.push(match)
        // star publishing to this record via `client.record.getRecord(match).set(/* data */)`

    } else {

      var index = records.indexOf(match);
      if (index > -1) {
        records.splice(index, 1);
      }

      ds.record.getRecord(match).discard()

    }
    updatePresenceRecords('RECORDS_LISTING')
  })
}

function listenForPresence() {
  ds.presence.getAll((clients) => {
    users = clients
    updatePresenceRecords('PRESENCE_GETALL')
  })

  ds.presence.subscribe(onPresenceChange)
}

function onPresenceChange(username, isLoggedIn) {
  if (isLoggedIn) {

    users.push(username)

  } else {

    var index = users.indexOf(username);
    if (index > -1) {
      users.splice(index, 1);
    }

  }

  updatePresenceRecords('PRESENCE_LISTING')
}

function updatePresenceRecords(cause) {
  console.log('UPDATE_PRESENCE_RECORDS', cause, users, records)

  records.forEach(recordName => {
    var record = ds.record.getRecord(recordName)
    record.whenReady(record => {
      console.log('RECORD', cause, recordName, record.get())
      for (var key in record.get()) {
        if (record.get().hasOwnProperty(key)) {
          record.set(key + '[online]', (users.indexOf(key) > -1))
        }
      }
      record.discard()
    })
  })
}
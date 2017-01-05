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
    ds.rpc.provide('join-chat', function (data, response) {

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
        updatePresenceRecords('PRESENCE RECORD LISTENING', match, isSubscribed)
    })
}

function listenForPresence() {
    ds.presence.getAll((clients) => {
        users = clients
        updatePresenceRecords('GET ALL USERS')
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

    updatePresenceRecords('PRESENCE UPDATE', username, isLoggedIn)
}

function updatePresenceRecords(...cause) {
    console.log('\x1b[31m', '==========================================================', '\x1b[0m')
    console.log('\x1b[31m', 'UPDATE PRESENCE RECORDS:', '\x1b[0m', ...cause)
    console.log('\x1b[31m', 'Users:', '\x1b[0m', users)
    console.log('\x1b[31m', 'Records:', '\x1b[0m', records)
    console.log('\x1b[31m', '==========================================================', '\x1b[0m')

    records.forEach(recordName => {
        var record = ds.record.getRecord(recordName)
        record.whenReady(record => {
            console.log('\x1b[31m', 'RECORD UPDATE', '\x1b[0m', ...cause, recordName, record.get())
            for (var key in record.get()) {
                if (record.get().hasOwnProperty(key)) {
                    record.set(key + '[online]', (users.indexOf(key) > -1))
                }
            }
            record.discard()
        })
    })
}
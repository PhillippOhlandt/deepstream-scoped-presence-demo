new Vue({
    el: '#app',
    data: {
        ds: null,
        loginUsername: '',
        loginPassword: '',
        loggedIn: false,
        wasLoggedIn: false,
        myData: {},
        presenceRecord: null,
        presenceRecordContent: {},
        joiningChatName: ''
    },
    created: function created() {
        this.ds = deepstream('localhost:6220');
    },
    methods: {
        login: function login() {
            var _this = this;
            this.ds.login({
                username: this.loginUsername,
                password: this.loginPassword
            }, function (success, data) {
                if (success) {
                    _this.loggedIn = true;
                    _this.myData = data;
                    _this.loginUsername = '';
                    _this.loginPassword = '';
                    if (_this.wasLoggedIn) {
                        _this.presenceRecord.unsubscribe();
                        _this.presenceRecordContent = {};
                    }
                    _this.subscribeToPresenceRecord();
                    _this.wasLoggedIn = true;
                } else {
                    alert('get your mess sorted!');
                }
            });
        },
        logout: function logout() {
            this.ds.close();
            this.presenceRecord = null;
            this.presenceRecordContent = {};
            this.ds = deepstream('localhost:6220');
            this.loggedIn = false;
            this.wasLoggedIn = false;
            this.myData = {};
        },
        subscribeToPresenceRecord: function subscribeToPresenceRecord() {
            var _this2 = this;
            console.log('PRESENCE RECORD', 'SUBSCRIBE', 'START');
            this.presenceRecord = this.ds.record.getRecord('presence/' + this.myData.username);
            this.presenceRecord.whenReady(function (record) {
                console.log('PRESENCE RECORD', 'READY', record.get());
                _this2.presenceRecordContent = record.get();
            });
            this.presenceRecord.subscribe(this.presenceRecordChanged);
            console.log('PRESENCE RECORD', 'SUBSCRIBE', 'END');
        },
        presenceRecordChanged: function presenceRecordChanged(record) {
            console.log('PRESENCE RECORD', 'CHANGED', record);
            this.presenceRecordContent = record;
        },
        unsubscribeFromPresenceRecord: function unsubscribeFromPresenceRecord() {
            console.log('PRESENCE RECORD', 'UNSUBSCRIBE', 'START');
            this.presenceRecord.discard();
            console.log('PRESENCE RECORD', 'UNSUBSCRIBE', 'END');
        },
        joinChat: function joinChat(room) {
            this.ds.rpc.make('join-chat', {
                room: room,
                me: this.myData
            }, function (error, result) {
                console.log('JOIN CHAT RPC', 'RESULT', result, error);
            });
        },
        joinOtherChat: function joinOtherChat() {
            this.joinChat(this.joiningChatName);
            this.joiningChatName = '';
        }
    }
});
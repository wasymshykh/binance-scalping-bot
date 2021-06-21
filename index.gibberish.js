const { join } = require('path');
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const { URLSearchParams } = require('url');
const { Low, JSONFile } = require('lowdb');

const {API_KEY, API_SECRET} = require('./config');

const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

const SERVER = "https://testnet.binance.vision/api";
const PAIR = "bnbbusd";
const SOCKET_SERVER = `wss://stream.binance.com:9443/ws/${PAIR}@ticker`;
axios.defaults.headers.common['X-MBX-APIKEY'] = API_KEY;

await db.read()

/*
    -----------------
    HELPING FUNCTIONS
    -----------------
    don't repeat
    -----------------
*/

const rs = (u,s) => {
    return `${SERVER}/${u}&signature=${s}`;
}
const r = (u) => {
    return `${SERVER}/${u}`;
}
const pl = (p) => {
    p['timestamp'] = Date.now();
    let payload = (new URLSearchParams(p)).toString();
    return {payload, signature: crypto.createHmac('sha256', API_SECRET).update(payload).digest("hex")};
}


/*
    ------------------------
    GETTING ACCOUNT BALANCES
    ------------------------
    Description here...
    ------------------------
*/

let { payload, signature } = pl ({recvWindow: 5000});
let balance_url = rs(`v3/account?${payload}`, signature);
axios.get(balance_url).then(response => {
    console.log(response.data);
}).catch(error => {
    console.log('E.3545.', error.response.data);
});

let order_payload = {
    symbol: 'XRPBUSD', side: 'BUY', type: 'LIMIT_MAKER', quantity: 16, price: 0.7, recvWindow: 5000
}

setTimeout(() => {
    let { payload, signature } = pl (order_payload);
    let order_url = rs(`v3/order?${payload}`, signature);
    axios.post(order_url).then(response => {
        console.log(response.data);
    }).catch(error => {
        console.log('E.4552.', error.response.data);
    });
}, 5000);


/*
    ---------------------------------------
    GETTING LISTEN KEY FOR USER DATA SOCKET
    ---------------------------------------
    Description here...
    ---------------------------------------
*/

axios.post(r('v3/userDataStream')).then(response => {
    console.log(response.data);
    let data = JSON.parse(response.data);
    const LISTEN_KEY = data.listenKey;
    
    const SOCKET_SERVER = `wss://stream.binance.com:9443/ws/${LISTEN_KEY}`;
    const ws_listener = new WebSocket(SOCKET_SERVER);
    
    ws_listener.on('message', (data) => {
        if (data) {
            const type = JSON.parse(data);
            console.log(data);
        }
    });

}).catch (error => {
    console.log('E.5125.', error.response.data);
});


/*
    ------------------------
    LISTENING TO DATA SOCKET
    ------------------------
    Description here...
    ------------------------
*/

const ws_ticker = new WebSocket(SOCKET_SERVER);

ws_ticker.on('message', (data) => {
    if (data) {
        const trade = JSON.parse(data);
        console.log(`P: ${trade.c}`);
    }
});

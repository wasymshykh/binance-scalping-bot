const axios = require('axios');
const asciichart = require('../asciichart');
const {RSI} = require('technicalindicators');
const Jetty = require('jetty');

const jetty = new Jetty(process.stdout);

const SERVER = "https://api.binance.com/api";

const r = (u) => {
    return `${SERVER}/${u}`;
}
const p = (p) => {
    let payload = (new URLSearchParams(p)).toString();
    return {payload};
}

const PRECISION = 4; // every pair has some different precision
const LIMIT_OFFSET = { upper: 0, lower: 0 }; // for better numbers on chart y axis label

const PAIR = 'ADABUSD';
const CANDLESTICK_INTERVAL = '1m';
const CANDLESTICK_RESULTS_LIMIT = 60;

const RSI_PERIOD = 14; // default is 14
const CONSOLE_WIDTH = 80;

// last one hour
let { payload } = p ({symbol: PAIR, interval: CANDLESTICK_INTERVAL, limit: CANDLESTICK_RESULTS_LIMIT });
let kline_url = r(`v3/klines?${payload}`);

const handle_error = (error, exit = false) => {
    if (error.response != undefined) console.error('E.3545.',  error.response.data)
    else console.error(error);
    if (exit) process.exit();
}

function to (v, n = PRECISION) {
    return +(Math.round(v+`e+${n}`)+`e-${n}`);
}

const print_chart = (data, config = {}) => {

    if (config.precision == undefined) config.precision = PRECISION;
    
    const c = {
        height: config.height != undefined ? config.height : 30,
        format: function (x, i) { return (' ├ ' + x.toFixed(config.precision)) }
    }

    if (config.max != undefined) c['max'] = config.max;
    if (config.min != undefined) c['min'] = config.min;
    if (config.colors != undefined) c['colors'] = config.colors; else c['colors'] = [asciichart.red];
    if (config.color != undefined) c['colors'] = [config.color];

    if (config.return != undefined) {
        return asciichart.plot(data, c);
    } else {
        console.log(asciichart.plot(data, c));
    }

}

const STATE = { wait: false, last_data_request: null, total_requests: 0, total_requests_sent: 0, total_requests_wait: 0, total_requests_failure: 0 };

const print_chart_headline = (text, first = false, last = false) => {
    let str = ' '+(first ? '┌' : '├')+'─'.repeat(CONSOLE_WIDTH)+'┐\n';
    str += ` ├ ${text} `+'─'.repeat(CONSOLE_WIDTH-text.length-2)+'┤\n';
    str += ' '+(last ? '┌' : '├')+'─'.repeat(CONSOLE_WIDTH)+'┘\n';
    return str;
}

const get_kline_data = () => {

    axios.get(kline_url).then(response => {
        
        const data = [];
        const timeline = [];
        response.data.forEach(candlestick => {
            timeline.push(new Date(candlestick[0]).toLocaleString("en-US", {timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit'}));
            data.push(Number(candlestick[4]));
        });
        let max = to(Math.max(...data) + LIMIT_OFFSET.upper);
        let min = to(Math.min(...data) - LIMIT_OFFSET.lower);
        
        let str = print_chart_headline(PAIR, true);
        str += print_chart(data, {max, min, return: true })+ '\n';
        const rsi_data = RSI.calculate({values: data, period: RSI_PERIOD});
        str += print_chart_headline(`RSI ${CANDLESTICK_INTERVAL}`);
        str += print_chart(rsi_data, {max: 70, min: 30, height: 6, color: asciichart.blue, precision: 0, return: true });

        jetty.moveTo([0,0]);
        jetty.text(str);
        
        STATE.wait = false;

    }).catch(error => {
        STATE.wait = false;
        handle_error(error);
    });

}

// use websocket instead of this rest interval

jetty.reset().clear().moveTo([0,0]);

setInterval(() => {

    STATE.total_requests++;
    
    if (!STATE.wait) {
        STATE.wait = true;
        get_kline_data();
    } else {
        STATE.total_requests_wait++;
    }

}, 1000);

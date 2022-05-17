const { Client, LocalAuth  } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { body, validationResult } = require('express-validator');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const client = new Client({
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-setuid-sandbox'
        ]
    },
    authStrategy: new LocalAuth(
        { clientId: "client-one", dataPath:'./wwebjs_auth' }
    )
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, {small: true});   
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED');
    console.log(session);
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});


client.on('message', message => {
    if(message.body === '!ping') {
        client.sendMessage(message.from, 'pong');
    }else if (message.body === '!buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(message.from, button);
    } else if (message.body === '!list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(message.from, list);
    }
});

client.initialize();


// Send message on message to list of contact
app.post('/send-message-to-group', [
    body('number').notEmpty(),
    body('message').notEmpty(),
  ], async (req, res) => {
    const list_number = req.body.number.split(',')
    const message = req.body.message;
    let result = [];

    for (let i = 0; i < list_number.length; i++) {
        const number = phoneNumberFormatter(list_number[i]);
        console.log( 'send ' + message + ' to ' + number )
        await client.sendMessage(number, message)
        .then(response => {
            result.push({
                status: true,
                deviceType: response['deviceType'],
                timestamp: response['timestamp'],
                from: '',
                to: list_number[i],
                message: message
        
            })
        })
        .catch(err => {
            result.push({
                status: false,
                deviceType: null,
                timestamp: null,
                from: '',
                to: list_number[i],
                message: err
        
            })            
        });
    }
    res.status(200).json(result);    
  });
  
server.listen(port, function() {
    console.log('App running on *: ' + port);
});

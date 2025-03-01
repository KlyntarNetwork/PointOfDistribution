import {returnBlocksDataForPod, returnBlocksRange} from './functions.js'

import {fileURLToPath} from 'url'

import WS from 'websocket'

import level from 'level'

import http from 'http'

import path from 'path'

import fs from 'fs'




let WebSocketServer = WS.server

let WebSocketClient = WS.client


let __filename = fileURLToPath(import.meta.url)

let __dirname = path.dirname(__filename)

let configsPath = path.join(__dirname, 'configs.json')


let CONFIGS = JSON.parse(fs.readFileSync(configsPath, 'utf8'))

let BLOCKS_DATA = level('BLOCKS_DATA')
    
export {CONFIGS, BLOCKS_DATA}




let client = new WebSocketClient({})


// Start API server

let server = http.createServer({},(_,response)=>{

    response.writeHead(404)

    response.end()

})


server.listen(CONFIGS.WEBSOCKET_PORT,CONFIGS.WEBSOCKET_INTERFACE,()=>

    console.log(`[*] Websocket server for point of distribution was activated on ${CONFIGS.WEBSOCKET_INTERFACE}:${CONFIGS.WEBSOCKET_PORT}`)
    
)


let podWebsocketServer = new WebSocketServer({
    
    httpServer: server,

    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,

    maxReceivedMessageSize: 1024*1024*50 // 50 Mb

})




podWebsocketServer.on('request',request=>{

    let connection = request.accept('echo-protocol', request.origin)

    connection.on('message',async message=>{

        if (message.type === 'utf8') {

            let data = JSON.parse(message.utf8Data)

            if(data.route==='get_blocks'){

                returnBlocksRange(data,connection)

            } else if(data.route==='get_blocks_for_pod'){

                returnBlocksDataForPod(data,connection)

            }else if(data.route==='get_mempool'){

                returnBlocksDataForPod(data,connection)

            } else{

                connection.close(1337,'No available route')

            }

        } else connection.close(7331,'Wrong data type')
    
    })
    
    connection.on('close',()=>{})

    connection.on('error',()=>{})

})


// Connect to source server

function connectToSource() {
    client.connect(CONFIGS.SOURCE_URL, 'echo-protocol')
}


client.on('connectFailed', (error) => {

    console.log(`[*] Connection failed: ${error.message}`)
    
    setTimeout(connectToSource, 5000)

})

client.on('connect',connection=>{

    console.log(`[*] Connected to ${CONFIGS.SOURCE_URL}`)




    connection.on('message',async message=>{

        if(message.type === 'utf8'){

            let parsedData = JSON.parse(message.utf8Data)

            if(parsedData.route === 'mempool'){

            } else if(parsedData.route === 'blocks_for_pod'){

                
            }
                                
        }        

    })

    connection.on('close',()=>console.log('Connection closed'))
      
    connection.on('error',()=>console.log('Connection error'))

})


connectToSource()
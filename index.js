import {returnBlocksDataForPod, returnBlocksRange} from './functions.js'

import {fileURLToPath} from 'url'

import fetch from 'node-fetch'

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

let DATABASE = level('DATABASE',{valueEncoding: 'json'})
    
export {CONFIGS, DATABASE}


let HEIGHT_RELATIVE_INDEX = await DATABASE.get('HEIGHT_RELATIVE_INDEX').catch(_=>0)

let AEFP_RELATIVE_INDEX = await DATABASE.get('AEFP_RELATIVE_INDEX').catch(_=>0)


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

    client.connect(CONFIGS.WEBSOCKET_SOURCE_URL, 'echo-protocol')

}


function sendRequestForNewBlocksAndAfps(connection){

    // Send data like this {route:'get_blocks_for_pod', fromRid:'RELATIVE_INDEX'}

    let dataToSend = {
        
        route:'get_blocks_for_pod',
        
        fromRid: HEIGHT_RELATIVE_INDEX
    }

    connection.sendUTF(JSON.stringify(dataToSend))

}


async function sendRequestForNewAefps(connection){

    // Send data AEFP_RELATIVE_INDEX

    let possibleAefp = await fetch()

}


client.on('connectFailed', (error) => {

    console.log(`[*] Connection failed: ${error.message}`)
    
    setTimeout(connectToSource, 5000)

})

client.on('connect',connection=>{

    console.log(`[*] Connected to ${CONFIGS.WEBSOCKET_SOURCE_URL}`)

    console.log(`[*] Going to load blocks from ${HEIGHT_RELATIVE_INDEX}`)

    console.log(`[*] Going to load AEFPs from ${AEFP_RELATIVE_INDEX}`)
    
    sendRequestForNewBlocksAndAfps(connection)

    // sendRequestForNewAefps(connection)

    connection.on('message',async message=>{

        if(message.type === 'utf8'){

            let parsedData = JSON.parse(message.utf8Data) // structure is {'N':{block,afp},'N+1':{block,afp},...}            

            // Just parse, store and increase the RELATIVE_INDEX

            // Set mutex here

            let atomicBatch = DATABASE.batch()

            for(let i = HEIGHT_RELATIVE_INDEX ; i <= HEIGHT_RELATIVE_INDEX + 500 ; i++){

                let data = parsedData[`RID:${i}`]
                
                if(data){

                    if(data.block){

                        let [,epochID] = data.block.epoch.split('#')
    
                        let blockID = `${epochID}:${data.block.creator}:${data.block.index}`
    
                        atomicBatch.put(blockID,data.block)

                        if(data.afpForBlock){    
                        
                            atomicBatch.put('AFP:'+blockID, data.afpForBlock)
            
                        }

                        console.log(`[*] Locally have untill RID: ${HEIGHT_RELATIVE_INDEX} => ${data.block.index}`)

                        HEIGHT_RELATIVE_INDEX++
        
                        atomicBatch.put('RELATIVE_INDEX',HEIGHT_RELATIVE_INDEX)

                    }

                } else break

            }

            await atomicBatch.write()

            setTimeout(()=>sendRequestForNewBlocksAndAfps(connection),1000)
                                
        }        

    })

    connection.on('close',()=>{

        console.log(`[*] Connection closed, try reconnect`)

        setTimeout(connectToSource, 5000)

    })

    connection.on('error',()=>{

        console.log(`[*] Error with connection, try reconnect`)

        setTimeout(connectToSource, 5000)

    })

})


connectToSource()
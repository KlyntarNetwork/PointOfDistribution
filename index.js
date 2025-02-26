import WS from 'websocket'

import level from 'level'

import http from 'http'





let WebSocketServer = WS.server

let server = http.createServer({},(_,response)=>{

    response.writeHead(404)

    response.end()

})


server.listen(CONFIGURATION.WEBSOCKET_PORT,CONFIGURATION.WEBSOCKET_INTERFACE,()=>

    console.log(`[*] Websocket server for point of distribution was activated on ${CONFIGURATION.WEBSOCKET_INTERFACE}:${CONFIGURATION.WEBSOCKET_PORT}`)
    
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

            }else{

                connection.close(1337,'No available route')

            }

        } else connection.close(7331,'Wrong data type')
    
    })
    
    connection.on('close',()=>{})

    connection.on('error',()=>{})

})
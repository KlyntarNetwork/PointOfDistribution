import { BLOCKS_DATA, CONFIGS } from "./index.js"


export let returnBlocksDataForPod = async(data,connection) => {

    // Input data is {fromRid}
    // Output data is {n:{block,afpForBlock},n+1:{block,afpForBlock},...,n+x:{block,afpForBlock}}

    let responseStructure = {}

    
    for(let i=1 ; i<300 ; i++){

        let relativeIndex = data.fromRid+i

        let blockIdByRelativeIndex = await BLOCKS_DATA.get(relativeIndex).catch(()=>null)

        if(blockIdByRelativeIndex){

            let block = await BLOCKS_DATA.get(blockIdByRelativeIndex).catch(()=>null)

            let afpForBlock = await BLOCKS_DATA.get('AFP:'+blockIdByRelativeIndex).catch(()=>null)
    
            responseStructure[relativeIndex] = {block,afpForBlock}
            
        }

        else break

    }

    connection.sendUTF(JSON.stringify(responseStructure))

}



export let returnBlocksRange = async(data,connection) => {

    // We need to send range of blocks from <heightThatUserHave+1> to <heightThatUserHave+499> or less(limit is up to 500 blocks). Also, send the AFP for latest block
    // Also, the response structure is {blocks:[],afpForLatest}

    let responseStructure = {

        blocks:[],

        afpForLatest:{}

    }

    
    for(let i=1;i<50;i++){

        let blockIdToFind = data.epochIndex+':'+CONFIGS.BLOCK_GENERATOR_PUBKEY+':'+(data.hasUntilHeight+i)

        let blockIdToFindAfp = data.epochIndex+':'+CONFIGS.BLOCK_GENERATOR_PUBKEY+':'+(data.hasUntilHeight+i+1)

        let block = await BLOCKS_DATA.get(blockIdToFind).catch(()=>null)

        let afpForBlock = await BLOCKS_DATA.get('AFP:'+blockIdToFindAfp).catch(()=>null)

        if(block && afpForBlock){

            responseStructure.blocks.push(block)

            responseStructure.afpForLatest = afpForBlock

        }else if(block && data.sendWithNoAfp && data.sendWithNoAfp.index === block.index){

            responseStructure.blocks.push(block)

        }else break

    }

    connection.sendUTF(JSON.stringify(responseStructure))

}
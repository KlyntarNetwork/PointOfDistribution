import { DATABASE, CONFIGS } from "./index.js"


export let returnBlocksDataForPod = async(data,connection) => {

    // Input data is {fromHeight}
    // Output data is {n:{block,afpForBlock},n+1:{block,afpForBlock},...,n+x:{block,afpForBlock}}

    let responseStructure = {}

    
    for(let i = 0 ; i < 500 ; i++){

        let relativeHeight = data.fromHeight + i

        let blockIdByRelativeHeight = await DATABASE.get('RID:'+relativeHeight).catch(()=>null)

        if(blockIdByRelativeHeight){

            let block = await DATABASE.get(blockIdByRelativeHeight).catch(()=>null)

            let afpForBlock = await DATABASE.get('AFP:'+blockIdByRelativeHeight).catch(()=>null)
    
            if(block && afpForBlock) {

                responseStructure[`HEIGHT:${relativeHeight}`] = {block, afpForBlock}

            } else break
            
        } else break

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

    
    for(let i = 1 ; i < 500 ; i++){

        let blockIdToFind = data.epochIndex+':'+CONFIGS.SEQUENCER_PUBKEY+':'+(data.hasUntilHeight+i)

        let blockIdToFindAfp = data.epochIndex+':'+CONFIGS.SEQUENCER_PUBKEY+':'+(data.hasUntilHeight+i+1)

        let block = await DATABASE.get(blockIdToFind).catch(()=>null)

        let afpForBlock = await DATABASE.get('AFP:'+blockIdToFindAfp).catch(()=>null)

        if(block && afpForBlock){

            responseStructure.blocks.push(block)

            responseStructure.afpForLatest = afpForBlock

        }else if(block && data.sendWithNoAfp && data.sendWithNoAfp.index === block.index){

            responseStructure.blocks.push(block)

        }else break

    }

    connection.sendUTF(JSON.stringify(responseStructure))

}
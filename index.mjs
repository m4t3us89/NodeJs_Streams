import { createServer } from 'http'
import { Readable, pipeline, Transform } from 'stream'
import { promisify } from 'util'
const pipelineAsync = promisify(pipeline)
import { createReadStream } from 'fs'
 

const commands = new Map([
    ['/csv', createFromLoop],
    ['/file' , createFromFile1gb]
])

function  createFromLoop(){

    const readable =  createReadable(
        function () {
            // 100K interações
            for (let index = 0; index < 1e5; index++) {
                const person = { id: Date.now() + index, name: `Guest-${index}` }
                const data = JSON.stringify(person)
                this.push(data);
            }

            this.push(null) //kill readable
        }
    )

    const transformNamePersonUpper =     createTransform(
        (chunk, enconding, cb) => {
            const data = JSON.parse(chunk)
            const result = `${data.id};${data.name.toUpperCase()}\n`
            cb(null, result)
        }
    )

    const transformAddHeader =   createTransform(
        function (chunk, enconding, cb) {
            this.counter = this.counter ?? 0;

            if (this.counter) {
                return cb(null, chunk)
            }

            this.counter += 1;
            cb(null, "id;name\n".concat(chunk))
        }
    )

    return {
        readable,
        transforms : [transformNamePersonUpper, transformAddHeader]
    }
    
}

function createFromFile1gb(){
    const readable = createReadStream("big.file")
    return {
        readable,
        transforms: []
    }
}

function createReadable(fn){ 
    return Readable({
        read : fn
    })
}

function createTransform(fn){
    return Transform({
        transform : fn
    })
}

createServer(async (req,res)=>{

    const url = req.url

    const command = commands.get(url)

    if(!command){
        res.writeHead(404).write('Url não encontrada.')
        return res.end()
    }

    const  { readable, transforms }  =   await command()

    await pipelineAsync(
        readable,
        ...transforms,
        res
    )

}).listen(3000, ()=>console.log('On Port 3000'))




/*  
    Exemplo sem o uso do pipeline
    createServer((req,res)=>{

    const readStream = createReadStream("big.file")

     // This will wait until we know the readable stream is actually valid before piping
    readStream.on('open', function () {
        // This just pipes the read stream to the response object (which goes to the client)
        readStream.pipe(res);
    });

    readStream.on('data' , function(chunk) {
        console.log('Pedaço' , chunk)
    })

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    readStream.on('error', function(err) {
        res.end(err);
    });

}).listen(3000, ()=>console.log('Server ON'))*/


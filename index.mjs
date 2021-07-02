import { createServer } from 'http'
import { Readable, pipeline, Transform } from 'stream'
import { promisify } from 'util'
const pipelineAsync = promisify(pipeline)
import { createReadStream } from 'fs'
 

const commands = new Map([
    ['/csv', createReadableCSV],
    ['/file' , createReadableFile1gb]
])

function  createReadableCSV(){

    const readable =  createReadable(
        function () {
            // 100K interações
            // for (let index = 0; index < 2; index++)
            for (let index = 0; index < 1e5; index++) {
                const person = { id: Date.now() + index, name: `Erick-${index}` }
                const data = JSON.stringify(person)
                this.push(data);
            }

            this.push(null);

            // this.push(Buffer.from("Hello Dude"));
            // this.push(Buffer.from("Hello Dude2"));
            // this.push(Buffer.from("Hello Dude3"));
            // this.push(null);
        }
    )

    const transform =     createTransform(
        (chunk, enconding, cb) => {
            const data = JSON.parse(chunk)
            const result = `${data.id};${data.name.toUpperCase()}\n`
            cb(null, result)
        }
    )

    const transform2 =   createTransform(
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
        transforms : [transform, transform2]
    }
    
}

function createReadableFile1gb(){
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

    if(!commands.get(url)){
        res.writeHead(404).write('Url não encontrada.')
        return res.end()
    }

    const  { readable, transforms }  =   await commands.get(url)()

    await pipelineAsync(
        readable,
        ...transforms,
        res
    )

}).listen(3000, ()=>console.log('Server ON'))




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


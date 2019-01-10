const port = 8081

const handler = (req, res) => {
    res.writeHead(404)
    res.end()
}

const http = require('http')
const app = http.createServer(handler)
const io = require('socket.io')(app)
const uuid = require('uuid/v4')

const tvs = { };

const tvNamespace = io.of('/tv')
const adminNamespace = io.of('/admin')

tvNamespace.on('connection', socket => {
    socket.on('iamtv', (uid, fn) => {
        uid = uid ? uid : uuid();
        
        tvs[socket.id] = { uid };
        
        // Let the client know what their uid has become
        fn(uid)
    })

    socket.on('display', data => {
        console.log('display event received, should broadcast this')
    })

    setTimeout(() => {
        socket.emit('display', { source: 'https://p.datadoghq.com/sb/18deb0e26-e9b56a91714bafd1fb6e89f008566026?tv_mode=true' })
    }, 3000)
})

tvNamespace.on('disconnect', socket => {
    delete tvs[socket.id]
})

adminNamespace.on('connection', socket => {
    socket.on('list', (data, fn) => {
        console.log('list invoked', data)
        fn(Object.keys(tvs))
    })

    socket.on('display', (data) => {
        const target = tvNamespace.sockets[data.uid];
        console.log('received display event', data)

        if (target) {
            target.emit('display', { source: data.source })
        }
    })
})

app.listen(port)

console.info('started on port', port)

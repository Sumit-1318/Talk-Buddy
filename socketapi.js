const userModel = require('./routes/users')
const io = require("socket.io")();
const msgModel = require('./routes/msg')
const socketapi = {
    io: io
};

// Add your socket.io logic here!
io.on("connection", function (socket) {
    // console.log(socket.id)
    // io.to(socket.id).emit('sony', "hello from server")

    socket.on('join-server', async username => {
        const currentUser = await userModel.findOne({
            username: username
        })

        const onlineUsers = await userModel.find({
            socketId: { $nin: [ "" ] },
            username: { $nin: [ currentUser.username ] }
        })

        onlineUsers.forEach(onlineUser => {
            socket.emit('newUserJoined', {
                img: onlineUser.img,
                username: onlineUser.username,
                lastMessage: "Hello !",
                id: onlineUser._id
            })
        });

        socket.broadcast.emit('newUserJoined', {
            img: currentUser.img,
            username: currentUser.username,
            lastMessage: "Hello !",
            id: currentUser._id
        })

        // const onlineUsers = await userModel.find({
        //     socketId: {
        //         $nin: [ '' ]
        //     },
        //     username: { $nin: [ currentUser.username ] }
        // })

        // onlineUsers.forEach(onlineUser => {
        //     socket.emit('newUserJoined', {
        //         img: onlineUser.img,
        //         username: onlineUser.username,
        //         lastMessage: 'Hello !'
        //     })
        // })




        // socket.broadcast.emit('newUserJoined', {
        //     img: currentUser.img,
        //     username: currentUser.username,
        //     lastMessage: 'Hello !'
        // })

        currentUser.socketId = socket.id
        await currentUser.save()
    })
    socket.on('disconnect', async () => {
        await userModel.findOneAndUpdate({
            socketId: socket.id
        }, {
            socketId: ''
        })
    })

    socket.on('privateMessage', async msgObject => {

        /* 
        {
            msg:"hello hi hello",
            toUser:"b"(ObjectId),
            fromUser:'a'(ObjectId)
        }
         */


        await msgModel.create({
            msg: msgObject.msg,
            toUser: msgObject.toUser,
            fromUser: msgObject.fromUser
        })

        const toUser = await userModel.findById(msgObject.toUser)
        io.to(toUser.socketId).emit('receivePrivateMessage', msgObject.msg)

    })

    socket.on('getMessage', async (msgObject) => {
        console.log(msgObject)
        const allMessages = await msgModel.find({
            $or: [
                {
                    fromUser: msgObject.firstUser/* a */,
                    toUser: msgObject.secondUser/* b */,
                },
                {
                    fromUser: msgObject.secondUser/* b */,
                    toUser: msgObject.firstUser/* a */,
                }
            ]
        })

        socket.emit('chatMessages', allMessages)
    })

    console.log("A user connected");
});



// end of socket.io logic

module.exports = socketapi;
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/miniproject1');

const userSchema = new mongoose.Schema({
    username : String,
    name: String,
    age : Number,
    email: String,
    password: String,
    profilepic:{
        type: String,
        default : './public/images/uploads/default.jpg'
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'post'
        }
    ]
});

const user = mongoose.model('user', userSchema);

module.exports = user;
const express = require('express');
const app =express();


const usermodel = require('./models/user');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const postmodel = require('./models/post');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, function (err, bytes) {
      const fn = bytes.toString('hex') + path.extname(file.originalname);
      cb(null, fn);
    });
  }
});

const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});



app.get('/', (req, res) => {
   res.render('index');
}); 

app.get('/profile', isLoggedIn, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
   
    let posts = await postmodel.find().populate('user').sort({ createdAt: -1 });

    let user = await usermodel.findOne({email: req.user.email});

    res.render('profile', { user: user, posts: posts });  
});

app.get('/like/:postId', isLoggedIn, async (req, res) => {
    let post = await postmodel.findById(req.params.postId).populate('user');

    if( post.likes.indexOf(req.user.userid) === -1) {

    post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect('/profile');

});

app.get('/edit/:postId', isLoggedIn, async (req, res) => {
    let user = await usermodel.findOne({email: req.user.email});
    let post = await postmodel.findById(req.params.postId).populate('user');
    if (!post || post.user._id.toString() !== req.user.userid) {
        return res.redirect('/profile');
    }
    res.render('edit', { post: post, user: user });
});

app.post('/edit/:postId', isLoggedIn, async (req, res) => {
    let post = await postmodel.findById(req.params.postId).populate('user');

    if (!post || post.user._id.toString() !== req.user.userid) {
        return res.redirect('/profile');
    }

    post.content = req.body.content;
    await post.save();
    res.redirect('/profile');
});

app.post('/delete/:postId', isLoggedIn, async (req, res) => {
    let post = await postmodel.findById(req.params.postId).populate('user');
    if (!post || post.user._id.toString() !== req.user.userid) {
        return res.redirect('/profile');
    }

    await postmodel.deleteOne({ _id: req.params.postId });
    res.redirect('/profile');
});

app.post('/register', async (req, res) => {
   const { username, name, age, email, password } = req.body;

  let user = await usermodel.findOne({email});
  if(user) {
    return res.status(400).send('User already exists');
    }

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
          let createduser = await usermodel.create({
                username,
                name,
                age,
                email,
                password: hash
            });

            let token = jwt.sign({email:email,userid:createduser._id,name:name}, "basifasfbabhsjbasf");

            res.cookie('token', token);
            res.redirect('/login');
        });
    });
});

app.get('/login', (req, res) => {
   res.render('login');
});

app.post('/login', async (req, res) => {
   const { email, password } = req.body;

  let user = await usermodel.findOne({email});
  if(!user) {
    return res.status(400).send('User does not exist');
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (err) throw err;
        if (!result) return res.status(400).send('Invalid credentials');

        let token = jwt.sign({email:email,userid:user._id,name:user.name}, "basifasfbabhsjbasf");
        res.cookie('token', token);
        res.redirect('/profile');
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

app.post('/post', isLoggedIn, async (req, res) => {
    let user = await usermodel.findOne({email:req.user.email});
    const { content } = req.body;

   let post = await postmodel.create({
        user: user._id,
        content: content
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect('/profile');
});


app.get('/upload', isLoggedIn, (req, res) => {
    res.render('upload', { user: req.user });
});

app.post('/upload', isLoggedIn, upload.single('image'), async (req, res) => {
    const user = await usermodel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');
});

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login'); // ✅ Redirect to login 
    }
    try {
        let data = jwt.verify(token, "basifasfbabhsjbasf");
        req.user = data;
        next();
    } catch (err) {
        console.log(err);
        return res.redirect('/login'); // ✅ Also handle expired/invalid token
    }
}


app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});